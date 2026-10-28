# Declared orientation and common translation

Relationship Discovery offers **Test one declared orientation** alongside its unchanged least-squares groups and practice reports. Open original demonstration inputs, choose two retained sources and 2–12 corresponding point IDs, declare a proper orientation, and explicitly test whether one translation puts every selected point within the investigation's declared deviation bound.

## Why this question is separate

With target x coordinates 0, 10, 20 mm and observed x coordinates 0, 10, 23 mm, all y coordinates zero, the maintained least-squares fit has translation 1 mm and maximum residual 2 mm. At a declared 1.6 mm bound, translation 1.5 mm nevertheless fits every point with residual 1.5 mm. The original least-squares result is correct for its stated objective. This inquiry supplies a separate exact feasibility certificate.

An admitted translation is a witness for the chosen orientation, selected points and selected source pair. A contradiction rules out only that fixed orientation. Another orientation can still work. The inquiry neither partitions points into physical objects nor establishes rigidity, cause, necessity or physical skill.

## Declaration and exact arithmetic

Cardinal presets declare 0°, 90°, 180° or 270°. Custom integer parameters a and b, each within ±1,000,000 and not both zero, define cosine (a² − b²)/(a² + b²) and sine 2ab/(a² + b²). These rational values obey cosine² + sine² = 1 exactly. They are an explicit user declaration, not a rounded least-squares angle.

For each calibrated point, subtract its exactly rotated source position from the destination position. The allowable translations form a closed disk around that difference, with radius equal to the original declared deviation. The common-disk kernel is extracted from the existing comparable-context inquiry and still uses the maintained pinned CHRONOS exact convex-quadratic primitive. Up to three nonnegative support weights yield a verified contradiction, or an exact translation is checked against every supplied disk. Incomplete work or arithmetic exhaustion returns unresolved, never a partial compatibility claim.

Exactness concerns the supplied binary64 calibrated coordinates and bounds, not physical calibration accuracy. No additional 1e-9 mm least-squares slack is added to this separate closed-disk question. The original group/spans/practice reports retain their existing policies.

## Receiving and original input custody

The calculation runs in its own bounded worker. Declaration and accepted-source changes retire pending work; Cancel is explicit. The comparison button remains keyboard-focusable while pending and ignores repeated activation. Results do not replace original measurements or fitted groups.

**Save inquiry and original inputs** retains the exact original discovery account, including original PNG frames when supplied, and the source/point/orientation declaration. It saves no derived verdict. **Reopen saved investigation** validates before replacing accepted inputs, restores the declaration and requires explicit recomputation. Existing **Save original inputs** remains unchanged.

## Executed checks and limits

The initial native stage passed the existing context and group tests plus the new inquiry controls. A separate original-versus-extracted context course compared complete outputs, including work counters, 150 independently checked disk pairs, closed tangency, zero radii, sixty-record families and exhausted budgets. The pinned vendor bytes are unchanged.

Actual fully sandboxed Chrome receiving used the repository's retained #387 original PNG bundle, then an explicitly authored analytic counterexample. It received original-source parity, source-only save and fresh-page narrow keyboard recomputation, invalid declaration refusal, orientation changes, delayed worker-load cancellation, and desktop/390px rendering. Original PNG custody is preserved; these authored frames do not establish physical motion or learning. Timing and screen-reader performance were not qualified.

```sh
node --test --test-isolation=none --test-reporter=tap test/context-consistency.test.mjs test/shared-motion-groups.test.mjs test/fixed-motion.test.mjs
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/sandbox-capable/chrome QA_OUTPUT=/new/output node tools/browser-fixed-motion.mjs
```

Run the browser course under an unprivileged account with a working native Chromium sandbox. ORIGINAL_BUNDLE can override the default repository fixture path. Full repository regression and deployment are not implied by these focused controls.
