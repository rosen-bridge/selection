import { BoxInfo } from '@rosen-bridge/abstract-box-selection';
import { BitcoinUtxo } from '../lib';

export const bitcoinUtxos: BitcoinUtxo[] = [
  {
    txId: '6699c2b892da307f8e3bf9329e9b17b397a7aff525f4caa8d05507b73a8392b5',
    index: 0,
    value: 3000000n,
  },
];

export const utxo0BoxInfo: BoxInfo = {
  id: bitcoinUtxos[0].txId + '.' + bitcoinUtxos[0].index,
  assets: {
    nativeToken: 3000000n,
    tokens: [],
  },
};
