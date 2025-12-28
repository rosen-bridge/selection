import * as ergoLib from 'ergo-lib-wasm-nodejs';
import { describe, expect, it } from 'vitest';

import { AssetBalance, ErgoChangeBoxBuilder } from '../lib';
import {
  CHANGE_ADDRESS,
  FEE,
  HEIGHT,
  MINTED_TOKEN_ID,
  TOKEN_ID,
  UNKNOWN_TOKEN_ID,
} from './testData';
import * as testData from './testData';
import { buildCandidate } from './utils/testUtils';

describe('ErgoChangeBoxBuilder', () => {
  /**
   * @target ErgoChangeBoxBuilder.build should build single change box with string address input
   * @dependencies ergo-lib, testData
   * @scenario
   * - create builder with a static change address
   * - prepare inputs/outputs so one box has surplus ERG and tokens
   * - call build and inspect the returned change box
   * @expected
   * - changeBoxes contains exactly one entry
   * - the change box height matches the requested transaction height
   * - the change box value equals the computed ERG surplus
   * - the change box tokens contain the surplus amount of TOKEN_ID
   */
  it('should build single change box with string address input', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 2);

    const outputBoxes = [
      buildCandidate(1_200_000_000n, [{ id: TOKEN_ID, value: 150n }]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      FEE,
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    const changeBox = changeBoxes[0];
    expect(changeBox.creation_height()).toBe(HEIGHT);
    expect(changeBox.value().as_i64().to_str()).toBe('798900000');
    expect(changeBox.tokens().len()).toBe(1);
    const token = changeBox.tokens().get(0);
    expect(token.id().to_str()).toBe(TOKEN_ID);
    expect(token.amount().as_i64().to_str()).toBe('250');
  });

  /**
   * @target ErgoChangeBoxBuilder.build should build multiple change boxes using address generator
   * @dependencies ergo-lib, testData
   * @scenario
   * - configure address generator
   * - pass explicit change asset groups matching two change boxes
   * - call build and verify each change box properties
   * @expected
   * - changeBoxes contains two entries
   * - each change box script matches the rotated address
   * - ERG and token amounts match the provided changeAssets distribution
   */
  it('should build multiple change boxes using address generator', () => {
    // Step 1: prepare rotating address generator
    const ergoTree = ergoLib.ErgoTree.from_base16_bytes(
      testData.rawBoxes[0].ergoTree,
    );
    const derivedAddress = ergoLib.Address.recreate_from_ergo_tree(
      ergoTree,
    ).to_base58(ergoLib.NetworkPrefix.Mainnet);

    const addresses = [CHANGE_ADDRESS, derivedAddress];
    let index = 0;
    const changeAddress = () => {
      const current = addresses[index] ?? addresses[addresses.length - 1];
      index += 1;
      return current;
    };

    // Step 2: configure inputs, outputs and explicit change assets
    const changeAssets: Array<AssetBalance> = [
      {
        nativeToken: 700_000_000n,
        tokens: [{ id: TOKEN_ID, value: 150n }],
      },
      {
        nativeToken: 598_900_000n,
        tokens: [{ id: TOKEN_ID, value: 150n }],
      },
    ];

    // Step 3: build change boxes
    const changeBoxes = ErgoChangeBoxBuilder.fromChangeAssets(
      changeAddress,
      changeAssets,
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(2);

    changeBoxes.forEach((box, idx) => {
      const expectedTree = ergoLib.Address.from_base58(addresses[idx])
        .to_ergo_tree()
        .to_base16_bytes();
      expect(box.ergo_tree().to_base16_bytes()).toBe(expectedTree);
      const tokens = box.tokens();
      expect(tokens.len()).toBe(1);
      const token = tokens.get(0);
      expect(token.id().to_str()).toBe(TOKEN_ID);
      expect(token.amount().as_i64().to_str()).toBe(
        changeAssets[idx].tokens[0].value.toString(),
      );
    });

    expect(changeBoxes[0].value().as_i64().to_str()).toBe('700000000');
    expect(changeBoxes[1].value().as_i64().to_str()).toBe('598900000');
  });

  /**
   * @target ErgoChangeBoxBuilder.build should preserve token order in provided changeAssets
   * @dependencies ergo-lib, testUtils
   * @scenario
   * - create input box with two token ids
   * - create output box consuming some of each token and ERG
   * - provide changeAssets with tokens in a deliberate non-sorted order
   * - build change boxes
   * @expected
   * - change box tokens appear in the same order as provided changeAssets
   */
  it('should preserve token order in provided changeAssets', () => {
    const otherTokenId =
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    const expectedNativeChange = 1_200_000_000n - 900_000_000n - FEE;
    const changeAssets: Array<AssetBalance> = [
      {
        nativeToken: expectedNativeChange,
        tokens: [
          { id: otherTokenId, value: 90n },
          { id: TOKEN_ID, value: 150n },
        ],
      },
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromChangeAssets(
      CHANGE_ADDRESS,
      changeAssets,
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    const changeTokens = changeBoxes[0].tokens();
    expect(changeTokens.len()).toBe(2);
    expect(changeTokens.get(0).id().to_str()).toBe(otherTokenId);
    expect(changeTokens.get(0).amount().as_i64().to_str()).toBe('90');
    expect(changeTokens.get(1).id().to_str()).toBe(TOKEN_ID);
    expect(changeTokens.get(1).amount().as_i64().to_str()).toBe('150');
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when height is not provided
   * @dependencies ergo-lib, testData
   * @scenario
   * - call build without height
   * @expected
   * - build throws an error
   */
  it('should throw when height is not provided', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 2);
    const outputBoxes = [
      buildCandidate(1_050_000_000n, [{ id: TOKEN_ID, value: 180n }]),
    ];

    expect(() =>
      ErgoChangeBoxBuilder.fromBoxes(
        CHANGE_ADDRESS,
        inputBoxes,
        outputBoxes,
        FEE,
      ).build({} as never),
    ).toThrow(/Height must be a positive integer/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should set provided registers on change boxes
   * @dependencies ergo-lib, testData
   * @scenario
   * - pass registerValues array when building change boxes
   * - inspect the returned change boxes
   * @expected
   * - each change box contains the provided register values
   */
  it('should set provided registers on change boxes', () => {
    const registerValue = ergoLib.Constant.from_i64(ergoLib.I64.from_str('42'));
    const changeAssets: Array<AssetBalance> = [
      {
        nativeToken: 98_900_000n,
        tokens: [{ id: TOKEN_ID, value: 150n }],
      },
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromChangeAssets(
      CHANGE_ADDRESS,
      changeAssets,
    ).build({ height: HEIGHT, registerValues: [registerValue] });

    expect(changeBoxes).toHaveLength(changeAssets.length);
    changeBoxes.forEach((changeBox) => {
      expect(changeBox.register_value(4)?.to_i64().to_str()).toBe(
        registerValue.to_i64().to_str(),
      );
    });
  });

  /**
   * @target ErgoChangeBoxBuilder.build should return no change boxes when inputs exactly match outputs
   * @dependencies ergo-lib, testData
   * @scenario
   * - craft inputs and outputs with identical assets
   * - call build without changeAssets override
   * - inspect the returned list
   * @expected
   * - changeBoxes is an empty array
   */
  it('should return no change boxes when inputs exactly match outputs', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);

    const outputBoxes = [
      buildCandidate(BigInt(testData.rawBoxes[0].value), [
        { id: TOKEN_ID, value: 200n },
      ]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      0n,
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(0);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when outputs exceed inputs including fee
   * @dependencies ergo-lib, testData
   * @scenario
   * - configure outputs whose total > inputs + fee
   * - call build and capture the error
   * @expected
   * - calling build throws an error explaining outputs exceed inputs
   */
  it('should throw when outputs exceed inputs including fee', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: TOKEN_ID, value: 50n }]),
      buildCandidate(150_000_000n, []),
    ];

    expect(() =>
      ErgoChangeBoxBuilder.fromBoxes(
        CHANGE_ADDRESS,
        inputBoxes,
        outputBoxes,
        200_000_000n,
      ).build({ height: HEIGHT }),
    ).toThrow(/exceeds total input ERG/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when tokens remain but no erg is left for change
   * @dependencies ergo-lib, testData
   * @scenario
   * - choose outputs that consume all ERG while leaving tokens
   * - call build with zero-fee change
   * @expected
   * - calling build throws an error because no ERG remains to carry tokens
   */
  it('should throw when tokens remain but no erg is left for change', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [buildCandidate(998_000_000n, [])];

    expect(() =>
      ErgoChangeBoxBuilder.fromBoxes(
        CHANGE_ADDRESS,
        inputBoxes,
        outputBoxes,
        2_000_000n,
      ).build({ height: HEIGHT }),
    ).toThrow(/no ERG is left/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when change box has insufficient ERG for tokens
   * @dependencies ergo-lib, testData
   * @scenario
   * - pass custom changeAssets with ERG below wasm min
   * - invoke build to construct change box
   * @expected
   * - calling build throws an error stating the change box lacks sufficient ERG
   */
  it('should throw when change box has insufficient ERG for tokens', () => {
    // Use 27000 nanoErg which is below the calculated minimum (~28440) for a box with 1 token
    const changeAssets: Array<AssetBalance> = [
      {
        nativeToken: 27000n,
        tokens: [{ id: TOKEN_ID, value: 200n }],
      },
    ];

    expect(() =>
      ErgoChangeBoxBuilder.fromChangeAssets(CHANGE_ADDRESS, changeAssets).build(
        {
          height: HEIGHT,
        },
      ),
    ).toThrow(/Not enough ERG/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should allow minted tokens referenced by the first input box id
   * @dependencies ergo-lib, testData
   * @scenario
   * - include a token with id equal to first input box id (minted token)
   * - run build and verify no errors occur
   * - inspect resulting change tokens
   * @expected
   * - changeBoxes contains one entry
   * - the minted token id is ignored and only original tokens remain in change
   */
  it('should allow minted tokens referenced by the first input box id', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(999_600_000n, [{ id: MINTED_TOKEN_ID, value: 1n }]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      0n,
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    const changeTokens = changeBoxes[0].tokens();
    expect(changeTokens.len()).toBe(1);
    expect(changeTokens.get(0).id().to_str()).toBe(TOKEN_ID);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when outputs contain non-minted unknown tokens
   * @dependencies ergo-lib, testData
   * @scenario
   * - add a token id absent from inputs and not minted
   * - call build expecting failure
   * @expected
   * - calling build throws an error indicating the unknown token in outputs
   */
  it('should throw when outputs contain non-minted unknown tokens', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: UNKNOWN_TOKEN_ID, value: 1n }]),
    ];

    expect(() =>
      ErgoChangeBoxBuilder.fromBoxes(
        CHANGE_ADDRESS,
        inputBoxes,
        outputBoxes,
        0n,
      ).build({ height: HEIGHT }),
    ).toThrow(/Token \[/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should reduce change tokens by burnTokens
   * @dependencies ergo-lib, testData
   * @scenario
   * - provide burnTokens for a token that exists in computed change
   * - build change boxes
   * @expected
   * - change token amount is reduced by burn amount
   */
  it('should reduce change tokens by burnTokens', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: TOKEN_ID, value: 50n }]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      FEE,
      [{ id: TOKEN_ID, value: 10n }],
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    const token = changeBoxes[0].tokens().get(0);
    expect(token.id().to_str()).toBe(TOKEN_ID);
    expect(token.amount().as_i64().to_str()).toBe('140');
  });

  /**
   * @target ErgoChangeBoxBuilder.build should throw when burnTokens exceeds remaining change
   * @dependencies ergo-lib, testData
   * @scenario
   * - provide burnTokens greater than computed change for a token
   * - call build
   * @expected
   * - build throws an error
   */
  it('should throw when burnTokens exceeds remaining change', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: TOKEN_ID, value: 50n }]),
    ];

    expect(() =>
      ErgoChangeBoxBuilder.fromBoxes(
        CHANGE_ADDRESS,
        inputBoxes,
        outputBoxes,
        FEE,
        [{ id: TOKEN_ID, value: 1000n }],
      ).build({ height: HEIGHT }),
    ).toThrow(/Burn amount/);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should remove tokens when burn makes change exactly zero
   * @dependencies ergo-lib, testData
   * @scenario
   * - provide burnTokens equal to the computed change amount for a token
   * - build change boxes
   * @expected
   * - the fully burned token is not included in the change box
   */
  it('should remove tokens when burn makes change exactly zero', () => {
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: TOKEN_ID, value: 50n }]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      FEE,
      [{ id: TOKEN_ID, value: 150n }],
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    expect(changeBoxes[0].tokens().len()).toBe(0);
  });

  /**
   * @target ErgoChangeBoxBuilder.build should reduce change tokens by multiple burn tokens
   * @dependencies ergo-lib, testData
   * @scenario
   * - provide burnTokens for multiple token ids
   * - build change boxes
   * @expected
   * - each burned token amount is reduced from change output
   */
  it('should reduce change tokens by multiple burn tokens', () => {
    const otherTokenId =
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const inputCandidate = buildCandidate(BigInt(testData.rawBoxes[0].value), [
      { id: TOKEN_ID, value: 200n },
      { id: otherTokenId, value: 100n },
    ]);
    const inputBoxes = [
      ergoLib.ErgoBox.from_box_candidate(
        inputCandidate,
        ergoLib.TxId.zero(),
        0,
      ),
    ];
    const outputBoxes = [
      buildCandidate(900_000_000n, [
        { id: TOKEN_ID, value: 50n },
        { id: otherTokenId, value: 10n },
      ]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      FEE,
      [
        { id: TOKEN_ID, value: 10n },
        { id: otherTokenId, value: 5n },
      ],
    ).build({ height: HEIGHT });

    expect(changeBoxes).toHaveLength(1);
    const changeTokens = changeBoxes[0].tokens();
    expect(changeTokens.len()).toBe(2);
    const tokenMap = new Map<string, string>();
    for (let i = 0; i < changeTokens.len(); i++) {
      const token = changeTokens.get(i);
      tokenMap.set(token.id().to_str(), token.amount().as_i64().to_str());
    }
    expect(tokenMap.get(TOKEN_ID)).toBe('140');
    expect(tokenMap.get(otherTokenId)).toBe('85');
  });

  /**
   * @target ErgoChangeBoxBuilder.build should build change boxes usable in a real unsigned transaction
   * @dependencies ergo-lib, testData
   * @scenario
   * - generate change boxes
   * - feed inputs/outputs/change into TxBuilder and build unsigned tx
   * - verify tx outputs include original outputs followed by change boxes
   * @expected
   * - the unsigned transaction contains all requested outputs followed by change boxes and the fee box
   * - each planned output matches its counterpart in the transaction
   * - each change box matches the corresponding transaction output after the planned outputs
   */
  it('should build change boxes usable in a real unsigned transaction', () => {
    // Step 1: build change boxes for selected inputs/outputs
    const inputBoxes = testData.ergoBoxes.slice(0, 2);
    const outputBoxes = [
      buildCandidate(1_300_000_000n, [{ id: TOKEN_ID, value: 180n }]),
    ];

    const changeBoxes = ErgoChangeBoxBuilder.fromBoxes(
      CHANGE_ADDRESS,
      inputBoxes,
      outputBoxes,
      FEE,
    ).build({ height: HEIGHT });

    expect(changeBoxes.length).toBeGreaterThan(0);

    // Step 2: prepare TxBuilder inputs/outputs collections
    const ergoBoxes = ergoLib.ErgoBoxes.empty();
    inputBoxes.forEach((box) => ergoBoxes.add(box));

    const candidates = ergoLib.ErgoBoxCandidates.empty();
    outputBoxes
      .concat(changeBoxes)
      .forEach((candidate) => candidates.add(candidate));

    const boxSelection = new ergoLib.BoxSelection(
      ergoBoxes,
      new ergoLib.ErgoBoxAssetsDataList(),
    );

    // Step 3: build unsigned transaction and verify outputs
    const txBuilder = ergoLib.TxBuilder.new(
      boxSelection,
      candidates,
      HEIGHT,
      ergoLib.BoxValue.from_i64(ergoLib.I64.from_str(FEE.toString())),
      ergoLib.Address.from_base58(CHANGE_ADDRESS),
    );

    const unsignedTx = txBuilder.build();

    const builtOutputs = unsignedTx.output_candidates();
    expect(builtOutputs.len()).toBe(
      outputBoxes.length + changeBoxes.length + 1,
    );

    /**
     * Compares two box candidates and asserts their tree, value and tokens match.
     */
    const assertEqual = (
      actual: ergoLib.ErgoBoxCandidate,
      expected: ergoLib.ErgoBoxCandidate,
    ) => {
      expect(actual.ergo_tree().to_base16_bytes()).toBe(
        expected.ergo_tree().to_base16_bytes(),
      );
      expect(actual.value().as_i64().to_str()).toBe(
        expected.value().as_i64().to_str(),
      );
      const actualTokens = actual.tokens();
      const expectedTokens = expected.tokens();
      expect(actualTokens.len()).toBe(expectedTokens.len());
      for (let i = 0; i < actualTokens.len(); i++) {
        expect(actualTokens.get(i).id().to_str()).toBe(
          expectedTokens.get(i).id().to_str(),
        );
        expect(actualTokens.get(i).amount().as_i64().to_str()).toBe(
          expectedTokens.get(i).amount().as_i64().to_str(),
        );
      }
    };

    outputBoxes.forEach((expected, idx) => {
      assertEqual(builtOutputs.get(idx), expected);
    });
    changeBoxes.forEach((expected, idx) => {
      assertEqual(builtOutputs.get(outputBoxes.length + idx), expected);
    });
  });
});
