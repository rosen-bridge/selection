export interface CardanoAsset {
  policyId: string;
  assetName: string;
  quantity: bigint;
}

export interface CardanoUtxo {
  txId: string;
  index: number;
  value: bigint;
  assets: Array<CardanoAsset>;
}
