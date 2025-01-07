export interface TokenInfo {
  id: string;
  value: bigint;
}

export interface AssetBalance {
  nativeToken: bigint;
  tokens: Array<TokenInfo>;
}

export interface CoveringBoxes<BoxType> {
  covered: boolean;
  boxes: Array<BoxType>;
  additionalAssets: {
    aggregated: AssetBalance;
    list: Array<AssetBalance>;
  };
}

export interface BoxInfo {
  id: string;
  assets: AssetBalance;
}
