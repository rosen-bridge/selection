---
'@rosen-bridge/cardano-utxo-selection': major
---

Change package structure

- Replace `selectCardanoUtxos` function with `CardanoBoxSelection` class which inherits `AbstractBoxSelection`
- The selection now supports custom min box value and max token count per box
- The selection also supports a custom fee estimator function to consider fee changes based on the number of inputs and change boxes in the output
- The selection also returns the additional assets alongside the boxes
