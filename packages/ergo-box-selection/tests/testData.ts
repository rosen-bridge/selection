import { ErgoBox } from 'ergo-lib-wasm-nodejs';

import { BoxInfo } from '@rosen-bridge/abstract-box-selection';

export const rawBoxes = [
  {
    boxId: 'f5bdbb58b7daaac0acf7ad57ca36c8faf0514624f88cde793b90fc66b3a2615b',
    value: 1000000000,
    ergoTree:
      '0008cd03cc357e707ca91641f11d54ca01f256b7f4a23736f4309f3d6d3d422970a1c3ba',
    assets: [
      {
        tokenId:
          '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
        amount: 200,
      },
    ],
    creationHeight: 1400000,
    additionalRegisters: {},
    transactionId:
      'f3aad6819b6a2e855b11d1cff40b06fa9437e5231768088a75e799225007af65',
    index: 0,
  },
  {
    boxId: 'a855b260ed712d37e7aeccb8ec02a179c4f11196a1f9dd54613ec35c33e92f3c',
    value: 1000000000,
    ergoTree:
      '0008cd03cc357e707ca91641f11d54ca01f256b7f4a23736f4309f3d6d3d422970a1c3ba',
    assets: [
      {
        tokenId:
          '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
        amount: 200,
      },
    ],
    creationHeight: 1400000,
    additionalRegisters: {},
    transactionId:
      '4c5b9c9ff0872cf72a99791adb3b16a301e3134f2392c0d95669d9765c684063',
    index: 0,
  },
  {
    boxId: 'fbaeb61360e4d4a2a4584f41899dba88266599baa91ea6306b64b610608e91ca',
    value: 1000000000,
    ergoTree:
      '0008cd03cc357e707ca91641f11d54ca01f256b7f4a23736f4309f3d6d3d422970a1c3ba',
    assets: [
      {
        tokenId:
          '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
        amount: 200,
      },
    ],
    creationHeight: 1400000,
    additionalRegisters: {},
    transactionId:
      '5fcbdbf9d16458bc9f9f4b1308813153a1ec704eab5eb241a70fa86ab79eeecf',
    index: 0,
  },
];
export const ergoBoxes = rawBoxes.map((box) =>
  ErgoBox.from_json(JSON.stringify(box)),
);

export const box0Info: BoxInfo = {
  id: rawBoxes[0].boxId,
  assets: {
    nativeToken: 1000000000n,
    tokens: [
      {
        id: '962862f62ab4ad28cdc59cc321ea1dabd607178e49fcc817b1bbb997fb116375',
        value: 200n,
      },
    ],
  },
};

export const CHANGE_ADDRESS =
  '9fRAWhdxEsTcdb8PhGNrZfwqa65zfkuYHAMmkQLcic1gdLSV5vA';
export const HEIGHT = 1400000;
export const FEE = 1100000n;
export const TOKEN_ID = rawBoxes[0].assets[0].tokenId;
export const UNKNOWN_TOKEN_ID =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const MINTED_TOKEN_ID = rawBoxes[0].boxId;
