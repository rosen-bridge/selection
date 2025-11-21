import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { AssetBalance } from '@rosen-bridge/selection-types';

export type ChangeAddressInput = string | (() => string);

export type RegisterValuesInput =
  | Map<number, ergoLib.Constant>
  | Partial<Record<number, ergoLib.Constant>>;

export interface BuildChangeBoxesParams {
  inputBoxes: Array<ergoLib.ErgoBox>;
  outputBoxes: Array<ergoLib.ErgoBoxCandidate>;
  height?: number;
  fee?: bigint | number | string;
  changeAssets?: Array<AssetBalance>;
  registerValues?: RegisterValuesInput;
}
