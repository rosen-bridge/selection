# @rosen-bridge/ergo-box-selection

## 1.0.0

### Major Changes

- Change package structure

  - Replace `selectErgoBoxes` function with `ErgoBoxSelection` class which inherits `AbstractBoxSelection`
  - The selection now supports custom min box value and max token count per box
  - The selection also returns the additional assets alongside the boxes

- Add `estimateFee` to `AbstractBoxSelection.getCoveringBoxes` arguments. It is a function that returns 1100000 by default and will be used while checking native token sufficiency

### Minor Changes

- Update node version to 20.11

### Patch Changes

- Updated dependencies
  - @rosen-bridge/abstract-box-selection@0.2.0

## 0.5.2

### Patch Changes

- Updated dependencies
  - @rosen-bridge/abstract-logger@2.0.1

## 0.5.1

### Patch Changes

- Updated dependencies
  - @rosen-bridge/abstract-logger@2.0.0

## 0.5.0

### Minor Changes

- support async iterator in box selection
