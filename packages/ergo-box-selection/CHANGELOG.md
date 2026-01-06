# @rosen-bridge/ergo-box-selection

## 2.1.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@1.0.2

## 2.1.0

### Minor Changes

- Add change box builder that supports multiple AssetBalance and setting register values

### Patch Changes

- Remove dependency @rosen-bridge/abstract-logger@3.1.0

## 2.0.1

### Patch Changes

- Update dependencies and fix package-lock
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-box-selection@1.0.1
  - @rosen-bridge/selection-types@1.0.1

## 2.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.0
  - @rosen-bridge/abstract-box-selection@1.0.0
  - @rosen-bridge/selection-types@1.0.0

## 1.2.0

### Minor Changes

- Add `uncoveredAssets` field to `getCoveringBoxes` returning object when boxes cannot cover the required assets

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-box-selection@0.4.0
  - @rosen-bridge/selection-types@0.2.0

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

  - Replace `selectErgoBoxes` function with `ErgoBoxSelection` class which inherits `AbstractBoxSelection`
  - The selection now supports custom min box value and max token count per box
  - The selection also supports a custom fee estimator function to consider fee changes based on the number of inputs and change boxes in the output
  - The selection also returns the additional assets alongside the boxes

- Add `estimateFee` to `AbstractBoxSelection.getCoveringBoxes` arguments. It is a function that returns 1100000 by default and will be used while checking native token sufficiency

### Minor Changes

- Update node version to 20.11

## 0.5.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.1

## 0.5.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@2.0.0

## 0.5.0

### Minor Changes

- support async iterator in box selection
