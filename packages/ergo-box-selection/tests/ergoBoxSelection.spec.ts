import { AssetBalance } from '@rosen-bridge/abstract-box-selection';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import { ErgoBoxSelection } from '../lib';
import * as testData from './testData';

describe('ErgoBoxSelection', () => {
  describe('getBoxInfo', () => {
    /**
     * @target ErgoBoxSelection.getBoxInfo should return box info successfully
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - it should return box info
     */
    it('should return box info successfully', async () => {
      // Run test
      const chain = new ErgoBoxSelection();
      const result = chain.getBoxInfo(testData.ergoBoxes[0]);

      // Check returned value
      expect(result).toEqual(testData.box0Info);
    });
  });

  describe('getCoveringBoxes', () => {
    const emptyMap = new Map<string, ErgoBox>();

    /**
     * @target ErgoBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     * - additional assets should be correct
     *   - aggregated balance
     *   - balance in list
     *   - estimated fee
     */
    it('should return enough boxes as covered when boxes cover required assets', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = testData.ergoBoxes.slice(0, 2).values();

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 900000000n,
        tokens: [
          {
            id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
            value: 100n,
          },
        ],
      };

      // Run test
      const chain = new ErgoBoxSelection();
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes.map((box) => box.box_id().to_str())).toEqual([
        testData.rawBoxes[0].boxId,
      ]);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 98900000n,
        tokens: [
          {
            id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
            value: 100n,
          },
        ],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
      expect(result.additionalAssets.fee).toEqual(1100000n);
    });

    /**
     * @target ErgoBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets and additional native token for the change box
     * @dependencies
     * @scenario
     * - mock an iterator to return 3 boxes
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return two serialized boxes
     * - additional assets should be correct
     *   - aggregated balance
     *   - balance in list
     *   - estimated fee
     */
    it('should return enough boxes as covered when boxes cover required assets and additional native token for the change box', async () => {
      // Mock an iterator to return 3 boxes
      const iterator = testData.ergoBoxes.values();

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 2000000000n,
        tokens: [],
      };

      // Run test
      const chain = new ErgoBoxSelection();
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes.map((box) => box.box_id().to_str())).toEqual(
        testData.rawBoxes.map((box) => box.boxId),
      );
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 998900000n,
        tokens: [
          {
            id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
            value: 600n,
          },
        ],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
      expect(result.additionalAssets.fee).toEqual(1100000n);
    });

    /**
     * @target ErgoBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets and additional native token for the transaction fee
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     * - additional assets should be correct
     *   - aggregated balance
     *   - balance in list
     *   - estimated fee
     */
    it('should return enough boxes as covered when boxes cover required assets and additional native token for the transaction fee', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = testData.ergoBoxes.slice(0, 2).values();

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 999900000n,
        tokens: [
          {
            id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
            value: 100n,
          },
        ],
      };

      // Run test
      const chain = new ErgoBoxSelection();
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes.map((box) => box.box_id().to_str())).toEqual([
        testData.rawBoxes[0].boxId,
        testData.rawBoxes[1].boxId,
      ]);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 999000000n,
        tokens: [
          {
            id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
            value: 300n,
          },
        ],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
      expect(result.additionalAssets.fee).toEqual(1100000n);
    });
  });
});
