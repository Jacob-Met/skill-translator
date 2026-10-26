# Test inferred references against another demonstration

Open two complete sampled-path accounts in **Compare demonstrated paths**, with
their original PNG frames. Declare the existing common point and coordinate
meanings, compare the ordered samples, then select **Inspect both references on
the second source**.

The first demonstration alone supplies a straight-axis hypothesis and a circular
reference hypothesis. The second demonstration tests those unchanged references.
No additional guide endpoints, center, radius, physical tolerance or desired answer
is requested. The existing straight-only inspector remains available.

Every selected second-source point appears once in the new reading, with its
original presented time and signed perpendicular/radial residual. The ordered
pairing can repeat points; those repetitions do not add weight to these reference
checks. Select **Inspect original target frame** to show that original PNG in the
existing paired-source viewer. Amber straight segments and violet circular arcs
are projected from the first-source fits through each frame's supplied calibration.
They are hypotheses, not observed intervening motion.

## What is reused

`inspectPathReferencePrediction` calls the maintained `inspectPathAxisPrediction`
and `inspectPathCircle` mechanisms. It preserves the existing complete-path,
equal-dimension and explicit common-coordinate admission. Circle projection is
shared with the original sampled-path circle inspector, including its bounded
sheet projection and 128-segment drawing approximation.

The second source never changes either center, direction, radius or support
decision. A short first-source arc remains unsupported even if the second source
contains a complete circle. An unresolved straight direction remains unresolved
even if later points would define one. Reversing the source order intentionally
asks a different question.

## Reading the result

Each reference retains its own support status and sample count. A shared count
identifies the population available to both. Unsupported references have no RMS
value; they do not receive zero error. Axis residual sign follows the fitted
direction convention; positive circle residuals lie outside the proposed radius.

The two RMS values describe proximity to different geometric sets. Neither one
is a physical accuracy estimate or model probability. Agreement does not establish
matching traversal order, extent, timing or contact. A lower residual does not
identify the expert's guide: an unrelated target can give both large residuals
while one is smaller, and a stationary target at an intersection can agree with
both references. The product therefore supplies no automatic winner, pass verdict
or correction. Shared calibration, declared correspondence and measurement errors
remain possible explanations.

Saving uses the unchanged source-only comparison bundle and keeps both complete
original PNG populations. Reopening recomputes the optional reading; injected
derived findings have no authority. Accepted source or declaration changes retire
the optional reading and overlays. Failed source admission preserves the previous
accepted evidence. Changing only the displayed ordered pairing does not change
the reference fits or target population.

## Verification

Run `node test/path-reference-prediction.test.mjs`, together with the existing
axis-prediction and circle tests. Controls cover unfamiliar target angles, changed
target radius/center without refitting, repeated pairing partners, unsupported
first-source models, both-wrong and both-agreeing targets, source reversal, missing
evidence, dimensional mismatch, source tampering and raw replay.

`tools/browser-path-reference-prediction.mjs` exercises actual original PNG intake,
byte and decode checks, original target inspection, source-only download/fresh
reopen, changed input, wrong-image refusal, declaration retirement, narrow keyboard
use, existing straight-only behavior and source reversal. It requires an actively
sandboxed Chromium and leaves the application's CSP unchanged. The original circle
browser course also checks the shared projection helper after this change.

These authored controls qualify software behavior. They do not establish physical
task invariants, independent calibration accuracy, platform qualification or a
measured learning benefit.

## Exact current-main receiving

Composed on f5fc25a1b0c340c5ef1a42fe8f5b824a30e2478c.26 affected native groups passed; browser group counts: {"browser": 8, "circle": 9, "axis": 4}. Both original-source and changed-target desktop/narrow renderings were independently inspected. Existing circle and straight-axis consumers remain covered. The old axis receiver initially violated strict CSP through Playwright waitForFunction; only bounded Node-side polling changed. Failure and current receipts are retained under docs/receipts/path-reference-20261026. No application security policy was relaxed.
