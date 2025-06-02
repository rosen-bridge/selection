import { BitcoinRunesBoxSelection } from '../lib/BitcoinRunesBoxSelection';
import * as testData from './testData';

describe('BitcoinRunesBoxSelection', () => {
  describe('getBoxInfo', () => {
    /**
     * @target BitcoinRunesBoxSelection.getBoxInfo should return box info successfully
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - it should return box info
     */
    it('should return box info successfully', async () => {
      // Run test
      const chain = new BitcoinRunesBoxSelection();
      const result = chain.getBoxInfo(testData.bitcoinUtxos[0]);

      // Check returned value
      expect(result).toEqual(testData.utxo0BoxInfo);
    });
  });
});
