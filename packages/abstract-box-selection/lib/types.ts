export interface CoveringBoxes<BoxType> {
  covered: boolean;
  boxes: Array<BoxType>;
}

export interface TokenInfo {
  id: string;
  value: bigint;
}

export interface AssetBalance {
  nativeToken: bigint;
  tokens: Array<TokenInfo>;
}

export interface BoxInfo {
  id: string;
  assets: AssetBalance;
}
