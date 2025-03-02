import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import {
  AbstractBoxSelection,
  BoxInfo,
  TokenInfo,
} from '@rosen-bridge/abstract-box-selection';

export class ErgoBoxSelection extends AbstractBoxSelection<ErgoBox> {
  protected readonly DEFAULT_MIN_BOX_VALUE = 100000n;
  protected readonly DEFAULT_MAX_TOKEN_COUNT = 100;

  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  getBoxInfo = (box: ErgoBox): BoxInfo => {
    const tokens: Array<TokenInfo> = [];
    const boxTokens = box.tokens();
    const boxTokensCount = boxTokens.len();
    for (let i = 0; i < boxTokensCount; i++) {
      const token = boxTokens.get(i);
      tokens.push({
        id: token.id().to_str(),
        value: BigInt(token.amount().as_i64().to_str()),
      });
    }
    return {
      id: box.box_id().to_str(),
      assets: {
        nativeToken: BigInt(box.value().as_i64().to_str()),
        tokens: tokens,
      },
    };
  };
}
