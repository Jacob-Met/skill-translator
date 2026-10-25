# Euclidean distance across both photo-annotation regions

In **Pair regions** (`/directed-pair-region`), open a saved learner-observation
notebook or an existing pair-region notebook. Choose two retained annotations,
select **Euclidean distance**, declare an allowed difference in millimetres,
and supply each annotation's horizontal and vertical pixel half widths.
Choose **Inspect complete pair regions** before reading findings or saving.

This extends the existing photo-region workflow. Pair the exact original
PNG/JPEG to see both declared rectangles over the retained pixels. Image
identity, calibration, raw annotations and original practice history remain
unchanged. The distance option does not select a correction or apply anything
to practice. Horizontal remains the default criterion.

## What the distance result means

The receiver considers every combination of points from the two independently
declared regions, mapped under the retained calibration. It reports the minimum
and maximum Euclidean separation and attaining endpoint pairs. Point, segment
and convex area regions are supported, including overlapping or touching
regions whose minimum separation is zero.

For example, under an identity calibration, annotations at (20,30) and (40,50)
with independent ±0.4 pixel rectangles have a nominal separation of about
28.2843 mm. Their possible distance ranges approximately from 27.1529 to 29.4156 mm.
Both directed coordinate separations remain within ±1 mm of their 20 mm
references, but the complete distance range does not stay within ±1 mm of the
nominal distance. The distance finding is unresolved. These are authored
mathematical controls, not acquired measurement or skill validation.

The original nominal pair score and individual point assessments remain
separate. Distance alone cannot establish orientation: reversing a pair can
preserve its distance while violating a directed separation criterion.

## Exact squared comparisons and numerical allowance

The bounded geometry uses the existing pinned CHRONOS rational-arithmetic
module. It retains exact squared extrema and rational witness coordinates for
the **supplied mapped binary64 vertices**. This does not make the source pixels,
projective calibration or physical measurements exact.

The reference comes from the maintained relationship evaluator. Reference,
authored tolerance and the sum of both inherited mapping numerical guards are
combined using rational arithmetic. Verdicts compare squared rational
thresholds with exact squared extrema; approximate square roots never determine
status. A disclosure preserves the exact squared values and rational witnesses.
Displayed distance roots and witness decimals are explicitly approximate.

- **All-within:** the complete nonzero-region distance interval is strictly
  inside the authored criterion after applying the numerical allowance.
- **All-outside:** the complete interval is strictly separated from that
  criterion after applying the allowance.
- **Unresolved:** the interval crosses the criterion or meets its guarded
  boundary, including equality and near-boundary cases.

When both regions are points, the maintained nominal criterion and its existing
roundoff semantics are preserved exactly. The numerical allowance is not a
measurement-confidence interval or a certified calibration-error bound.

## Admission, limits and source custody

The existing photo mapper continues to admit the complete regions. Regions
outside the image or workpiece, perspective poles and numerically unsupported
thin areas are refused without clipping. Area vertices must be strictly convex
and ordered; degenerate regions use explicit point or segment forms.

Each region has at most four vertices. The complete finite vertex/edge
calculation uses the inherited 4096-bit rational-arithmetic capacity limit;
capacity failure does not produce a partial conclusion. Correlated annotation
errors, distortion, calibration uncertainty, physical accuracy and acquired
skill remain outside this independent-region model.

Save the complete raw notebook to retain the setup, original observation,
criterion and two rectangle declarations. Derived findings are recomputed on
reopening. Pair the original image again for pixel inspection. Draft changes
hide stale findings; invalid or superseded imports preserve accepted work.

The existing `skill-translator-directed-pair-region/v1` raw contract remains
source-bound with an explicit `rule.kind`. Existing `horizontal` and `vertical`
notebooks retain their meaning and calculations. `distance` is an explicitly
selected new kind; it is never inferred from an older notebook. Older versions
reject that unsupported kind rather than reinterpreting it. Saved derived
verdicts are ignored for every kind. Criteria may be exploratory and selected
after seeing outcomes; the editable notebook does not authenticate their timing.

## Reproduce the checks

```sh
node test/distance-pair-region.test.mjs
```

The five native groups cover the diagonal counterexample, raw replay, threshold
equality and allowance, zero-region parity, overlap/touch/degenerate geometry,
ordered admission, exact interior-projection witnesses, and existing directed
raw-notebook compatibility.

With the existing browser dependencies and a sandbox-capable Chrome binary:

```sh
PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/tmp/distance-pair-region-receiving \
node tools/browser-distance-pair-region.mjs
```

The browser course exercises the maintained observation download and actual
receiver link, original-image pairing, native file download/reopen, tamper and
delayed-read refusal, external styling and 390px layout. Its execution is a
separate qualification from passing native tests; neither establishes physical
measurement accuracy or skill transfer.
