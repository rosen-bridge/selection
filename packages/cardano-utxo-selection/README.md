# @rosen-bridge/cardano-utxo-selection

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

A TypeScript package for selecting Cardano UTXOs to cover required amounts of assets, built on top of the abstract box selection framework.

## Installation

npm:

```sh
npm i @rosen-bridge/cardano-utxo-selection
```

yarn:

```sh
yarn add @rosen-bridge/cardano-utxo-selection
```

## Usage

Here's a basic example of how to use this package:

```typescript
import { CardanoBoxSelection } from '@rosen-bridge/cardano-utxo-selection';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

// Create the selection instance
const selector = new CardanoBoxSelection(new DummyLogger());

// Define required assets
const requiredAssets = {
  nativeToken: 100000000n, // 1 ADA
  tokens: [
    { id: 'policy1.token1', value: 100n },
    { id: 'policy2.token2', value: 200n },
  ],
};

// Define UTXOs
const utxos: CardanoUtxo[] = [
  {
    txHash: 'tx1',
    index: 0,
    value: 500000000n, // 5 ADA
    assets: [{ id: 'policy1.token1', value: 100n }],
  },
  {
    txHash: 'tx2',
    index: 0,
    value: 300000000n, // 3 ADA
    assets: [{ id: 'policy2.token2', value: 200n }],
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

You can also use custom min box value and limit number of tokens per change box by passing them as arguments to the `getCoveringBoxes` method.

```typescript
const result = await selector.getCoveringBoxes(
  requiredAssets,
  [], // forbidden box IDs
  new Map(), // track map
  boxes.values(),
  20000000n, // min box value
  3, // max token count
);
```
