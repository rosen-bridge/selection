import {
  AbstractBoxSelection,
  BoxInfo,
  TokenInfo,
} from '@rosen-bridge/abstract-box-selection';
import { CardanoUtxo } from './types';

export class CardanoBoxSelection extends AbstractBoxSelection<CardanoUtxo> {
  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  getBoxInfo = (box: CardanoUtxo): BoxInfo => {
    const tokens: Array<TokenInfo> = box.assets.map((token) => ({
      id: `${token.policyId}.${token.assetName}`,
      value: BigInt(token.quantity),
    }));
    return {
      id: `${box.txId}.${box.index}`,
      assets: {
        nativeToken: BigInt(box.value),
        tokens: tokens,
      },
    };
  };
}
