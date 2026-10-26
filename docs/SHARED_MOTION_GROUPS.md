# Shared motion groups from retained demonstrations

Open **Relationship Discovery** from the Demonstration Studio. Receive a saved
sequence with its original PNGs and calibrated point annotations, or the existing
cross-demonstration annotation account. The page now proposes multi-point groups
whose nominal geometry shares a fitted turn and translation. No group memberships
or object labels are supplied.

This extends the maintained original-source journey. It does not extract point
identities from pixels: the existing calibration and correspondence declarations
remain the inputs. The source viewer highlights each selected group in every
original frame, and the fit table exposes every source-pair comparison.

## What the calculation means

For each fully observed subset of at least two reference points, fit the existing
least-squares proper planar rotation and translation separately between **every
pair of supplied sources**. A subset passes only when every fitted point residual
is within the exploratory threshold plus the maintained 1e-9 mm numerical slack.
The page uses the same saved exploratory threshold as pair discovery, with its
different meaning stated beside the control.

Return all inclusion-maximal passing subsets. Overlap is retained, and no single
object partition is selected. A passing smaller set can be inspected in **every
tested point set** even when a larger passing set contains it.

The fit is the closed-form least-squares solution, not a minimax fit or a search
over every transformation satisfying a per-point bound. In particular, rejection
of that fit does not prove that every different rotation/translation violates the
bound. Maximum-residual admission is not hereditary across subsets; the
implementation deliberately evaluates every subset rather than pruning on an
unsuccessful smaller subset.

Original source and point IDs remain unchanged. Reviewed geometric mappings
carry their selection-conditioned warning: geometry used to select identities
cannot independently validate a proposed physical invariant. Missing points
remain explicit and are excluded from complete groups, without discarding their
original annotations. A collapsed or orientation-indeterminate fit is unresolved.
A nominal reflection can preserve every pair distance yet fail the whole
proper-motion fit; the remaining two-point alternatives remain visible.

The grouping calculation admits at most 12 fully observed reference points and
the existing 12-source limit. At 12 points there are 4,083 nontrivial subsets.
An over-capacity request refuses the whole grouping calculation while ordinary
pair discovery remains available. There is no shortlist or partial result
labeled complete.

Agreement concerns supplied nominal geometry. It is not evidence of physical
rigidity, object identity, contact, force, task necessity, continuous motion,
execution tolerance, or successful learning.

## Shared implementation

src/point-pattern-fit.mjs extracts the existing proper-rotation fit from
src/layout-feedback.mjs. The placement caller retains its original point
scores, residuals, on-sheet comparison and completeness condition. The new
src/shared-motion-groups.mjs consumes the existing admitted discovery account.
web/shared-motion-groups-view.mjs renders inside the maintained page and uses
the existing original-frame assets. Three explicit static routes serve the new
modules; server binding and CSP are unchanged.

Saving uses the existing complete discovery/sequence bundle. No derived group
verdict is trusted on reopening. The whole original source, declarations and
PNG bytes are retained and the groups recompute in a fresh browser page.

## Receiving

Native behavior:

    node --test test/shared-motion-groups.test.mjs test/layout-feedback.test.mjs test/relationship-discovery.test.mjs test/sequence-discovery.test.mjs

Independent numerical receiving (NumPy is used only by this oracle):

    node tools/receive-shared-motion-groups.mjs /tmp/shared-motion-cases.json
    python3 tools/verify-shared-motion-groups.py /tmp/shared-motion-cases.json

The frozen authored generator (seed 572387) produces 24 four-source courses with
independent group motion, small perturbations, deformations and reflections.
The separate NumPy SVD implementation checks all 1,368 subset classifications,
all maximal groups and retained residuals. Inputs and results are preserved in
docs/receipts/shared-motion-387/svd-cases.json. These are authored controls,
not physical accuracy measurements.

Actual browser receiving:

    PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/shared-motion-browser node tools/browser-shared-motion-groups.mjs

The course runs the maintained server and sandboxed Chrome. It opens three
original rendered PNGs through the ordinary sequence link, discovers two groups
from 57 possible point sets without group labels, inspects source highlights,
changes an original point and image, performs actual download and fresh-page
reopen, rejects a wrong PNG without replacing accepted work, checks over-capacity
fallback and threshold changes, and inspects 390-pixel keyboard access. The narrow
viewport is browser emulation, not a physical phone qualification.

During development, the first browser check exposed missing explicit server
routes for the new modules; those routes were added. The new receiver also needed
a fixture-variable correction and a CSP-compatible wait helper. The successful
course keeps the product CSP and Chromium sandbox enabled.

A first complete native run on the proposed tree passed 1,133 of 1,134 tests.
The one unavailable test was the existing calibration-draft test's missing
generated native-request/native-report fixture. The same failure was reproduced
on untouched main d546113f39188c2c7199e4e06b94b8a794f8c819. Its documented
OpenCV-native prerequisite is separate from this change; that run is not reported
as a completely passing suite. Final source and receiving pins are recorded on
the native PR and issue #387.
