# @rosen-bridge/bitcoin-utxo-selection

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

A TypeScript package for selecting Bitcoin UTXOs to cover required amounts of BTC and fees, built on top of the abstract box selection framework.

## Installation

npm:

```sh
npm i @rosen-bridge/bitcoin-utxo-selection
```

yarn:

```sh
yarn add @rosen-bridge/bitcoin-utxo-selection
```

## Usage

Here's a basic example of how to use this package:

```typescript
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { BitcoinBoxSelection } from '@rosen-bridge/bitcoin-utxo-selection';

// Create a fee estimator
// An example fee estimator for a transaction with only native-segwit inputs and outputs and 3 fee ratio
const feeEstimator = BitcoinBoxSelection.generateFeeEstimator(
  1, // additional output count
  42, // tx base weight
  272, // input weight unit
  124, // output weight unit
  3, // fee ratio (in satoshis per byte)
  4, // discount factor
);

// Create the selection instance
const selector = new BitcoinBoxSelection(new DummyLogger());

// Define required assets
const requiredAssets = {
  nativeToken: 6000000n, // 0.06 BTC
  tokens: [],
};

// Define UTXOs
const utxos: BitcoinUtxo[] = [
  { txId: 'tx1', index: 0, value: 5000000 }, // 0.05 BTC
  { txId: 'tx2', index: 0, value: 3000000 }, // 0.03 BTC
  { txId: 'tx3', index: 0, value: 2000000 }, // 0.02 BTC
];

// Get covering boxes
const result = await selector.getCoveringBoxes(
  requiredAssets,
  [], // forbidden box IDs
  new Map(), // track map
  utxos.values(),
  294n, // min box value
  undefined, // max token count (does not matter on Bitcoin, but still cannot be 0)
  feeEstimator,
);

if (result.covered) {
  console.log('Selected UTXOs:', result.boxes);
  console.log('Additional assets:', result.additionalAssets);
} else {
  console.log('Could not cover requirements');
}
```
