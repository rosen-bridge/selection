import {
  AbstractBoxSelection,
  BoxInfo,
  FeeEstimator,
} from '@rosen-bridge/abstract-box-selection';
import { BitcoinUtxo } from './types';

export class BitcoinBoxSelection extends AbstractBoxSelection<BitcoinUtxo> {
  /**
   * generates a fee estimator function based on the transaction weight
   * - $ic$: input count
   * - $cc$: change box count
   * - $aoc$: additional output count
   * - $tw$: transaction base weight
   * - $iw$: input weight unit
   * - $ow$: output weight unit
   * - $fr$: fee ratio
   * - $df$: discount factor
   *
   * $$
   * fee = ceil((tw + ((cc + aoc) * ow) + (iw * ic)) / df) * fr)
   * $$
   * @param additionalOutputCount the number of additional outputs
   * @param txBaseWeight the base weight of the transaction
   * @param inputWeightUnit the weight unit of an input
   * @param outputWeightUnit the weight unit of an output
   * @param feeRatio the fee ratio
   * @param discountFactor the discount factor
   * @returns a fee estimator function
   */
  static generateFeeEstimator = (
    additionalOutputCount: number,
    txBaseWeight: number,
    inputWeightUnit: number,
    outputWeightUnit: number,
    feeRatio: number,
    discountFactor: number,
  ): FeeEstimator<BitcoinUtxo> => {
    return (
      selectedBoxes: Array<BitcoinUtxo>,
      changeBoxesCount: number,
    ): bigint => {
      const inputsWeight = selectedBoxes.length * inputWeightUnit;
      const outputsWeight =
        (changeBoxesCount + additionalOutputCount) * outputWeightUnit;
      const txWeight = txBaseWeight + inputsWeight + outputsWeight;
      return BigInt(Math.ceil((txWeight / discountFactor) * feeRatio));
    };
  };

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
