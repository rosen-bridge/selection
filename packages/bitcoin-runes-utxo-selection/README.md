# @rosen-bridge/bitcoin-runes-utxo-selection

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

A TypeScript package for selecting Bitcoin UTXOs to cover required amounts of BTC and Runes, built on top of the abstract box selection framework.

## Installation

npm:

```sh
npm i @rosen-bridge/bitcoin-runes-utxo-selection
```

yarn:

```sh
yarn add @rosen-bridge/bitcoin-runes-utxo-selection
```

## Usage

Here's a basic example of how to use this package:

```typescript
import { BitcoinRunesBoxSelection } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

// Create the selection instance
const selector = new BitcoinRunesBoxSelection(new DummyLogger());

// Define required assets
const requiredAssets = {
  nativeToken: 1000n, // 1000 satoshis
  tokens: [
    { id: 'rune1', value: 100n },
    { id: 'rune2', value: 200n },
  ],
};

// Define UTXOs with Runes
const utxos: BitcoinRunesUtxo[] = [
  {
    txId: 'tx1',
    index: 0,
    value: 5000n, // 5000 satoshis
    runes: [{ runeId: 'rune1', quantity: 100n }],
  },
  {
    txId: 'tx2',
    index: 0,
    value: 3000n, // 3000 satoshis
    runes: [{ runeId: 'rune2', quantity: 200n }],
  },
];

// Get covering boxes
const result = await selector.getCoveringBoxes(
  requiredAssets,
  [], // forbidden box IDs
  new Map(), // track map
  utxos.values(),
);

if (result.covered) {
  console.log('Selected UTXOs:', result.boxes);
  console.log('Additional assets:', result.additionalAssets);
} else {
  console.log('Could not cover requirements');
}
```

You can also use custom min box value and limit number of Runes per change box by passing them as arguments to the `getCoveringBoxes` method.

```typescript
const result = await selector.getCoveringBoxes(
  requiredAssets,
  [], // forbidden box IDs
  new Map(), // track map
  boxes.values(),
  546n, // min box value
  1, // max token count
);
```
