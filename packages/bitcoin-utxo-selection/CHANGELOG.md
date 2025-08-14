# @rosen-bridge/bitcoin-utxo-selection

## 1.1.3

### Patch Changes

- Re-export all types of `@rosen-bridge/abstract-box-selection` package
- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.3.0

## 1.1.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.2

## 1.1.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.1

## 1.1.0

### Minor Changes

- Additional asset balance no longer contains the estimated fee and the object returns the fee as a separate property

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.2.0

## 1.0.1

### Patch Changes

- Fix build-time generated filenames
- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.1.1

## 1.0.0

### Major Changes

- Change package structure

  - Replace `selectBitcoinUtxos` function with `BitcoinBoxSelection` class which inherits `AbstractBoxSelection`
  - The selection now supports custom min box value and max token count per box
  - The selection also supports a custom fee estimator function to consider fee changes based on the number of inputs and change boxes in the output
  - The selection also returns the additional assets alongside the boxes

### Minor Changes

- Update node version to 20.11

## 0.3.0

### Minor Changes

- General utxo selection to support different discount factors

## 0.2.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.1

## 0.2.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.0

## 0.2.0

### Minor Changes

- support async iterator in utxo selection
