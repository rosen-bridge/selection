import { BoxInfo } from '@rosen-bridge/abstract-box-selection';

import { CardanoUtxo } from '../lib';

export const cardanoUtxos: CardanoUtxo[] = [
  {
    txId: '6699c2b892da307f8e3bf9329e9b17b397a7aff525f4caa8d05507b73a8392b5',
    index: 0,
    value: 3000000n,
    assets: [
      {
        policyId: '10bb8374ec0e933f80a684dd32363151cb6051864afb0b0088bba207',
        assetName: '727074',
        quantity: 150n,
      },
      {
        policyId: 'bb8374ec0e933f80a684dd32363151cb6051864afb0b0088bba20710',
        assetName: '72707476',
        quantity: 200n,
      },
    ],
  },
];

export const utxo0BoxInfo: BoxInfo = {
  id: cardanoUtxos[0].txId + '.' + cardanoUtxos[0].index,
  assets: {
    nativeToken: 3000000n,
    tokens: [
      {
        id: '10bb8374ec0e933f80a684dd32363151cb6051864afb0b0088bba207.727074',
        value: 150n,
      },
      {
        id: 'bb8374ec0e933f80a684dd32363151cb6051864afb0b0088bba20710.72707476',
        value: 200n,
      },
    ],
  },
};
