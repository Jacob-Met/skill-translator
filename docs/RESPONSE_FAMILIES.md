# Workpiece response families

Open `/response-family`, or choose **Investigate workpiece response** from Task Space. This investigation extends the five fixed geometric interpretations with a separately declared affine family. It never changes the original source rules or practice scores.

For a selected source mark at `(x0, y0)` on a `W0 × H0` workpiece, the proposed relationships are:

```
x(W,H) = x0 + a_x (W-W0) + b_x (H-H0)
y(W,H) = y0 + a_y (W-W0) + b_y (H-H0)
```

Each coefficient is restricted to the supplied `[-L, L]` domain, with `0.001 ≤ L ≤ 20`. These are assumptions about a model family, not inferred universal laws. Source calibration and the baseline marked position are conditioned on; their uncertainty is not estimated here. The baseline coordinates are the maintained derivation's binary64 normalized coordinates multiplied by its physical dimensions, rounded to binary64 before the response calculation.

## Evidence and exact support

Each additional demonstration retains its source label, authored/reported evidence class, workpiece dimensions, observed x/y and separately declared maximum x/y discrepancies. Coordinate bounds describe a rectangle. They are not a radial bound, a confidence interval or a claim about measurement quality.

For each output coordinate, each observation defines two half-planes in `(a,b)` space. The consumer intersects all of them with the declared coefficient square. It retains the complete convex polygon, including degenerate lines and points. x and y coefficients are independent; a complete model exists only when both polygons are nonempty. An empty polygon excludes this declared finite family, not all geometric explanations. The first contradictory row is the first prefix whose intersection is empty; it does not identify a uniquely erroneous observation.

The arithmetic and clipping implementation is reused from CHRONOS VISION's maintained exact-halfplanes module. It makes exact rational decisions about the supplied binary64 values and returns outward-enclosing numeric bounds. Coefficient polygons retain exact rational vertices; plotted coordinates are rounded for display. Capacity exhaustion refuses the calculation without returning partial support. At most60 observations are accepted.

The workpiece-variation rank concerns the two input directions only. Repeating one size does not identify the response. Varying width and height proportionally leaves a coupled line of explanations even if the observed positions are exact. Rank2 does not by itself imply precise coefficients: the coordinate bounds may still be wide.

## New target predictions

The prediction range is the minimum and maximum of the target's affine expression over every retained polygon vertex. It is not the result of independently combining coefficient marginal ranges, which would lose their coupling. The x/y target rectangle is attainable coordinate-wise because the model declares their coefficient pairs independent. It does not assert that every sequence of positions at several new sizes belongs to one common model; such a joint prospective challenge requires an additional intersection against the same frozen family.

No target clipping is performed. Predictions outside the sheet remain visible, because silently clipping would change the model. This family need not remain physically meaningful beyond the demonstrated sizes. There is no automatic rule adoption or target correction.

## Source-bound saved studies

Save retains the complete source, selected mark, coefficient domain, source-bound original observations and target dimensions. Reopening validates before replacing accepted state and recomputes the entire family. Saved derived verdicts are ignored. Invalid or mismatched imports preserve the previous account; a delayed import cannot overwrite newer accepted state or edits. The source binding reuses maintained `observationReference` and includes calibration dimensions/corners, media identity when supplied, provenance, selected mark identity and source pixel location.

Changing source or selected mark starts a new observation ledger. Edited model settings disable saving and hide stale coefficient plots until recomputed. No source or observation is uploaded.

## Authored controls and verification

The example uses a100×80mm source with mark `(20,30)`. Two declared observations are `(45,50)` at200×80mm and `(60,70)` at100×160mm. Exact readings identify coefficients `(0.25,0.5)` for x and `(0.2,0.5)` for y, predicting `(85,90)` at200×160mm. The browser example assigns1mm coordinate bounds, producing x83–87mm and y88–92mm instead of claiming one exact explanation.

Run `node test/response-family.test.mjs` for focused native controls. `tools/browser-response-family.mjs` exercises the actual served consumer, real file download/reopen, rejection rollback, delayed reads and fresh390px keyboard use with an existing Puppeteer/Chrome installation. Set `PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT` for that environment. The presence of these scripts is not an executed receipt.

These are authored analytic controls. No real physical demonstration, learning effect, force/contact inference, provider execution or deployment is qualified by them.

## Received integration

The composed candidate preserves current main `05525d4badf6aaeeab1c9647b10f479106d773ca` and its prerequisite rehearsal. All 284 native tests passed, including the exact published dependency pin. Ten real browser groups passed with namespace/seccomp sandbox: authored mixed response, dirty-setting invalidation, actual download, raw reopen, source mismatch, empty support, removal, stale file read and fresh 390px keyboard/layout. The enlarged coefficient labels were re-received in the browser. Parent and independent MICROVERSE review found no blocker.

[Machine receipt](receipts/response-family-20261024/acceptance.json), [desktop view](receipts/response-family-20261024/desktop.png) and [390px view](receipts/response-family-20261024/mobile.png) record this authored geometry receiving. The figures are annotation geometry, not observed source pixels or measured physical learning.
