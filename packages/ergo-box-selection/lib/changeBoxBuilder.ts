import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance, TokenInfo } from '@rosen-bridge/selection-types';

import {
  BuildChangeBoxesParams,
  BuildChangeBoxesFromBoxesParams,
  BuildChangeBoxesFromChangeAssetsParams,
  ChangeAddressInput,
  RegisterValues,
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
   * Creates a builder for the computed pathway (input/output mode).
   * @param changeAddress change address (string or generator function)
   */
  static fromBoxes = (changeAddress: ChangeAddressInput) => {
    const builder = new ErgoChangeBoxBuilder(changeAddress);
    return {
      build: (params: BuildChangeBoxesFromBoxesParams) => builder.build(params),
    };
  };

  /**
   * Creates a builder for the explicit pathway (changeAssets mode).
   * @param changeAddress change address (string or generator function)
   */
  static fromChangeAssets = (changeAddress: ChangeAddressInput) => {
    const builder = new ErgoChangeBoxBuilder(changeAddress);
    return {
      build: (params: BuildChangeBoxesFromChangeAssetsParams) =>
        builder.build(params),
    };
  };

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

    if (!Number.isInteger(height) || height <= 0) {
      throw new Error('Height must be a positive integer');
    }

    if (changeAssets) {
      if (burnTokens) {
        throw new Error(
          'burnTokens can only be used when changeAssets is not provided',
        );
      }
      return changeAssets.map((assets, index) =>
        this.buildChangeBox(assets, height, registerValues ?? [], index),
      );
    }

    if (!inputBoxes?.length) {
      throw new Error(
        'At least one input box is required to build change boxes',
      );
    }
    if (!outputBoxes?.length) {
      throw new Error(
        'At least one output box candidate is required to build change boxes',
      );
    }

    const fee = params.fee ?? 0n;
    const { nativeToken: totalInputNative, tokens: inputTokens } =
      this.aggregateAssets(inputBoxes);
    const { nativeToken: totalOutputNative, tokens: outputTokens } =
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

    if (changeNative === 0n && changeTokens.length === 0) {
      return [];
    }

    if (changeTokens.length > 0 && changeNative <= 0n) {
      const changeTokenIds = changeTokens.map((token) => token.id).join(', ');
      throw new Error(
        `Remaining tokens [${changeTokenIds}] require a change box but no ERG is left after accounting for outputs and fee`,
      );
    }

    const finalChangeAssets = this.buildDefaultChangeAssets(
      changeNative,
      changeTokens,
    );

    return finalChangeAssets.map((assets, index) =>
      this.buildChangeBox(assets, height, registerValues ?? [], index),
    );
  };

  /**
   * Aggregates native/token assets from a list of ergo boxes or candidates.
   * @param items input boxes or output candidates
   * @returns aggregated native token total and a token map
   */
  private aggregateAssets = (
    items: Array<ergoLib.ErgoBox | ergoLib.ErgoBoxCandidate>,
  ): AssetBalance => {
    let nativeToken = 0n;
    const tokenMap = new Map<string, bigint>();

    items.forEach((item) => {
      nativeToken += BigInt(item.value().as_i64().to_str());
      const itemTokens = item.tokens();
      for (let i = 0; i < itemTokens.len(); i++) {
        const token = itemTokens.get(i);
        const id = token.id().to_str();
        const amount = BigInt(token.amount().as_i64().to_str());
        tokenMap.set(id, (tokenMap.get(id) ?? 0n) + amount);
      }
    });

    return {
      nativeToken,
      tokens: this.fromTokenMap(tokenMap),
    };
  };

  /**
   * Calculates remaining tokens after satisfying outputs while honoring minted tokens.
   * @param inputTokens assets gathered from input boxes
   * @param outputTokens assets consumed by planned outputs
   * @param mintedTokenId optional token id minted in this transaction (first input id)
   * @returns tokens that should be returned as change
   */
  private calculateChangeTokens = (
    inputTokens: Array<TokenInfo>,
    outputTokens: Array<TokenInfo>,
    mintedTokenId?: string,
  ): Array<TokenInfo> => {
    const changeTokens = this.toTokenMap(inputTokens);
    const outputTokenMap = this.toTokenMap(outputTokens);

    outputTokenMap.forEach((amount, id) => {
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

    return this.fromTokenMap(changeTokens);
  };

  /**
   * Applies token burns by reducing the computed token change amounts.
   * @param changeTokens computed token change amounts
   * @param burnTokens token id to burn amount map
   * @returns updated change token map
   */
  private applyBurnTokens = (
    changeTokens: Array<TokenInfo>,
    burnTokens?: Array<TokenInfo>,
  ): Array<TokenInfo> => {
    if (!burnTokens) return changeTokens;
    const updated = this.toTokenMap(changeTokens);
    const burnTokenMap = this.toTokenMap(burnTokens);

    burnTokenMap.forEach((burnAmount, id) => {
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

    return this.fromTokenMap(updated);
  };

  /**
   * Builds the default single change asset group when caller does not pass one.
   * @param changeNative remaining native token amount
   * @param changeTokens remaining tokens
   * @returns list containing a single asset balance (or empty when nothing to return)
   */
  private buildDefaultChangeAssets = (
    changeNative: bigint,
    changeTokens: Array<TokenInfo>,
  ): Array<AssetBalance> => {
    if (changeNative === 0n && changeTokens.length === 0) {
      return [];
    }

    // minChangeBoxValue will be validated when building the actual box

    if (changeNative <= 0n && changeTokens.length > 0) {
      throw new Error(
        'Change tokens detected but no ERG available to hold them in a change box',
      );
    }

    if (changeNative <= 0n) {
      return [];
    }

    return [
      {
        nativeToken: changeNative,
        tokens: changeTokens,
      },
    ];
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

  private toTokenMap = (tokens: Array<TokenInfo>): Map<string, bigint> => {
    const map = new Map<string, bigint>();
    tokens.forEach((token) => {
      map.set(token.id, (map.get(token.id) ?? 0n) + token.value);
    });

    return map;
  };

  private fromTokenMap = (map: Map<string, bigint>): Array<TokenInfo> =>
    Array.from(map.entries()).map(([id, value]) => ({ id, value }));
}
