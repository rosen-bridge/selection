import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance } from '@rosen-bridge/selection-types';

export type ChangeAddressInput = string | (() => string);

export type RegisterValues = Array<ergoLib.Constant>;

export type TokenAmountMap = Map<string, bigint>;

export interface AggregatedAssets {
  native: bigint;
  tokens: TokenAmountMap;
}

export interface BuildChangeBoxesParams {
  inputBoxes: Array<ergoLib.ErgoBox>;
  outputBoxes: Array<ergoLib.ErgoBoxCandidate>;
  height?: number;
  fee?: bigint;
  changeAssets?: Array<AssetBalance>;
  registerValues?: RegisterValues;
  burnTokens?: TokenAmountMap;
}
