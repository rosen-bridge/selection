import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance, TokenInfo } from '@rosen-bridge/selection-types';

import {
  BuildChangeBoxesParams,
  ChangeAddressInput,
  RegisterValuesInput,
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
    const { inputBoxes, outputBoxes, height, changeAssets, registerValues } =
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

    const fee = this.normalizeFee(params.fee);
    const { native: totalInputNative, tokens: inputTokens } =
      this.aggregateBoxAssets(inputBoxes);
    const { native: totalOutputNative, tokens: outputTokens } =
      this.aggregateCandidateAssets(outputBoxes);

    if (totalOutputNative + fee > totalInputNative) {
      throw new Error(
        `Total output ERG plus fee (${totalOutputNative + fee}) exceeds total input ERG (${totalInputNative})`,
      );
    }

    const changeNative = totalInputNative - totalOutputNative - fee;
    const firstInputBoxId = inputBoxes[0].box_id().to_str();
    const changeTokens = this.calculateChangeTokens(
      inputTokens,
      outputTokens,
      firstInputBoxId,
    );

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
    const registerEntries = this.normalizeRegisterEntries(registerValues);

    return finalChangeAssets.map((assets, index) =>
      this.buildChangeBox(assets, resolvedHeight, registerEntries, index),
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
   * Aggregates native/token assets from the given Ergo boxes.
   * @param boxes selected input boxes
   * @returns aggregated native token total and a token map
   */
  private aggregateBoxAssets = (
    boxes: Array<ergoLib.ErgoBox>,
  ): { native: bigint; tokens: Map<string, bigint> } => {
    let native = 0n;
    const tokens = new Map<string, bigint>();

    boxes.forEach((box) => {
      native += BigInt(box.value().as_i64().to_str());
      const boxTokens = box.tokens();
      for (let i = 0; i < boxTokens.len(); i++) {
        const token = boxTokens.get(i);
        const id = token.id().to_str();
        const amount = BigInt(token.amount().as_i64().to_str());
        tokens.set(id, (tokens.get(id) ?? 0n) + amount);
      }
    });

    return { native, tokens };
  };

  /**
   * Aggregates native/token assets from the provided output candidates.
   * @param candidates desired transaction outputs
   * @returns aggregated native token total and a token map
   */
  private aggregateCandidateAssets = (
    candidates: Array<ergoLib.ErgoBoxCandidate>,
  ): { native: bigint; tokens: Map<string, bigint> } => {
    let native = 0n;
    const tokens = new Map<string, bigint>();

    candidates.forEach((candidate) => {
      native += BigInt(candidate.value().as_i64().to_str());
      const candidateTokens = candidate.tokens();
      for (let i = 0; i < candidateTokens.len(); i++) {
        const token = candidateTokens.get(i);
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
    registerEntries: Array<[number, ergoLib.Constant]>,
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

    registerEntries.forEach(([id, value]) => {
      builder.set_register_value(id, value);
    });

    const minBoxValue = this.calculateMinBoxValue(builder, boxValue);
    if (assets.nativeToken < minBoxValue) {
      throw new Error(
        `Not enough ERG (${assets.nativeToken}) for change box #${index + 1}; minimum required is ${minBoxValue}`,
      );
    }

    return builder.build();
  };

  /**
   * Temporarily adjusts builder value to fetch WASM-calculated minimal box value.
   * @param builder box candidate builder
   * @param originalValue requested box value
   * @returns minimal nanoERG amount to satisfy size requirements
   */
  private calculateMinBoxValue = (
    builder: ergoLib.ErgoBoxCandidateBuilder,
    originalValue: ergoLib.BoxValue,
  ): bigint => {
    const safeValue = ergoLib.BoxValue.SAFE_USER_MIN();
    builder.set_value(safeValue);
    const minValue = BigInt(builder.calc_min_box_value().as_i64().to_str());
    builder.set_value(originalValue);
    return minValue;
  };

  /**
   * Normalizes register entries to tuples and validates register ids.
   * @param registerValues map/object describing R4-R9 contents
   * @returns normalized list of register entries
   */
  private normalizeRegisterEntries = (
    registerValues?: RegisterValuesInput,
  ): Array<[number, ergoLib.Constant]> => {
    if (!registerValues) return [];

    const entries: Array<[number, ergoLib.Constant]> =
      registerValues instanceof Map
        ? Array.from(registerValues.entries())
        : (
            Object.entries(registerValues) as Array<[string, ergoLib.Constant]>
          ).map(([key, value]) => [Number(key), value]);

    return entries.map(([id, value]) => {
      if (!Number.isInteger(id)) {
        throw new Error(`Register id must be an integer, received ${id}`);
      }
      if (
        id < ergoLib.NonMandatoryRegisterId.R4 ||
        id > ergoLib.NonMandatoryRegisterId.R9
      ) {
        throw new Error(`Register id ${id} is out of supported range (R4-R9)`);
      }
      if (!value) {
        throw new Error(`Value for register ${id} is missing`);
      }
      return [id, value];
    });
  };

  /**
   * Normalizes fee input to bigint.
   * @param fee optional numeric, bigint or string fee
   * @returns fee as bigint
   */
  private normalizeFee = (fee?: bigint | number | string): bigint => {
    if (fee === undefined) return 0n;
    if (typeof fee === 'bigint') return fee;
    if (typeof fee === 'number') {
      if (!Number.isFinite(fee) || !Number.isInteger(fee)) {
        throw new Error('Fee must be a finite integer');
      }
      return BigInt(fee);
    }
    return BigInt(fee);
  };

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
