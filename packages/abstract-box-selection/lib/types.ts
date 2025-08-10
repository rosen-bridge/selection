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
    fee: bigint;
  };
}

export interface BoxInfo {
  id: string;
  assets: AssetBalance;
}

export type FeeEstimator<BoxType> = (
  selectedBoxes: Array<BoxType>,
  changeBoxesCount: number,
) => bigint;

export type FilterFunction<BoxType> = (box: BoxType) => boolean;
