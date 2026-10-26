# Infer a circular reference from retained motion

Open **Sampled path** with a saved source account and its original PNG frames.
After inspecting the declared correspondence, select **Infer circular reference
from samples**. The workbench derives a candidate center and radius from the
existing calibrated points. No extra center annotation, radius or guide endpoints
are required. Every point remains visible beside its original frame and original
presented time.

The dashed amber circle is an inferred reference, not an observed trajectory.
Only its portions within the declared calibrated sheet are drawn. Green rings
mark the original annotations. Inspect the radial residuals and the changes in
center when individual observations are withheld. A resolved candidate can still
be a poor description: elliptical samples, displaced observations and calibration
errors do not become physical circular motion because a fit exists.

## Mechanism and limits

The existing sampled-path admission supplies all coordinates. They retain their
source identities, supplied calibrations, reference declaration, explicit point
correspondence and missing observations. Known coordinates are centered and scaled
before the maintained MATERIALTRUTH three-column Householder QR solves

`2*x*cx + 2*y*cy + c = x*x + y*y`.

The fitted radius is `sqrt(c + cx*cx + cy*cy)`, transformed back to millimetres.
This minimizes algebraic squared-distance-equation error. It does **not** minimize
radial distance error. The separate radial residual of each point is its distance
from the candidate center minus the candidate radius. Positive values are outside
the circle. No outlier is removed or downweighted.

At least four observed points are required. Coincident points, rank-deficient
fits and nonfinite results are refused. The shortest circular arc containing all
fitted point angles must cover at least 90 degrees; a smaller span returns an
insufficient-support finding without a usable center or radius. This is an
explicit support policy, not a calibrated confidence bound. It cannot guarantee
that a noisy arc's inferred center is correct. The fit remains a proposal even
when all checks pass.

Each leave-one-out check repeats the same fit with one observed point removed,
then measures that excluded point's radial residual and the change in fitted
center. A check needs three noncollinear remaining points and the same angular
support. Missing or insufficient checks remain unresolved; they never contribute
a zero residual. These checks reuse one demonstration and are not independent
evidence of physical accuracy.

All known points contribute to descriptive shape fitting, including points on
both sides of a missing observation. This does not connect those observations as
an observed motion interval. No motion between samples, physical rotation axis,
contact, intent, task invariant, uncertainty bound or learning score is inferred.

## Source lifecycle

The proposal is temporary. Saving uses the existing complete source-only sampled
path bundle, including every original PNG. Reopening validates that source and
recomputes the proposal on request. Changes to accepted source or correspondence
retire the old circle. Failed source admission preserves the previously accepted
evidence. Injected saved circle coordinates have no authority.

## Verification

Run `node test/path-circle.test.mjs` for named native cases. The controls include
twenty unfamiliar exact circles, a symmetric unequal-radius algebraic oracle,
an ellipse and radial outlier, short/noisy arcs, collinear/coincident points,
leave-one-out loss of support, missing observations, fabricated derived state and
source mismatch. These authored inputs establish software behavior; actual
physical circularity and learning benefit remain unverified.

## Composed receiving

This composition includes the current demonstration-practice routes and passes28
affected native groups plus8 real Chromium groups at desktop and390px. Source
image hashes, actual image decode, source-only download/fresh reopening, invalid
source retention, missing samples, keyboard use and short-arc/ellipse negatives
are exercised by tools/browser-path-circle.mjs. Use PLAYWRIGHT_PATH for the
installed Playwright package, CHROME_BINARY for Chrome, and RECEIPT_DIR for output.
The exact maintained QR supplier is pinned in vendor/materialtruth/source.json.
The receipt and inspected views are in receipts/path-circle-20261026.
