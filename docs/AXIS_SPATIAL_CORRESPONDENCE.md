# Infer unequal reference-axis magnitudes and point correspondence

Issue #337 extends the maintained source correspondence page and relationship consumer. A user supplies two original calibrated annotations with three to seven points, which may use different IDs and ordering. Fresh input infers positive horizontal and vertical stretch magnitudes jointly with every admissible point bijection. Neither scales nor point pairs need expert entry. A semantic confirmation remains necessary before using a unique geometric proposal as task correspondence.

## Evidence and completeness

The explicit `skill-translator.spatial-correspondence/v3` model is `independent-reference-axis-magnitudes`. Squared reference-axis magnitudes X and Y obey every pair's distance constraints. Those are linear half-planes in X,Y; the implementation reuses the unchanged CHRONOS rational clipping kernel already vendored in this repository. Its source pin is documented in `vendor/chronos/source-lock.json` and `README.md`. No additional polygon engine is introduced.

Binary64 source coordinates are represented as exact rationals. Square-root distances receive verified outward rational bounds. Outer constraints retain all potentially compatible mappings; tighter inner constraints provide conservative feasibility witnesses. An outer mapping without an inner witness remains possible, but cannot by itself authorize review. A sole such candidate is `boundary-unresolved`, with no forced pairs. The independent floating LP fixture is a crosscheck, not the foundation for completeness claims.

The complete mapping population is enumerated under explicit finite state and exact-constraint budgets. Eight displayed witnesses do not truncate the population used for counts and forced pairs. State exhaustion removes the complete count and forced pairs. Constraint-budget or unsupported numeric-resolution failure refuses the new result entirely. No partial result becomes certainty.

For two observed reference axes, support is a full correlated polygon in squared magnitudes. Marginal horizontal and vertical ranges cannot be freely combined. The inner centroid is a feasibility witness only, not a fitted or preferred scale. Positivity and data-derived caps replace arbitrary user scale bounds.

Straight reference patterns retain a one-dimensional exact interval on the observed axis and an explicitly unbounded positive unused axis. Coincident patterns leave both axes unbounded and preserve all mappings. Neither case invents an estimated scale on an unobserved dimension. Seven coincident points retain all 5,040 permutations.

The declared discrepancy is measured in observation millimetres; the separately disclosed 1e-9 mm computational slack is not an execution tolerance. The model infers no signs, orientation, semantic identity, calibration correction, physical accuracy, or certified coordinate transform. Reflected sources may have compatible distance support while their signed horizontal relationships contradict positive width-proportional rules.

## Maintained use and custody

`skill-translator.reviewed-spatial-mapping/v3` retains both full original annotations, original IDs, the explicit source category, the reviewed complete mapping and exact joint support. Reopening recomputes all evidence and rejects support, pair or source changes. Old fixed-distance v1 and common-scale v2 studies retain their original models; they are not silently upgraded.

The existing review action sends this evidence to relationship discovery, then to fixed/proportional relationship families and the actual Practice comparison. Original observations are never normalized or renamed. Distances used to select correspondence remain selection-conditioned evidence, not independent validation of a response rule. The native consumer preserves actual placements and point scores; a fresh family comparison does not invent attempts.

## Browser computation

A module worker performs inspection, raw/reviewed reopening, reviewed export and discovery handoff. Source and discrepancy changes terminate pending work and advance a revision. Results are adopted only for the matching revision. Heavy exact clipping therefore does not block input or animation. Worker failure refuses new admission and retains accepted source work; there is no synchronous inference fallback. Semantic review is unavailable while work is pending or after inputs retire its result.

## Receiving

Run native tests with actual subtest execution:

```
node --test --test-isolation=none test/axis-distance-support.test.mjs test/axis-spatial-correspondence.test.mjs test/spatial-correspondence.test.mjs test/scaled-spatial-correspondence.test.mjs test/mapped-relationship-discovery.test.mjs test/relationship-family-review.test.mjs
```

The focused course covers exact norm bounds, signed/rotated inputs, twelve unfamiliar LP comparison cases, joint polygon correlation, complete symmetry, collinear domains, budget refusal, numerical boundaries, model broadening that destroys uniqueness, tamper protection and actual Practice custody.

`tools/browser-axis-spatial-correspondence.mjs` receives unfamiliar uploaded originals through the actual page, semantic review, discovery, width-family prediction and original actual placements. It also checks ambiguity, boundary refusal, unbounded unused axes, worker responsiveness, cancellation and stale-reply rejection, unavailable-worker refusal, fresh reopening and narrow keyboard use. Existing fixed/common-scale browser courses remain relevant. All use the existing strict Chromium sandbox preflight before product navigation and default to the direct installed binary. Browser results and screenshots are separate receipts; source inspection alone does not qualify them.
