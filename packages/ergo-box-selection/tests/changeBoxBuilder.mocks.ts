import * as ergoLib from 'ergo-lib-wasm-nodejs';

import * as testData from './testData';

export const CHANGE_ADDRESS =
  '9fRAWhdxEsTcdb8PhGNrZfwqa65zfkuYHAMmkQLcic1gdLSV5vA';
export const HEIGHT = 1400000;
export const FEE = 1100000n;
export const TOKEN_ID = testData.rawBoxes[0].assets[0].tokenId;
export const UNKNOWN_TOKEN_ID =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const MINTED_TOKEN_ID = testData.rawBoxes[0].boxId;

export const buildCandidate = (
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
