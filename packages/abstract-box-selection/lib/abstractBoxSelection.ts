import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AssetBalance,
  BoxInfo,
  CoveringBoxes,
  FeeEstimator,
  FilterFunction,
} from './types';

export abstract class AbstractBoxSelection<BoxType> {
  protected readonly DEFAULT_MIN_BOX_VALUE: bigint = 0n;
  protected readonly DEFAULT_MAX_TOKEN_COUNT: number = 99999;
  protected readonly DEFAULT_FEE_ESTIMATOR: FeeEstimator<BoxType> = () => 0n;
  readonly logger: AbstractLogger;

  constructor(logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  abstract getBoxInfo: (box: BoxType) => BoxInfo;

  /**
   * gets useful, allowable and last boxes for an address until required assets are satisfied
   * - Note: `maxTokenCount` cannot be zero
   * - Note: the estimated fee is NOT reduced from `additionalAssets`
   * @param requiredAssets the required assets
   * @param forbiddenBoxIds the id of forbidden boxes
   * @param trackMap the mapping of a box id to it's next box
   * @param boxIterator the iterator to get boxes
   * @param minBoxValue the minimum amount of native token that should be in a box
   * @param maxTokenCount the maximum number of tokens that can be in a box
   * @param estimateFee a function to estimate the fee of the transaction based on selected boxes and suggested output count
   * @param filterFunction a function to that specifies if the box is allowed
   * @returns an object containing the selected boxes, a boolean showing if requirements
   *  are covered or not and additionalAssets as aggregated and distributed into list based on `maxTokenCount`
   */
  getCoveringBoxes = async (
    requiredAssets: AssetBalance,
    forbiddenBoxIds: Array<string>,
    trackMap: Map<string, BoxType | undefined>,
    boxIterator:
      | AsyncIterator<BoxType, undefined>
      | Iterator<BoxType, undefined>,
    minBoxValue = this.DEFAULT_MIN_BOX_VALUE,
    maxTokenCount = this.DEFAULT_MAX_TOKEN_COUNT,
    estimateFee = this.DEFAULT_FEE_ESTIMATOR,
    filterFunction?: FilterFunction<BoxType>,
  ): Promise<CoveringBoxes<BoxType>> => {
    if (maxTokenCount === 0) throw new Error(`maxTokenCount cannot be zero!`);
    let uncoveredNativeToken = requiredAssets.nativeToken;
    const uncoveredTokens = requiredAssets.tokens.filter(
      (info) => info.value > 0n,
    );
    const additionalAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    const selectedBoxIds: Array<string> = [];
    const result: Array<BoxType> = [];

    /**
     * checks if native token sufficient to cover the requirements
     * - uncovered native token
     * - required min box value for change boxes
     * - fee of the transaction
     * @returns true if native token is required to cover the remaining requirements
     */
    const isNativeTokenRequired = () => {
      const requiredNative =
        uncoveredNativeToken > 0n ? uncoveredNativeToken : 0n;
      const changeLength = additionalAssets.tokens.length
        ? Math.ceil(additionalAssets.tokens.length / maxTokenCount)
        : additionalAssets.nativeToken > 0n
          ? 1
          : 0;
      const additionalRequired = BigInt(changeLength) * minBoxValue;
      const fee = estimateFee(result, changeLength);

      return (
        requiredNative + additionalRequired + fee > additionalAssets.nativeToken
      );
    };
    const isRequirementRemaining = () =>
      uncoveredTokens.length > 0 || isNativeTokenRequired();

    // get boxes until requirements are satisfied
    while (isRequirementRemaining()) {
      const iteratorResponse = await boxIterator.next();

      // end process if there are no more boxes
      if (iteratorResponse.done) break;
      const box = iteratorResponse.value;

      let trackedBox: BoxType | undefined = box;
      let boxInfo = this.getBoxInfo(box);
      this.logger.debug(`processing box [${boxInfo.id}] for covering`);

      // track boxes
      let skipBox = false;
      while (trackMap.has(boxInfo.id)) {
        trackedBox = trackMap.get(boxInfo.id);
        if (!trackedBox) {
          this.logger.debug(`box [${boxInfo.id}] is tracked to nothing`);
          skipBox = true;
          break;
        }
        const previousBoxId = boxInfo.id;
        boxInfo = this.getBoxInfo(trackedBox);
        this.logger.debug(
          `box [${previousBoxId}] is tracked to box [${boxInfo.id}]`,
        );
      }

      // if tracked to no box or forbidden box, skip it
      if (
        skipBox ||
        forbiddenBoxIds.includes(boxInfo.id) ||
        selectedBoxIds.includes(boxInfo.id) ||
        (filterFunction && !filterFunction(trackedBox!))
      ) {
        this.logger.debug(`box [${boxInfo.id}] is skipped`);
        continue;
      }

      // check and add if box assets are useful to requirements
      if (
        isNativeTokenRequired() ||
        boxInfo.assets.tokens.some((boxToken) =>
          uncoveredTokens.find(
            (requiredToken) => requiredToken.id === boxToken.id,
          ),
        )
      ) {
        this.logger.debug(`box [${boxInfo.id}] is selected`);
        // calculate native token change
        if (uncoveredNativeToken > boxInfo.assets.nativeToken) {
          uncoveredNativeToken -= boxInfo.assets.nativeToken;
        } else {
          additionalAssets.nativeToken +=
            boxInfo.assets.nativeToken - uncoveredNativeToken;
          uncoveredNativeToken = 0n;
        }
        // calculate token changes
        boxInfo.assets.tokens.forEach((boxToken) => {
          const tokenIndex = uncoveredTokens.findIndex(
            (requiredToken) => requiredToken.id === boxToken.id,
          );
          if (tokenIndex !== -1) {
            const requiredToken = uncoveredTokens[tokenIndex];
            if (requiredToken.value > boxToken.value) {
              requiredToken.value -= boxToken.value;
            } else if (requiredToken.value === boxToken.value) {
              uncoveredTokens.splice(tokenIndex, 1);
            } else {
              additionalAssets.tokens.push({
                id: boxToken.id,
                value: boxToken.value - requiredToken.value,
              });
              uncoveredTokens.splice(tokenIndex, 1);
            }
          } else {
            const additionalTokenIndex = additionalAssets.tokens.findIndex(
              (token) => token.id === boxToken.id,
            );
            if (additionalTokenIndex !== -1)
              additionalAssets.tokens[additionalTokenIndex].value +=
                boxToken.value;
            else additionalAssets.tokens.push(structuredClone(boxToken));
          }
        });

        result.push(trackedBox!);
        selectedBoxIds.push(boxInfo.id);
      } else {
        this.logger.debug(`box [${boxInfo.id}] is ignored`);
      }

      // end process if requirements are satisfied
      if (!isRequirementRemaining()) {
        this.logger.debug(`requirements satisfied`);
        break;
      }
    }
    const covered = !isRequirementRemaining();

    // subtract estimated fee from additional assets
    const changeLength = additionalAssets.tokens.length
      ? Math.ceil(additionalAssets.tokens.length / maxTokenCount)
      : additionalAssets.nativeToken > 0n
        ? 1
        : 0;
    const fee = estimateFee(result, changeLength);
    additionalAssets.nativeToken -= fee;

    const separatedAssets: Array<AssetBalance> = [];
    for (let i = 0; i < changeLength; i++) {
      separatedAssets.push({
        nativeToken: additionalAssets.nativeToken / BigInt(changeLength),
        tokens: structuredClone(
          additionalAssets.tokens.slice(
            i * maxTokenCount,
            (i + 1) * maxTokenCount,
          ),
        ),
      });
    }
    if (separatedAssets.length)
      separatedAssets[0].nativeToken +=
        additionalAssets.nativeToken -
        (additionalAssets.nativeToken / BigInt(changeLength)) *
          BigInt(changeLength);

    return {
      covered: covered,
      boxes: result,
      additionalAssets: {
        aggregated: additionalAssets,
        list: separatedAssets,
        fee: fee,
      },
    };
  };
}
