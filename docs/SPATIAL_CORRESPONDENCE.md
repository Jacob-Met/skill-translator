# Propose point correspondence without rewriting original IDs

Relationship discovery previously required matching mark IDs across every original annotation. The optional `/spatial-correspondence` consumer accepts two native calibrated annotations with3–7points each and automatically enumerates complete bijections compatible with a declared physical pair-distance discrepancy bound. It is linked from Relationship discovery. The native MICROVERSE top-k unary assignment component was inspected; its cost-matrix/top-k contract does not represent all pairwise-compatible mappings and was not transplanted.

The search compares every pair of proposed corresponding points. It does not fit a scale change, normalize workpiece sizes, infer a single rigid transform under approximate bounds, or establish semantic identity. A different-sized workpiece can still contain the same physical point pattern; a scaled pattern is not silently admitted as the same fixed-distance pattern. Different point counts remain incomplete rather than generating a partial match. Symmetric patterns retain all compatible mappings. A point pair is forced only if every complete compatible bijection agrees on it.

The bounded search counts visited states. The default20000state limit covers the full3–7point permutation-prefix domain, but explicitly smaller budgets may stop early. An exhausted search returns `budget-unresolved`, no complete count and no forced/possible-match assertions. At most eight actual mapping witnesses are retained for inspection; a complete mapping count accounts for all compatible leaves. A partial search cannot be promoted merely because it has found one mapping.

## Semantic review and actual consumer

A unique complete geometric proposal can be reviewed once as representing the same task points. The reviewer does not enter each correspondence. This is a semantic premise, not an automatic identity result. The reviewed record retains both original annotations, every original local ID, the discrepancy/budget inputs, recomputable pairs and optional explicit source category. Geometric ambiguity cannot be turned into identity by checking the review box.

The action into Relationship discovery creates `skill-translator.relationship-discovery/v2`. Each mapped row retains its unchanged original annotation and the complete reviewed mapping record. The discovery core resolves reference IDs through that explicit map; it never renames stored marks. The visible diagrams and readings show original local IDs. Both geometric sources must exactly match the reviewed record, and reopening recomputes the entire mapping. Old v1 studies with a mapping payload refuse instead of ignoring the mapping. Existing same-ID v1 accounts remain unchanged.

Mapped sources immediately reach maintained pair discovery, competing response-family inference and the native reviewed-pair format. **Because the mapping was selected using pair-distance agreement, repeated distances are selection-conditioned and are not independent validation of an invariant.** The consumer exposes this limitation instead of counting correspondence selection as a separate observation. Semantic identity, task necessity, physical feasibility and learning benefit remain distinct.

## Evidence

Native controls include a shuffled/rotated/translated asymmetric pattern, a square with eight mappings and no forced pairs, changed geometry, scaled geometry, mismatched counts, budget refusal, exact source/pair custody, downgrade and hidden-renaming refusal. A separate full-permutation oracle checks24unfamiliar small patterns. Consumer tests preserve original local IDs through discovery/v2, family ambiguity and native pair export/reopen.

The sandboxed-browser course receives unfamiliar four-point original files with distinct IDs, reaches native discovery and competing families, inspects actual mapped diagrams, saves/reopens source-only evidence, and checks symmetric/budget/scale negatives plus fresh390pxkeyboard use. These are authored geometry/software controls, not automatic pixel perception, observed semantic-identity accuracy or a physical skill study.

## Current-base receiving

Received on main `10b42686967495614ffd7789ef34f18aec6fa4a2` with the existing rule-proposal, path-axis, path-timing and strict browser-admission changes retained. Root ran all 55 affected native tests and the six-group actual browser course through original intake, semantic review, discovery/v2, family inference, raw reopen and fresh narrow keyboard use. Gauge independently reviewed the core, original-source custody and integration, ran 17 relevant controls, and found no blocking findings. Root inspected the actual desktop and narrow renders. All browser product navigation followed successful admission by the unchanged maintained Chromium sandbox helper. These receiving checks do not establish real-world semantic identity or skill transfer.
