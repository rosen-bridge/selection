# @rosen-bridge/cardano-utxo-selection

## 3.0.2

### Patch Changes

- Remove dependency @rosen-bridge/abstract-logger@3.1.0

## 3.0.1

### Patch Changes

- Update dependencies and fix package-lock
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-box-selection@1.0.1
  - @rosen-bridge/selection-types@1.0.1

## 3.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.0
  - @rosen-bridge/abstract-box-selection@1.0.0
  - @rosen-bridge/selection-types@1.0.0

## 2.3.0

### Minor Changes

- Add optional `address` field into CardanoUtxo interface
- Add `uncoveredAssets` field to `getCoveringBoxes` returning object when boxes cannot cover the required assets

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.4.0
  - @rosen-bridge/selection-types@0.2.0

## 2.2.3

### Patch Changes

- Re-export all types of `@rosen-bridge/abstract-box-selection` package
- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.3.0

## 2.2.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.2

## 2.2.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.1

## 2.2.0

### Minor Changes

- Additional asset balance no longer contains the estimated fee and the object returns the fee as a separate property

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.0

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
