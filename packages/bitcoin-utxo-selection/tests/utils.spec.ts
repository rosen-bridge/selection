import { BitcoinUtxo, generateFeeEstimator } from '../lib';

describe('generateFeeEstimator', () => {
  /**
   * @target generateFeeEstimator should return expected fee
   * @dependencies
   * @scenario
   * - generate a fee estimator using native-segwit parameters and mocked fee ratio
   * - run test (execute the fee estimator with mocked inputs and change boxes count)
   * - check returned value
   * @expected
   * - it should return expected fee
   */
  it('should return expected fee', async () => {
    const result = generateFeeEstimator(
      1,
      42, // all txs include 40W. P2WPKH txs need additional 2W
      272, // native-segwit input weight unit
      124, // native-segwit output weight unit
      2.5, // mocked fee ratio
      4, // the virtual size matters for fee estimation of native-segwit transactions
    );

    const mockedInputs = [{}, {}, {}] as BitcoinUtxo[];
    expect(result(mockedInputs, 2)).toEqual(BigInt(769n));
  });
});
