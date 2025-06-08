# @rosen-bridge/cardano-utxo-selection

## 2.1.0

### Minor Changes

- Remove `address` field from `CardanoUtxo` interface

## 2.0.1

### Patch Changes

- Fix build-time generated filenames
- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.1.1

## 2.0.0

### Major Changes

- Change package structure

  - Replace `selectCardanoUtxos` function with `CardanoBoxSelection` class which inherits `AbstractBoxSelection`
  - The selection now supports custom min box value and max token count per box
  - The selection also supports a custom fee estimator function to consider fee changes based on the number of inputs and change boxes in the output
  - The selection also returns the additional assets alongside the boxes

### Minor Changes

- Update node version to 20.11

## 1.1.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.1

## 1.1.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.0

## 1.1.0

### Minor Changes

- support async iterator in utxo selection
