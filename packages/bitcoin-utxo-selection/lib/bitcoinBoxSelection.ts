import {
  AbstractBoxSelection,
  BoxInfo,
} from '@rosen-bridge/abstract-box-selection';

import { BitcoinUtxo } from './types';

export class BitcoinBoxSelection extends AbstractBoxSelection<BitcoinUtxo> {
  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  getBoxInfo = (box: BitcoinUtxo): BoxInfo => {
    return {
      id: `${box.txId}.${box.index}`,
      assets: {
        nativeToken: BigInt(box.value),
        tokens: [],
      },
    };
  };
}
