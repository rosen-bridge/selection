import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { CHANGE_ADDRESS, HEIGHT } from './testData';

/**
 * Builds an ErgoBoxCandidate with the given value, tokens, address, and height.
 * @param value - The value of the box in nanoERG.
 * @param tokens - An array of objects with id and value properties.
 * @param address - The address of the box.
 * @param height - The height of the box.
 * @returns An ErgoBoxCandidate.
 */
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
