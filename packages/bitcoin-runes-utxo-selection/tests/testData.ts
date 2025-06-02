import { BoxInfo } from '@rosen-bridge/abstract-box-selection';
import { BitcoinRunesUtxo } from '../lib';

export const bitcoinUtxos: BitcoinRunesUtxo[] = [
  {
    txId: '6699c2b892da307f8e3bf9329e9b17b397a7aff525f4caa8d05507b73a8392b5',
    index: 0,
    value: 3000000n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 150n,
      },
    ],
  },
];

export const utxo0BoxInfo: BoxInfo = {
  id: bitcoinUtxos[0].txId + '.' + bitcoinUtxos[0].index,
  assets: {
    nativeToken: 3000000n,
    tokens: [
      {
        id: '880887:3052',
        value: 150n,
      },
    ],
  },
};
