# @rosen-bridge/abstract-box-selection

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

A Typescript package for general UTxO selection, providing an abstract base class for implementing box selection algorithms in blockchain systems.

## Installation

npm:

```sh
npm i @rosen-bridge/abstract-box-selection
```

yarn:

```sh
yarn add @rosen-bridge/abstract-box-selection
```

## Usage

Here's a basic example of how to use this package:

```typescript
import {
  AbstractBoxSelection,
  AssetBalance,
  TokenInfo,
} from '@rosen-bridge/abstract-box-selection';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

// Define your box type
interface MyBox {
  id: string;
  value: bigint;
  tokens: Array<TokenInfo>;
}

// Implement the abstract class
export class MyBoxSelection extends AbstractBoxSelection<MyBox> {
  constructor() {
    super(new DummyLogger());
  }

  getBoxInfo(box: MyBox): BoxInfo {
    return {
      id: box.id,
      assets: {
        nativeToken: box.value,
        tokens: box.tokens,
      },
    };
  }
}

// Usage example
const selector = new MyBoxSelection();

const requiredAssets: AssetBalance = {
  nativeToken: 1000000n,
  tokens: [
    { id: 'token1', value: 100n },
    { id: 'token2', value: 200n },
  ],
};

const forbiddenBoxIds = ['box1', 'box2'];
const trackMap = new Map<string, MyBox>();
const boxes: MyBox[] = [
  // ... your boxes
];

const result = await selector.getCoveringBoxes(
  requiredAssets,
  forbiddenBoxIds,
  trackMap,
  boxes.values(),
);

if (result.covered) {
  console.log('Selected boxes:', result.boxes);
  console.log('Additional assets:', result.additionalAssets);
} else {
  console.log('Could not cover requirements');
}
```

The package provides a flexible foundation for implementing specific selection strategies while handling common concerns like:

- Asset balance tracking
- Box selection with constraints
- Fee estimation
- Token aggregation
- Change box creation
- Logger integration

You can extend the `AbstractBoxSelection` class to implement your specific selection strategy while leveraging the built-in functionality for common operations.
