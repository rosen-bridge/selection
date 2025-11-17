import * as ergoLib from 'ergo-lib-wasm-nodejs';
import { describe, expect, it } from 'vitest';

import { AssetBalance, ErgoChangeBoxBuilder } from '../lib';
import * as testData from './testData';

const CHANGE_ADDRESS = '9fRAWhdxEsTcdb8PhGNrZfwqa65zfkuYHAMmkQLcic1gdLSV5vA';
const TOKEN_ID = testData.rawBoxes[0].assets[0].tokenId;
const HEIGHT = 1400000;
const FEE = 1100000n;

const buildCandidate = (
  value: bigint,
  tokens: Array<{ id: string; value: bigint }>,
  address = CHANGE_ADDRESS,
  height = HEIGHT,
): ergoLib.ErgoBoxCandidate => {
  const builder = new ergoLib.ErgoBoxCandidateBuilder(
    ergoLib.BoxValue.from_i64(ergoLib.I64.from_str(value.toString())),
    ergoLib.Contract.pay_to_address(ergoLib.Address.from_base58(address)),
    height,
  );
  tokens.forEach((token) =>
    builder.add_token(
      ergoLib.TokenId.from_str(token.id),
      ergoLib.TokenAmount.from_i64(
        ergoLib.I64.from_str(token.value.toString()),
      ),
    ),
  );
  return builder.build();
};

describe('ErgoChangeBoxBuilder', () => {
  it('should build single change box with string address input', () => {
    const builder = new ErgoChangeBoxBuilder(CHANGE_ADDRESS);
    const inputBoxes = testData.ergoBoxes.slice(0, 2);

    const outputBoxes = [
      buildCandidate(1_200_000_000n, [{ id: TOKEN_ID, value: 150n }]),
    ];

    const changeBoxes = builder.build({
      inputBoxes,
      outputBoxes,
      height: HEIGHT,
      fee: FEE,
    });

    expect(changeBoxes).toHaveLength(1);
    const changeBox = changeBoxes[0];
    expect(changeBox.creation_height()).toBe(HEIGHT);
    expect(changeBox.value().as_i64().to_str()).toBe('798900000');
    expect(changeBox.tokens().len()).toBe(1);
    const token = changeBox.tokens().get(0);
    expect(token.id().to_str()).toBe(TOKEN_ID);
    expect(token.amount().as_i64().to_str()).toBe('250');
  });

  it('should build multiple change boxes using address generator and registers', () => {
    const ergoTree = ergoLib.ErgoTree.from_base16_bytes(
      testData.rawBoxes[0].ergoTree,
    );
    const derivedAddress = ergoLib.Address.recreate_from_ergo_tree(
      ergoTree,
    ).to_base58(ergoLib.NetworkPrefix.Mainnet);

    const addresses = [CHANGE_ADDRESS, derivedAddress];
    let index = 0;
    const builder = new ErgoChangeBoxBuilder(() => {
      const current = addresses[index] ?? addresses[addresses.length - 1];
      index += 1;
      return current;
    });

    const inputBoxes = testData.ergoBoxes;
    const outputBoxes = [
      buildCandidate(1_000_000_000n, [{ id: TOKEN_ID, value: 250n }]),
      buildCandidate(700_000_000n, [{ id: TOKEN_ID, value: 50n }]),
    ];

    const registerValue = ergoLib.Constant.from_i64(ergoLib.I64.from_str('42'));

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

    const changeBoxes = builder.build({
      inputBoxes,
      outputBoxes,
      height: HEIGHT,
      fee: FEE,
      changeAssets,
      registerValues: new Map([[4, registerValue]]),
    });

    expect(changeBoxes).toHaveLength(2);

    changeBoxes.forEach((box, idx) => {
      const expectedTree = ergoLib.Address.from_base58(addresses[idx])
        .to_ergo_tree()
        .to_base16_bytes();
      expect(box.ergo_tree().to_base16_bytes()).toBe(expectedTree);
      expect(box.register_value(4)?.dbg_inner()).toBe(
        registerValue.dbg_inner(),
      );
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

  it('should derive height from output boxes when not provided', () => {
    const builder = new ErgoChangeBoxBuilder(CHANGE_ADDRESS);
    const inputBoxes = testData.ergoBoxes.slice(0, 2);
    const outputBoxes = [
      buildCandidate(
        1_050_000_000n,
        [{ id: TOKEN_ID, value: 180n }],
        CHANGE_ADDRESS,
        1_450_000,
      ),
      buildCandidate(50_000_000n, [], CHANGE_ADDRESS, 1_470_000),
    ];

    const changeBoxes = builder.build({
      inputBoxes,
      outputBoxes,
      fee: FEE,
    });

    expect(changeBoxes).toHaveLength(1);
    expect(changeBoxes[0].creation_height()).toBe(1_470_000);
  });

  it('should throw when outputs exceed inputs including fee', () => {
    const builder = new ErgoChangeBoxBuilder(CHANGE_ADDRESS);
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [
      buildCandidate(900_000_000n, [{ id: TOKEN_ID, value: 50n }]),
      buildCandidate(150_000_000n, []),
    ];

    expect(() =>
      builder.build({
        inputBoxes,
        outputBoxes,
        height: HEIGHT,
        fee: 200_000_000n,
      }),
    ).toThrow(/exceeds total input ERG/);
  });

  it('should throw when tokens remain but no erg is left for change', () => {
    const builder = new ErgoChangeBoxBuilder(CHANGE_ADDRESS);
    const inputBoxes = testData.ergoBoxes.slice(0, 1);
    const outputBoxes = [buildCandidate(998_000_000n, [])];

    expect(() =>
      builder.build({
        inputBoxes,
        outputBoxes,
        height: HEIGHT,
        fee: 2_000_000n,
      }),
    ).toThrow(/no ERG is left/);
  });

  it('should build change boxes usable in a real unsigned transaction', () => {
    const builder = new ErgoChangeBoxBuilder(CHANGE_ADDRESS);
    const inputBoxes = testData.ergoBoxes.slice(0, 2);
    const outputBoxes = [
      buildCandidate(1_300_000_000n, [{ id: TOKEN_ID, value: 180n }]),
    ];

    const changeBoxes = builder.build({
      inputBoxes,
      outputBoxes,
      height: HEIGHT,
      fee: FEE,
    });

    expect(changeBoxes.length).toBeGreaterThan(0);

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

    const txBuilder = ergoLib.TxBuilder.new(
      boxSelection,
      candidates,
      HEIGHT,
      ergoLib.BoxValue.from_i64(ergoLib.I64.from_str(FEE.toString())),
      ergoLib.Address.from_base58(CHANGE_ADDRESS),
    );

    const unsignedTx = txBuilder.build();

    const builtOutputs = unsignedTx.output_candidates();
    const matchedIndices = new Set<number>();
    for (let i = 0; i < builtOutputs.len(); i++) {
      const candidate = builtOutputs.get(i);
      changeBoxes.forEach((changeBox, idx) => {
        const sameTree =
          candidate.ergo_tree().to_base16_bytes() ===
          changeBox.ergo_tree().to_base16_bytes();
        const sameValue =
          candidate.value().as_i64().to_str() ===
          changeBox.value().as_i64().to_str();
        const candidateTokens = candidate.tokens();
        const changeTokens = changeBox.tokens();
        const sameTokens =
          candidateTokens.len() === changeTokens.len() &&
          (candidateTokens.len() === 0 ||
            candidateTokens.get(0).amount().as_i64().to_str() ===
              changeTokens.get(0).amount().as_i64().to_str());
        if (sameTree && sameValue && sameTokens) matchedIndices.add(idx);
      });
    }

    expect(matchedIndices.size).toBe(changeBoxes.length);
  });
});
