# Infer common scale and correspondence together

The maintained `/spatial-correspondence` journey now proposes original point
correspondences when a demonstrated pattern has changed scale. Two native
calibrated annotations supply the geometry. The user does not enter a scale,
matching point list, or selected response family. Each original annotation and
its local point IDs remain unchanged through discovery and family comparison.

## Model and complete search

Fresh proposals use `skill-translator.spatial-correspondence/v2` with explicit
model `common-positive-pair-distance-scale`. For each complete bijection of
3–7 points, the solver intersects the positive scale intervals imposed by every
pair:

`abs(scale * referenceDistanceMm - observationDistanceMm) <= deviationMm + 1e-9`.

The discrepancy is in observation-source millimetres. The separate `1e-9 mm`
numerical slack is disclosed in the result; the supplied discrepancy is not
replaced or presented as a learned tolerance. Zero reference distances impose
only the corresponding target-distance bound. An upper endpoint of `null`
means unbounded, and a lower endpoint of zero is open. Neither case is displayed
as an identified scale. Nonfinite calculated pair bounds refuse the whole
operation; overflow of a finite mathematical bound is never labeled unbounded.
Only an absence of nonzero reference pair distances leaves a true unbounded
scale interval.

Intervals are intersected while exploring permutation prefixes. Only already
incompatible prefixes are pruned. Every completed mapping contributes to the
complete count, possible matches and forced pairs, although at most eight
witnesses and their scale intervals are displayed. A finite search budget
returns unresolved, even after finding a witness. Different point counts
remain incomplete. No nearest mapping, preferred scale, ranking or best-fit
selection turns a broader set of hypotheses into certainty.

Fixed scale 1 is a member of this model where compatible. A retained control
has a unique fixed-distance mapping but two common-scale mappings: uniqueness
must be recomputed after broadening the model. Symmetric scaled squares keep
eight alternatives. Seven coincident points keep all 5,040 bijections and do
not constrain scale. The default 20,000-state budget covers the complete
seven-point permutation-prefix domain (13,700 states).

These intervals describe a pair-distance compatibility model, not a certified
similarity transform, workpiece-size response, semantic identity, calibration
correction, or physical skill rule. Pair-distance evidence used to select a
correspondence is not independent validation of a fixed or proportional rule.

## Review, retained sources and existing consumers

Only a unique, complete mapping can receive the existing semantic review.
Reviewed v2 records retain the complete raw study, original-ID pairs and scale
interval. Reopening recomputes all alternatives and checks both pairs and scale
bounds. Changing the format to hide scale provenance refuses. Existing v1 raw
and reviewed fixed-distance records keep their original interpretation; a saved
v1 scaled-pattern failure remains a failure.

The existing discovery/v2 importer resolves reviewed IDs into the original
source geometry. It does not normalize annotations or replace them with
rescaled points. The family consumer therefore sees the actual observed
distances, tests all four maintained response hypotheses, and preserves
selection-conditioning limitations. A fresh hypothetical family comparison
retains `session: null`; it does not invent learner observations.

## Receiving

`node test/scaled-spatial-correspondence.test.mjs` covers new native scaled
sources, broader-model ambiguity, all-coincident and symmetric cases, distorted
and missing evidence, incomplete search, disclosed numeric slack, provenance
tampering, 36 independent full-permutation controls, and the maintained
discovery → width-proportional family → raw family-review replay.

`node tools/browser-scaled-spatial-correspondence.mjs` receives unfamiliar
original annotation files, requires semantic review, displays inferred scale,
opens the maintained discovery/family consumers, downloads and freshly reopens
source-only evidence, and exercises symmetry, budget, changed geometry,
broadened-model ambiguity and v1 compatibility. It includes desktop and 390px
keyboard receiving and requires active Chromium sandbox protection before
product navigation. Execution receipts distinguish completed browser checks
from this callable receiving course.

These are authored geometry and software controls. Automatic pixel detection,
physical semantic-identity accuracy and measured learning benefit are not
established.

## Integrated receiving on current source

Root composed the seven-path candidate with current main `72ff5841bb9affa2a6c848d57bf8eb1887135d5d`, including the concurrent demonstration-practice, sampled-return and calibration-draft routes and native server import. All 63 affected native tests passed. Both actual browser journeys passed with the unchanged strict sandbox preflight: six fixed-correspondence groups and seven inferred-scale groups. Desktop, family and 390px screenshots were visually inspected. Forge independently reviewed all seven paths and ran 22 focused groups after the finite-bound-overflow repair, finding no blockers.

The first scaled browser receiver expected contradicted original pairs under the default Repeatable filter, which correctly hid them. That receiving failure was retained; the harness now explicitly selects All before inspecting original IDs. Product inference was not changed to satisfy that expectation. These are authored software/geometry controls, not a physical identity or learner-outcome qualification.
