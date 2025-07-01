import {
  AbstractBoxSelection,
  BoxInfo,
} from '@rosen-bridge/abstract-box-selection';
import { BitcoinRunesUtxo } from './types';

export class BitcoinRunesBoxSelection extends AbstractBoxSelection<BitcoinRunesUtxo> {
  /**
   * extracts box id and assets of a box
   * @param box the box
   * @returns an object containing the box id and assets
   */
  getBoxInfo = (box: BitcoinRunesUtxo): BoxInfo => {
    return {
      id: `${box.txId}.${box.index}`,
      assets: {
        nativeToken: BigInt(box.value),
        tokens: box.runes.map((rune) => ({
          id: rune.runeId,
          value: rune.quantity,
        })),
      },
    };
  };
}
