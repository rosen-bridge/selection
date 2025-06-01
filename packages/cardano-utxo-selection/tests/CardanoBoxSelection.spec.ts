import { CardanoBoxSelection } from '../lib/CardanoBoxSelection';
import * as testData from './testData';

describe('CardanoBoxSelection', () => {
  describe('getBoxInfo', () => {
    /**
     * @target CardanoBoxSelection.getBoxInfo should return box info successfully
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - it should return box info
     */
    it('should return box info successfully', async () => {
      // Run test
      const chain = new CardanoBoxSelection();
      const result = chain.getBoxInfo(testData.cardanoUtxos[0]);

      // Check returned value
      expect(result).toEqual(testData.utxo0BoxInfo);
    });
  });
});
