---
'@rosen-bridge/ergo-box-selection': major
---

Change package structure

- Replace `selectErgoBoxes` function with `ErgoBoxSelection` class which inherits `AbstractBoxSelection`
- The selection now supports custom min box value and max token count per box
- The selection also returns the additional assets alongside the boxes
