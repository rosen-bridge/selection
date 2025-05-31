export interface CardanoAsset {
  policyId: string;
  assetName: string;
  quantity: bigint;
}

export interface CardanoUtxo {
  txId: string;
  index: number;
  address: string;
  value: bigint;
  assets: Array<CardanoAsset>;
}
