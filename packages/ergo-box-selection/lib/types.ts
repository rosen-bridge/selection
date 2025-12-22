import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance, TokenInfo } from '@rosen-bridge/selection-types';

export type ChangeAddressInput = string | (() => string);

export type RegisterValues = Array<ergoLib.Constant>;

export interface BuildChangeBoxesParams {
  height: number;
  inputBoxes?: Array<ergoLib.ErgoBox>;
  outputBoxes?: Array<ergoLib.ErgoBoxCandidate>;
  fee?: bigint;
  changeAssets?: Array<AssetBalance>;
  registerValues?: RegisterValues;
  burnTokens?: Array<TokenInfo>;
}

export interface BuildChangeBoxesFromBoxesParams {
  height: number;
  inputBoxes: Array<ergoLib.ErgoBox>;
  outputBoxes: Array<ergoLib.ErgoBoxCandidate>;
  fee?: bigint;
  registerValues?: RegisterValues;
  burnTokens?: Array<TokenInfo>;
}

export interface BuildChangeBoxesFromChangeAssetsParams {
  height: number;
  changeAssets: Array<AssetBalance>;
  registerValues?: RegisterValues;
}
