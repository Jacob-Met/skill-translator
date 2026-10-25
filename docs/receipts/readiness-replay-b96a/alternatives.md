# Alternative completion methods (#270)

Base: `0335ae4c432e771058c464b146e87e21d921bc44` (merged multi-check authoring).

A teacher can explicitly declare alternative completion methods before freezing a new readiness journal. Each method names a nonempty subset of the step’s checks, a label, and a rationale. Every check in one method must pass; any complete method establishes the step’s own completion evidence. Prerequisites must still be complete. A shared check remains necessary in every method that includes it. No method is inferred from a successful attempt.

The optional `completionRoutes` declaration uses `skill-translator.task-readiness/v3`. Method identifiers and check membership are validated, all checks must be used, and duplicate methods with the same check set are refused. Version 1 and 2 journals retain their original conjunction semantics and output shape. A v3 declaration mislabeled as an older format is refused. Export contains source declarations and events, never trusted calculated satisfaction fields.

The authoring interface offers one to eight methods with stable identities and explicit membership. Turning the option off restores ordinary all-check completion for the new study. Imported frozen journals cannot be rewritten through this authoring form. Findings explain shared evidence, each method’s remaining evidence and observation sources. Existing missing-prerequisite, reassessment and hypothetical recheck consumers retain the method structure instead of presenting every alternative check as universally necessary.

Observation revisions retain the existing conservative invalidation rule: all descendant observations are cleared even if another method still succeeds. Earlier choices and their original evidence context remain in history. Geometric checks still use the maintained Practice reader and cannot be satisfied by a manual report. Other physical conditions remain explicitly reported evidence; these authored examples establish software behavior, not physical skill or equivalence between methods.

## Reproducible receiving

Native: `node --test test/readiness-alternatives.test.mjs test/task-readiness.test.mjs test/readiness-replay.test.mjs test/readiness-append.test.mjs test/readiness-multiple-checks.test.mjs`.

Six new named groups cover all 64 combinations of missing/pass/fail/unknown evidence for two overlapping methods; genuine geometric Practice session admission; route-specific prerequisite explanations; original judgments and downstream invalidation; reassessment/recheck source roundtrips; and malformed declarations, sparse arrays, format mismatch, forged derived fields and legacy behavior. All five test files pass locally.

Browser: `PUPPETEER_PATH=<installed puppeteer> CHROME_BINARY=<sandboxed Chrome> QA_OUTPUT=<receipt directory> node tools/browser-readiness-alternatives.mjs` from the complete checkout. The course authors methods with keyboard and 390px controls, obtains empty/failing/passing exports from the actual Practice page, shows that support is required for both methods, then uses reported jig evidence while geometric evidence remains missing. It saves/reopens source-only v3, rejects a format downgrade, preserves first judgments, and continues through actual reassessment/recheck pages. It records source hashes, runtime, screenshots and raw exported inputs. Browser execution is a receiving gate; no local browser pass is claimed here.

## Executed composed receiving — 2026-10-25

On current main `5f6392753322fd12ccf0cb3a818ef94fba2317ae` plus these 11 files, all 828 native tests passed under Node 22.23.4. Sandboxed Chrome 156 passed the actual alternatives browser course and the prior multi-check course. The new course used genuine empty, failed and passing Practice exports, authored both methods before freezing, kept shared support unknown until separately reported, accepted the alternate jig method while placement evidence remained unknown, preserved the original first judgment, reopened source-only output, and continued through the actual reassessment and recheck pages. Desktop, 390px authoring and 390px inquiry output were visually inspected.

Independent review enumerated all 256 evidence states of `(A AND B) OR (B AND C) OR D`, checked method-order invariance, empty shared intersections, conservative downstream retirement after an unused route changes, and mutation isolation. No learner-effect or physical-completion claim follows from these authored courses. Exact published/merged receiving is recorded on issue #270 and its pull request.
