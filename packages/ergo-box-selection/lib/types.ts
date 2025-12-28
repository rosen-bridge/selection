import * as ergoLib from 'ergo-lib-wasm-nodejs';

export type ChangeAddressInput = string | (() => string);

export type RegisterValues = Array<ergoLib.Constant>;

export interface BuildChangeBoxesParams {
  height: number;
  registerValues?: RegisterValues;
}
