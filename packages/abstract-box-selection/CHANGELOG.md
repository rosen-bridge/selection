# @rosen-bridge/abstract-box-selection

## 1.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.0
  - @rosen-bridge/selection-types@1.0.0

## 0.4.0

### Minor Changes

- Add `uncoveredAssets` field to `getCoveringBoxes` returning object when boxes cannot cover the required assets

### Patch Changes

- Update dependencies
  - @rosen-bridge/selection-types@0.2.0

## 0.3.0

### Minor Changes

- Add a new argument to `AbstractBoxSelection.getCoveringBoxes` that enables custom filters for boxes

### Patch Changes

- Re-export all types of `@rosen-bridge/abstract-box-selection` package

## 0.2.2

### Patch Changes

- Fix bug where selector returns wrong uncovered flag when additional assets is less than twice the fee plus minimum box value

## 0.2.1

### Patch Changes

- Fix calculation of change box count
- Fix bug where additional assets returning a token with zero amount

## 0.2.0

### Minor Changes

- Additional asset balance no longer contains the estimated fee and the object returns the fee as a separate property

## 0.1.1

### Patch Changes

- Fix build-time generated filenames
