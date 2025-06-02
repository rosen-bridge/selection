export interface BitcoinRunesUtxo {
  txId: string;
  index: number;
  value: bigint;
  runes: Array<BitcoinRunes>;
}

export interface BitcoinRunes {
  runeId: string;
  quantity: bigint;
}
