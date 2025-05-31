import { AssetBalance } from '../lib';
import TestBoxSelection from './TestBoxSelection';

describe('AbstractBoxSelection', () => {
  describe('getCoveringBoxes', () => {
    const emptyMap = new Map<string, string>();

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     * - additional assets should be correct
     */
    it('should return enough boxes as covered when boxes cover required assets', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-1']);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return all boxes as
     * NOT covered when boxes do NOT cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return both serialized boxes
     */
    it('should return all boxes as NOT covered when boxes do NOT cover required assets', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets more than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 300000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-box-1', 'serialized-box-2']);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return all useful boxes
     * as NOT covered key when boxes do NOT cover required tokens
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     *   (second box doesn't contain required token)
     * - mock an AssetBalance object with tokens more than box tokens
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     */
    it('should return all useful boxes as NOT covered when boxes do NOT cover required tokens', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      //  (second box doesn't contain required token)
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token2', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with tokens more than box tokens
      const requiredAssets: AssetBalance = {
        nativeToken: 60000n,
        tokens: [{ id: 'token1', value: 300n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-box-1']);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when multiple boxes cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 12 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return all serialized boxes except the last one
     */
    it('should return enough boxes as covered when multiple boxes cover required assets', async () => {
      // Mock an iterator to return 12 boxes
      const iterator = Array.from({ length: 12 }, (x, i) => i)
        .map((i) => `serialized-box-${i + 1}`)
        .values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        const i = Number(boxId.slice(15));
        if (i > 0 && i < 13)
          return {
            id: `box${i}`,
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 1100000n,
        tokens: [{ id: 'token1', value: 900n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(
        Array.from({ length: 11 }, (x, i) => i).map(
          (i) => `serialized-box-${i + 1}`,
        ),
      );
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 0n,
        tokens: [{ id: 'token1', value: 1300n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return no boxes as
     * NOT covered when address has no boxes
     * @dependencies
     * @scenario
     * - mock an iterator to return NO boxes
     * - mock an AssetBalance object with some assets
     * - run test
     * - check returned value
     * @expected
     * - it should return empty list
     */
    it('should return no boxes as NOT covered when address has no boxes', async () => {
      // Mock an iterator to return NO boxes
      const iterator = [].values();

      // Mock an AssetBalance object with some assets
      const requiredAssets: AssetBalance = {
        nativeToken: 100000n,
        tokens: [{ id: 'token1', value: 900n }],
      };

      // Run test
      const chain = new TestBoxSelection();
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when tracked boxes cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked box
     */
    it('should return enough boxes as covered when tracked boxes cover required assets', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        trackMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-tracked-box-1']);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 30000n,
        tokens: [{ id: 'token1', value: 50n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return all boxes as
     * NOT covered when tracked boxes do NOT cover required assets
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked boxes
     */
    it('should return all boxes as NOT covered when tracked boxes do NOT cover required assets', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 190000n,
        tokens: [{ id: 'token1', value: 390n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        trackMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([
        'serialized-tracked-box-1',
        'serialized-box-2',
      ]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return second box
     * as covered when first box is not allowed
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock first box as forbidden
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return second serialized box
     */
    it('should return second box as covered when first box is not allowed', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock first box as forbidden
      const forbiddenIds = ['box1'];

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 90000n,
        tokens: [{ id: 'token1', value: 190n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        forbiddenIds,
        emptyMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-2']);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 10000n,
        tokens: [{ id: 'token1', value: 10n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return no boxes as
     * NOT covered when tracking ends to no box
     * @dependencies
     * @scenario
     * - mock an iterator to return one box
     * - mock a Map to track first box to no box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return empty list
     */
    it('should return no boxes as NOT covered when tracking ends to no box', async () => {
      // Mock an iterator to return one box
      const iterator = ['serialized-box-1'].values();

      // Mock a Map to track first box to no box
      const trackMap = new Map<string, string | undefined>();
      trackMap.set('box1', undefined);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        trackMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return all boxes as
     * NOT covered when two boxes are tracked to same box
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked boxes
     */
    it('should return all boxes as NOT covered when two boxes are tracked to same box', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');
      trackMap.set('box2', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 150000n,
        tokens: [{ id: 'token1', value: 250n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        trackMap,
        iterator,
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-tracked-box-1']);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets and additional native token for the change box
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return two serialized boxes
     * - additional assets should be correct
     */
    it('should return enough boxes as covered when boxes cover required assets and additional native token for the change box', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 100000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
        10000n,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-1', 'serialized-box-2']);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 100000n,
        tokens: [{ id: 'token1', value: 300n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets and additional native token for multiple change boxes
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return two serialized boxes
     * - additional assets should be correct
     */
    it('should return enough boxes as covered when boxes cover required assets and additional native token for multiple change boxes', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = ['serialized-box-1', 'serialized-box-2'].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [
                { id: 'token1', value: 200n },
                { id: 'token2', value: 2200n },
                { id: 'token3', value: 3300n },
              ],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 120000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 90000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
        10000n,
        1,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-1', 'serialized-box-2']);
      expect(result.additionalAssets.aggregated).toEqual({
        nativeToken: 130000n,
        tokens: [
          { id: 'token1', value: 300n },
          { id: 'token2', value: 2200n },
          { id: 'token3', value: 3300n },
        ],
      });
      expect(result.additionalAssets.list).toEqual([
        {
          nativeToken: 43334n,
          tokens: [{ id: 'token1', value: 300n }],
        },
        {
          nativeToken: 43333n,
          tokens: [{ id: 'token2', value: 2200n }],
        },
        {
          nativeToken: 43333n,
          tokens: [{ id: 'token3', value: 3300n }],
        },
      ]);
    });

    /**
     * @target AbstractBoxSelection.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets and additional native token
     * for the change box and fee
     * @dependencies
     * @scenario
     * - mock an iterator to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return three serialized boxes
     * - additional assets should be correct
     */
    it('should return enough boxes as covered when boxes cover required assets and additional native token for the change box and fee', async () => {
      // Mock an iterator to return 2 boxes
      const iterator = [
        'serialized-box-1',
        'serialized-box-2',
        'serialized-box-3',
      ].values();

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = new TestBoxSelection();
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-3')
          return {
            id: 'box3',
            assets: {
              nativeToken: 200000n,
              tokens: [],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 100000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.getCoveringBoxes(
        requiredAssets,
        [],
        emptyMap,
        iterator,
        10000n,
        undefined,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (boxes: string[], changeBoxesCount: number) => 100000n,
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual([
        'serialized-box-1',
        'serialized-box-2',
        'serialized-box-3',
      ]);
      const expectedAdditionalAssets: AssetBalance = {
        nativeToken: 300000n,
        tokens: [{ id: 'token1', value: 300n }],
      };
      expect(result.additionalAssets.aggregated).toEqual(
        expectedAdditionalAssets,
      );
      expect(result.additionalAssets.list).toEqual([expectedAdditionalAssets]);
    });
  });
});
