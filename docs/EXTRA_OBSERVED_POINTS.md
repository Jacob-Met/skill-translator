# Keep extra observed landmarks when comparing demonstrations

The source-correspondence page now matches every reference landmark to a distinct observed landmark while retaining additional observed marks. A user can supply3–7 reference points and at least as many observation points, up to7. The user does not select a favorable subset or enter pair identities. A qualified unique result still needs review that the matched points represent the same physical task roles.

This is an explicit `skill-translator.spatial-correspondence/v4` model, `reference-complete-independent-axis-magnitudes`. Saved v1, v2 and v3 studies retain their original equal-count requirements and numerical models. Input order is never automatically reversed: the reference axes define the model. Fewer observed points cannot establish all reference roles and remain `missing-observation-roles`.

## Full population, full sources

The existing exact axis mechanism now has two explicit entry points: `exactAxisCandidates` enumerates complete bijections as before; `exactAxisInjections` permits additional observed points. Both use one private bounded enumerator and the same unchanged CHRONOS clipping kernel. Neither a separate polygon engine nor a ranked best-subset solver is introduced.

Each search depth assigns one reference point to an unused observation index. A mapping counts only after every reference point is assigned. All complete potential mappings contribute to count and forced-pair evidence, even when only eight witness mappings are displayed. A duplicate extra mark can destroy uniqueness. Coincident sources retain all210,840,2520,5040 or5040 injections for3,4,5,6 or7 reference points into7 observed points.

The same data-derived cap remains valid: a reference pair attaining an axis maximum must map to an observation pair whose upper squared distance is at most the maximum across all observed pairs. Additional observed marks may enlarge this cap but cannot exclude compatible mappings. With both counts at most7, the worst complete prefix tree is still13,700 states. Finite state/work refusal, numerical outer/inner bounds, conservative witnesses, unobserved-axis domains, and joint scale correlation remain as documented in `AXIS_SPATIAL_CORRESPONDENCE.md`.

For each displayed mapping, unmatched original observed IDs are shown explicitly. Complete results also retain IDs absent from every possible mapping. These are geometric coverage statements only: unmatched does not mean physically irrelevant. Missing observed reference roles are not invented. Extra marks are never deleted from raw annotations, diagrams or saved consumer evidence.

## Review and maintained use

The explicit reviewed v4 record includes the complete original sources, mapped IDs, exact axis support and unmatched observed IDs. Reopening recomputes all of these. Downgrades that hide extra-point evidence or edits to the unmatched list are rejected. Matching this record to a discovery source also requires exact full-source equality, including extra marks.

The existing relationship discovery and fixed/proportional family consumer resolves reference roles through reviewed pairs while keeping the complete observed annotation. It requires no new point selector. Actual Practice placement history and point scores remain unchanged; inferred family residuals are comparisons, not replacement criteria. Geometry-selected relationships remain selection-conditioned, not independent rule validation.

Fresh browser uploads use v4. Existing raw/reviewed formats reopen with their retained model. Computation remains in the revision-checked worker, including export and handoff; input retirement cancels it. The existing axis browser regression explicitly reopens v3 so its result remains a test of the original model.

## Receiving

`test/injective-spatial-correspondence.test.mjs` covers untouched extra sources, duplicate-role ambiguity, complete coincident populations, missing-role refusal, a found witness followed by state exhaustion, work refusal, old-format behavior, tamper protection, full family/actual Practice reopening and independent subset decomposition. The latter compares full injection populations with all equal-size observed subsets through the unchanged bijection entry point; it is a crosscheck, not a substitute for exact solver evidence.

`tools/browser-injective-spatial-correspondence.mjs` uses unfamiliar actual JSON uploads with five observed marks for four reference roles. It receives original IDs, visible unmatched evidence, semantic review, discovery, width-family prediction, unchanged partial actual Practice, fresh replay, duplicate/missing-role controls and worker/narrow-screen behavior. It uses the maintained strict sandbox preflight and direct installed Chrome binary. Browser execution and rendered inspection require their own receipts; passing native checks does not imply browser qualification.
