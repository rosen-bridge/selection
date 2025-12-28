# @rosen-bridge/ergo-box-selection

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

A TypeScript package for selecting Ergo boxes to cover required amounts of assets, built on top of the abstract box selection framework.

## Installation

npm:

```sh
npm i @rosen-bridge/ergo-box-selection
```

yarn:

```sh
yarn add @rosen-bridge/ergo-box-selection
```

## Usage

Here's a basic example of how to use this package:

```typescript
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { ErgoBoxSelection } from '@rosen-bridge/ergo-box-selection';

// Create the selection instance
const selector = new ErgoBoxSelection(new DummyLogger());

// Define required assets
const requiredAssets = {
  nativeToken: 1000000000000n, // 1000 ERG
  tokens: [
    { id: 'token1', value: 100n },
    { id: 'token2', value: 200n },
  ],
};

// Define boxes
const boxes: ErgoBox[] = [
  {
    boxId: 'box1',
    value: 5000000000000n, // 5000 ERG
    tokens: [{ id: 'token1', value: 100n }],
    creationHeight: 100000,
  },
  {
    boxId: 'box2',
    value: 3000000000000n, // 3000 ERG
    tokens: [{ id: 'token2', value: 200n }],
    creationHeight: 100001,
  },
];

// Get covering boxes
const result = await selector.getCoveringBoxes(
  requiredAssets,
  [], // forbidden box IDs
  new Map(), // track map
  boxes.values(),
);

if (result.covered) {
  console.log('Selected boxes:', result.boxes);
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
  2000000n, // min box value
  3, // max token count
);
```

### Building Change Boxes

After selecting boxes, you can build one or more change boxes using `ErgoChangeBoxBuilder`. It accepts either a static change address or a function that provides fresh addresses, optional register values, and the asset breakdown returned by `getCoveringBoxes`.

```typescript
import {
  ErgoBoxSelection,
  ErgoChangeBoxBuilder,
} from '@rosen-bridge/ergo-box-selection';

const selection = new ErgoBoxSelection();
const covering = await selection.getCoveringBoxes(
  requiredAssets,
  forbiddenIds,
  new Map(),
  boxes.values(),
);

if (!covering.covered) throw new Error('Insufficient inputs');

const changeBoxes = ErgoChangeBoxBuilder.fromChangeAssets(
  () => nextChangeAddress(), // or a fixed base58 string
  covering.additionalAssets.list,
).build({ height });
```

Pass `registerValues` (array of `Constant`, ordered as R4, R5, ... R9) to apply the same register content to every produced change box.

Use `ErgoChangeBoxBuilder.fromBoxes(changeAddress, inputBoxes, outputBoxes, fee, burnTokens).build({ height })` when you want the builder to compute change from inputs/outputs. Pass `burnTokens` (an array of `{ id, value }` token entries) only in this mode.
