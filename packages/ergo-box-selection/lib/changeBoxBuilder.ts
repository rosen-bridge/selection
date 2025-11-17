import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance, TokenInfo } from '@rosen-bridge/selection-types';

export type ChangeAddressInput = string | (() => string);

export interface ErgoChangeBoxBuilderConfig {
  minChangeBoxValue?: bigint;
}

export interface BuildChangeBoxesParams {
  inputBoxes: Array<ergoLib.ErgoBox>;
  outputBoxes: Array<ergoLib.ErgoBoxCandidate>;
  height?: number;
  fee?: bigint | number | string;
  changeAssets?: Array<AssetBalance>;
  registerValues?:
    | Map<number, ergoLib.Constant>
    | Partial<Record<number, ergoLib.Constant>>;
}

export class ErgoChangeBoxBuilder {
  private readonly changeAddressProvider: () => string;
  private readonly minChangeBoxValue: bigint;

  constructor(
    changeAddress: ChangeAddressInput,
    config?: ErgoChangeBoxBuilderConfig,
  ) {
    if (!changeAddress) {
      throw new Error(
        'Change address (string or generator function) is required',
      );
    }
    this.changeAddressProvider =
      typeof changeAddress === 'function' ? changeAddress : () => changeAddress;
    this.minChangeBoxValue = config?.minChangeBoxValue ?? 100000n;
  }

  /**
   * Builds change boxes for the provided input and output boxes
   * @param params build parameters
   * @returns list of ErgoBoxCandidates representing the change boxes
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
    const changeTokens = this.calculateChangeTokens(inputTokens, outputTokens);

    if (changeNative === 0n && changeTokens.size === 0) {
      return [];
    }

    if (changeTokens.size > 0 && changeNative <= 0n) {
      throw new Error(
        'Remaining tokens require a change box but no ERG is left after accounting for outputs and fee',
      );
    }

    const changeAssetGroups = this.prepareChangeAssetGroups(
      changeNative,
      changeTokens,
      changeAssets,
    );
    const registerEntries = this.normalizeRegisterEntries(registerValues);

    return changeAssetGroups.map((assets, index) =>
      this.buildChangeBox(assets, resolvedHeight, registerEntries, index),
    );
  };

  /**
   * Derives creation height from provided output candidates
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
   * Aggregates assets from Ergo boxes
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
   * Aggregates assets from Ergo box candidates
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
   * Calculates change tokens by subtracting output tokens from input tokens
   */
  private calculateChangeTokens = (
    inputTokens: Map<string, bigint>,
    outputTokens: Map<string, bigint>,
  ): Map<string, bigint> => {
    const changeTokens = new Map(inputTokens);

    outputTokens.forEach((amount, id) => {
      if (!changeTokens.has(id)) {
        // Minted tokens are not part of change calculation
        return;
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
   * Prepares change asset groups either from provided assets (e.g. selection output)
   * or by creating a default single change box
   */
  private prepareChangeAssetGroups = (
    changeNative: bigint,
    changeTokens: Map<string, bigint>,
    providedAssets?: Array<AssetBalance>,
  ): Array<AssetBalance> => {
    if (!providedAssets || providedAssets.length === 0) {
      return this.buildDefaultChangeAssets(changeNative, changeTokens);
    }

    const normalizedAssets = providedAssets.map((assets) => ({
      nativeToken: assets.nativeToken,
      tokens: assets.tokens.map((token) => ({ ...token })),
    }));

    this.validateChangeAssetGroups(
      changeNative,
      changeTokens,
      normalizedAssets,
    );
    return normalizedAssets;
  };

  /**
   * Builds a default change asset group if no asset distribution is provided
   */
  private buildDefaultChangeAssets = (
    changeNative: bigint,
    changeTokens: Map<string, bigint>,
  ): Array<AssetBalance> => {
    if (changeNative === 0n && changeTokens.size === 0) {
      return [];
    }

    if (changeTokens.size > 0 && changeNative < this.minChangeBoxValue) {
      throw new Error(
        `Not enough ERG (${changeNative}) to create a change box containing tokens; minimum required is ${this.minChangeBoxValue}`,
      );
    }

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
   * Validates that provided change assets align with calculated change
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
   * Builds an Ergo change box based on the provided assets
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
    if (
      assets.tokens.length > 0 &&
      assets.nativeToken < this.minChangeBoxValue
    ) {
      throw new Error(
        `Not enough ERG (${assets.nativeToken}) to hold tokens in change box #${index + 1}; minimum required is ${this.minChangeBoxValue}`,
      );
    }
    if (assets.tokens.length > 0 && assets.nativeToken === 0n) {
      throw new Error(
        `Tokens detected without ERG in change box #${index + 1}`,
      );
    }
    if (assets.nativeToken === 0n && assets.tokens.length === 0) {
      throw new Error(`Change box #${index + 1} has no assets assigned`);
    }

    const address = this.resolveAddress(this.changeAddressProvider());
    const builder = new ergoLib.ErgoBoxCandidateBuilder(
      ergoLib.BoxValue.from_i64(
        ergoLib.I64.from_str(assets.nativeToken.toString()),
      ),
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

    return builder.build();
  };

  /**
   * Normalizes register entries to an array of tuples and validates IDs
   */
  private normalizeRegisterEntries = (
    registerValues?:
      | Map<number, ergoLib.Constant>
      | Partial<Record<number, ergoLib.Constant>>,
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
   * Normalizes fee input to bigint
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
   * Resolves change address string to an Ergo address instance
   */
  private resolveAddress = (address: string): ergoLib.Address => {
    try {
      return ergoLib.Address.from_base58(address);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown address error';
      throw new Error(`Invalid change address provided: ${message}`);
    }
  };
}
