import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BoxInfo, CoveringBoxes } from './types';

export abstract class AbstractBoxSelection<BoxType> {
  logger: AbstractLogger;

  constructor(logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  protected abstract getBoxInfo: (box: BoxType) => BoxInfo;

  /**
   * gets useful, allowable and last boxes for an address until required assets are satisfied
   * @param requiredAssets the required assets
   * @param forbiddenBoxIds the id of forbidden boxes
   * @param trackMap the mapping of a box id to it's next box
   * @param boxIterator the iterator to get boxes
   * @returns an object containing the selected boxes with a boolean showing if requirements are covered or not
   */
  protected getCoveringBoxes = async (
    requiredAssets: AssetBalance,
    forbiddenBoxIds: Array<string>,
    trackMap: Map<string, BoxType | undefined>,
    boxIterator:
      | AsyncIterator<BoxType, undefined>
      | Iterator<BoxType, undefined>,
  ): Promise<CoveringBoxes<BoxType>> => {
    let uncoveredNativeToken = requiredAssets.nativeToken;
    const uncoveredTokens = requiredAssets.tokens.filter(
      (info) => info.value > 0n,
    );
    const selectedBoxIds: Array<string> = [];
    const result: Array<BoxType> = [];

    const isRequirementRemaining = () => {
      return uncoveredTokens.length > 0 || uncoveredNativeToken > 0n;
    };

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
        selectedBoxIds.includes(boxInfo.id)
      ) {
        this.logger.debug(`box [${boxInfo.id}] is skipped`);
        continue;
      }

      // check and add if box assets are useful to requirements
      let isUseful = false;
      boxInfo.assets.tokens.forEach((boxToken) => {
        const tokenIndex = uncoveredTokens.findIndex(
          (requiredToken) => requiredToken.id === boxToken.id,
        );
        if (tokenIndex !== -1) {
          isUseful = true;
          const token = uncoveredTokens[tokenIndex];
          if (token.value > boxToken.value) token.value -= boxToken.value;
          else uncoveredTokens.splice(tokenIndex, 1);
          this.logger.debug(
            `box [${boxInfo.id}] is selected due to need of token [${token.id}]`,
          );
        }
      });
      if (isUseful || uncoveredNativeToken > 0n) {
        uncoveredNativeToken -=
          uncoveredNativeToken >= boxInfo.assets.nativeToken
            ? boxInfo.assets.nativeToken
            : uncoveredNativeToken;
        result.push(trackedBox!);
        selectedBoxIds.push(boxInfo.id);
        this.logger.debug(`box [${boxInfo.id}] is selected`);
      } else this.logger.debug(`box [${boxInfo.id}] is ignored`);

      // end process if requirements are satisfied
      if (!isRequirementRemaining()) {
        this.logger.debug(`requirements satisfied`);
        break;
      }
    }

    return {
      covered: !isRequirementRemaining(),
      boxes: result,
    };
  };
}
