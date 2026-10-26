# Frozen development experiment: midpoint requests for bounded image-shift search

Owner: retained HAMON team hamon-ae3ff9-20261026/root, SKILL TRANSLATOR #388. Frozen on 2026-10-26 before this new acquisition experiment. This is a development study on the already examined scissors source, not an independent held-back demonstration. The prior ten-sample study and its protocol remain unchanged.

Use the exact original Aerra Carnicom source, CC BY-SA 4.0, SHA256 `06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe`, 1,006,547 bytes. Attribution: https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm . License: https://creativecommons.org/licenses/by-sa/4.0/ . Keep original media outside repository commits. Use maintained source revision `ad218f4d4f390e1d817b132e4c06c45ab2d9628b` and its original presented-frame sampler and comparison modules. Do not substitute requested times for actual presentation times.

## Fixed policy

1. Load the original through `loadLocalVideo` and request the same ten evenly spaced instants, 0.1 through 9.1 seconds inclusive. Preserve every sample or explicit decoder failure, its actual presentation time, pixel hash and elapsed acquisition time.
2. Compare all nine adjacent pairs at both existing radii, 4 and 16, with the existing same-interior brightness adjustment and remaining-change regions. Select every parent for which at least one exact minimizing wide shift touches the finite search boundary. Ambiguous interior alternatives do not suppress a boundary witness. Missing pairs are unavailable, never a zero score.
3. Request each selected parent's requested-time midpoint once, in chronological order. One refinement round only, with no scoring-based selection among boundary parents. Reuse retained parent samples and fits. Form the final adjacent sequence, preserving failed/duplicate/out-of-order samples and all retired parent results. A two-frame maintained plan admits each nonuniform adjacent pair; comparison arithmetic is unchanged.
4. Independently reload the same original and request a uniform plan over the same endpoints with exactly `10 + selected parent count` samples. Retain every final interval and both radii.
5. No radius, sample dimensions, thresholds, region minimum, time range or score is tuned from this experiment. No positive result is asserted by the receiving script.

## Measures and limits

Report both sample requests and actual successful acquisitions. The policies match acquisition count; they do not match fitting work. With six refined parents, adaptive uses 16 sample requests, 15 final adjacent pairs and 21 evaluated pairs per radius, compared with 16 requests and 15 fits per radius for uniform. Report elapsed acquisition and fitting times as observed wall-clock costs, not a controlled performance benchmark.

For each radius, count compared, missing/duplicate/out-of-order, ambiguous and boundary-touching results. An interval is contained only when every retained minimizing shift lies strictly inside the search; this is a finite-search property, not motion accuracy. Report contained coverage using requested interval durations over the fixed nine-second span, and separately actual compared elapsed durations. Never let a missing interval disappear from the requested-time denominator. Report time-weighted same-support zero-shift and fitted residuals, exact support size, thresholded changed-pixel counts and every original interval result. Uniform/adaptive comparison at a given radius uses the same spatial support.

This study can establish whether this bounded policy improves finite-search containment at equal acquisition count on this known source. It cannot establish action, contact, cutting completion, object identity, camera motion or physical accuracy. More frequent samples can trivially reduce appearance difference; that alone is not a gain. Product integration requires independent controls and a held-back source before a general capability claim.
