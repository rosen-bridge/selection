import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance, TokenInfo } from '@rosen-bridge/selection-types';

import {
  AggregatedAssets,
  BuildChangeBoxesParams,
  ChangeAddressInput,
  RegisterValues,
  TokenAmountMap,
} from './types';

export class ErgoChangeBoxBuilder {
  private readonly changeAddressProvider: () => string;

  constructor(changeAddress: ChangeAddressInput) {
    if (!changeAddress) {
      throw new Error(
        'Change address (string or generator function) is required',
      );
    }
    this.changeAddressProvider =
      typeof changeAddress === 'function' ? changeAddress : () => changeAddress;
  }

  /**
   * Builds change boxes for the provided transaction context.
   * @param params configuration including inputs, outputs, fee, registers and optional change assets
   * @returns list of ErgoBox candidates representing the change boxes
   */
  build = (params: BuildChangeBoxesParams): Array<ergoLib.ErgoBoxCandidate> => {
    const {
      inputBoxes,
      outputBoxes,
      height,
      changeAssets,
      registerValues,
      burnTokens,
    } = params;
    params;

    if (!inputBoxes.length) {
      throw new Error(
        'At least one input box is required to build change boxes',
      );
    }
    if (!outputBoxes.length) {
      throw new Error(
        'At least one output box candidate is required to build change boxes',
      );
    }
    const resolvedHeight = height ?? this.deriveHeightFromOutputs(outputBoxes);
    if (!Number.isInteger(resolvedHeight) || resolvedHeight <= 0) {
      throw new Error('Height must be a positive integer');
    }

    const fee = params.fee ?? 0n;
    const { native: totalInputNative, tokens: inputTokens } =
      this.aggregateAssets(inputBoxes);
    const { native: totalOutputNative, tokens: outputTokens } =
      this.aggregateAssets(outputBoxes);

    if (totalOutputNative + fee > totalInputNative) {
      throw new Error(
        `Total output ERG plus fee (${totalOutputNative + fee}) exceeds total input ERG (${totalInputNative})`,
      );
    }

    const changeNative = totalInputNative - totalOutputNative - fee;
    const firstInputBoxId = inputBoxes[0].box_id().to_str();
    let changeTokens = this.calculateChangeTokens(
      inputTokens,
      outputTokens,
      firstInputBoxId,
    );
    changeTokens = this.applyBurnTokens(changeTokens, burnTokens);

    if (changeNative === 0n && changeTokens.size === 0) {
      return [];
    }

    if (changeTokens.size > 0 && changeNative <= 0n) {
      throw new Error(
        `Remaining tokens ${changeTokens.toString()} require a change box but no ERG is left after accounting for outputs and fee`,
      );
    }

    const finalChangeAssets = this.prepareChangeAssetGroups(
      changeNative,
      changeTokens,
      changeAssets,
    );

    return finalChangeAssets.map((assets, index) =>
      this.buildChangeBox(assets, resolvedHeight, registerValues ?? [], index),
    );
  };

  /**
   * Derives the box creation height from output candidates when height is not provided.
   * @param outputBoxes transaction outputs
   * @returns maximum creation height across outputs
   */
  private deriveHeightFromOutputs = (
    outputBoxes: Array<ergoLib.ErgoBoxCandidate>,
  ): number => {
    let maxHeight = 0;
    outputBoxes.forEach((candidate) => {
      const candidateHeight = candidate.creation_height();
      if (candidateHeight > maxHeight) maxHeight = candidateHeight;
    });

    if (maxHeight <= 0) {
      throw new Error('Unable to determine height from output box candidates');
    }

    return maxHeight;
  };

  /**
   * Aggregates native/token assets from a list of ergo boxes or candidates.
   * @param items input boxes or output candidates
   * @returns aggregated native token total and a token map
   */
  private aggregateAssets = (
    items: Array<ergoLib.ErgoBox | ergoLib.ErgoBoxCandidate>,
  ): AggregatedAssets => {
    let native = 0n;
    const tokens = new Map<string, bigint>();

    items.forEach((item) => {
      native += BigInt(item.value().as_i64().to_str());
      const itemTokens = item.tokens();
      for (let i = 0; i < itemTokens.len(); i++) {
        const token = itemTokens.get(i);
        const id = token.id().to_str();
        const amount = BigInt(token.amount().as_i64().to_str());
        tokens.set(id, (tokens.get(id) ?? 0n) + amount);
      }
    });

    return { native, tokens };
  };

  /**
   * Calculates remaining tokens after satisfying outputs while honoring minted tokens.
   * @param inputTokens assets gathered from input boxes
   * @param outputTokens assets consumed by planned outputs
   * @param mintedTokenId optional token id minted in this transaction (first input id)
   * @returns tokens that should be returned as change
   */
  private calculateChangeTokens = (
    inputTokens: Map<string, bigint>,
    outputTokens: Map<string, bigint>,
    mintedTokenId?: string,
  ): Map<string, bigint> => {
    const changeTokens = new Map(inputTokens);

    outputTokens.forEach((amount, id) => {
      if (!changeTokens.has(id)) {
        if (mintedTokenId && id === mintedTokenId) {
          return;
        }
        throw new Error(
          `Token [${id}] exists in outputs but not in inputs and is not minted in this transaction`,
        );
      }
      const remaining = (changeTokens.get(id) ?? 0n) - amount;
      if (remaining < 0n) {
        throw new Error(
          `Output tokens for id [${id}] exceed available input tokens`,
        );
      } else if (remaining === 0n) {
        changeTokens.delete(id);
      } else {
        changeTokens.set(id, remaining);
      }
    });

    return changeTokens;
  };

  /**
   * Applies token burns by reducing the computed token change amounts.
   * @param changeTokens computed token change amounts
   * @param burnTokens token id to burn amount map
   * @returns updated change token map
   */
  private applyBurnTokens = (
    changeTokens: Map<string, bigint>,
    burnTokens?: TokenAmountMap,
  ): Map<string, bigint> => {
    if (!burnTokens) return changeTokens;
    const updated = new Map(changeTokens);

    burnTokens.forEach((burnAmount, id) => {
      const available = updated.get(id) ?? 0n;
      const remaining = available - burnAmount;
      if (remaining < 0n) {
        throw new Error(
          `Burn amount for token [${id}] exceeds remaining change tokens`,
        );
      }
      if (remaining === 0n) updated.delete(id);
      else updated.set(id, remaining);
    });

    return updated;
  };

  /**
   * Determines the final change asset groups to build boxes from.
   * @param changeNative remaining native token amount
   * @param changeTokens remaining tokens
   * @param providedAssets optional explicit change distribution
   * @returns array of change asset balances
   */
  private prepareChangeAssetGroups = (
    changeNative: bigint,
    changeTokens: Map<string, bigint>,
    providedAssets?: Array<AssetBalance>,
  ): Array<AssetBalance> => {
    if (!providedAssets || providedAssets.length === 0) {
      return this.buildDefaultChangeAssets(changeNative, changeTokens);
    }

    this.validateChangeAssetGroups(changeNative, changeTokens, providedAssets);
    return providedAssets;
  };

  /**
   * Builds the default single change asset group when caller does not pass one.
   * @param changeNative remaining native token amount
   * @param changeTokens remaining tokens
   * @returns list containing a single asset balance (or empty when nothing to return)
   */
  private buildDefaultChangeAssets = (
    changeNative: bigint,
    changeTokens: Map<string, bigint>,
  ): Array<AssetBalance> => {
    if (changeNative === 0n && changeTokens.size === 0) {
      return [];
    }

    // minChangeBoxValue will be validated when building the actual box

    if (changeNative <= 0n && changeTokens.size > 0) {
      throw new Error(
        'Change tokens detected but no ERG available to hold them in a change box',
      );
    }

    if (changeNative <= 0n) {
      return [];
    }

    const tokens: Array<TokenInfo> = Array.from(changeTokens.entries()).map(
      ([id, value]) => ({
        id,
        value,
      }),
    );

    return [
      {
        nativeToken: changeNative,
        tokens,
      },
    ];
  };

  /**
   * Validates that provided change assets align with computed surplus.
   * @param changeNative remaining native token amount
   * @param changeTokens remaining tokens
   * @param groups caller-provided change asset groups
   */
  private validateChangeAssetGroups = (
    changeNative: bigint,
    changeTokens: Map<string, bigint>,
    groups: Array<AssetBalance>,
  ) => {
    let aggregatedNative = 0n;
    const remainingTokens = new Map(changeTokens);

    groups.forEach((group, index) => {
      if (group.nativeToken < 0n) {
        throw new Error(
          `Negative ERG amount specified for change box #${index + 1}`,
        );
      }
      aggregatedNative += group.nativeToken;

      group.tokens.forEach((token) => {
        const available = remainingTokens.get(token.id) ?? 0n;
        const newAmount = available - token.value;
        if (newAmount < 0n) {
          throw new Error(
            `Provided change tokens exceed available amount for token [${token.id}]`,
          );
        } else if (newAmount === 0n) {
          remainingTokens.delete(token.id);
        } else {
          remainingTokens.set(token.id, newAmount);
        }
      });
    });

    if (aggregatedNative !== changeNative) {
      throw new Error(
        `Sum of provided change ERG (${aggregatedNative}) does not match calculated change (${changeNative})`,
      );
    }
    if (remainingTokens.size > 0) {
      const missingTokens = Array.from(remainingTokens.entries())
        .filter(([, amount]) => amount > 0n)
        .map(([id]) => id)
        .join(', ');
      if (missingTokens.length > 0) {
        throw new Error(
          `Provided change assets do not cover remaining tokens: ${missingTokens}`,
        );
      }
    }
  };

  /**
   * Builds an Ergo change box candidate for a specific asset group.
   * @param assets asset balance assigned to the change box
   * @param height creation height
   * @param registerEntries shared register values
   * @param index 0-based index used for error messages
   * @returns constructed ErgoBoxCandidate
   */
  private buildChangeBox = (
    assets: AssetBalance,
    height: number,
    registerValues: RegisterValues,
    index: number,
  ): ergoLib.ErgoBoxCandidate => {
    if (assets.tokens.some((token) => token.value <= 0n)) {
      throw new Error(
        `Token amounts must be positive for change box #${index + 1}`,
      );
    }
    if (assets.nativeToken < 0n) {
      throw new Error(
        `Negative ERG amount detected for change box #${index + 1}`,
      );
    }
    if (assets.nativeToken === 0n && assets.tokens.length === 0) {
      throw new Error(`Change box #${index + 1} has no assets assigned`);
    }

    const address = this.resolveAddress(this.changeAddressProvider());
    const boxValue = ergoLib.BoxValue.from_i64(
      ergoLib.I64.from_str(assets.nativeToken.toString()),
    );
    const builder = new ergoLib.ErgoBoxCandidateBuilder(
      boxValue,
      ergoLib.Contract.pay_to_address(address),
      height,
    );

    assets.tokens.forEach((token) => {
      builder.add_token(
        ergoLib.TokenId.from_str(token.id),
        ergoLib.TokenAmount.from_i64(
          ergoLib.I64.from_str(token.value.toString()),
        ),
      );
    });

    registerValues.forEach((value, i) => {
      builder.set_register_value(ergoLib.NonMandatoryRegisterId.R4 + i, value);
    });

    try {
      builder.calc_min_box_value();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'box value below minimum';
      throw new Error(
        `Not enough ERG (${assets.nativeToken}) for change box #${index + 1}; ${message}`,
      );
    }

    return builder.build();
  };

  /**

  /**
   * Resolves change address string to an Ergo address instance.
   * @param address base58 change address
   * @returns ergo-lib address instance
   */
  private resolveAddress = (address: string): ergoLib.Address => {
    try {
      return ergoLib.Address.from_base58(address);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown address error';
      throw new Error(
        `Invalid change address provided for address [${address}]: ${message}`,
      );
    }
  };
}
