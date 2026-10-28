# Prospective shared-source challenges

The Shared Source Lab at **/joint-calibration** can freeze a challenge for future workpieces and test whether one coherent explanation survives every qualified result.

A coherent explanation uses **one shared reading of the original source for all selected marks** and **one fixed rule per mark across every future workpiece**. Separate marks cannot choose incompatible source readings, and a mark cannot change its rule after seeing each new outcome.

## Use the instrument

1. Open or construct a shared-source investigation in the existing lab. Select 2–12 marks, retain the original source and training observations, and inspect the training-supported explanations.
2. Describe 1–6 future workpieces, including their identities, dimensions and the maximum accepted measurement radius. Declare that the challenge is being planned before collecting its outcomes.
3. Freeze the plan. Every future size must be absent from the full original training collection, including observations of unselected marks. Every training-supported explanation must make an admissible prediction on every planned workpiece; the planner refuses an impossible course instead of quietly deleting inconvenient explanations.
4. Collect outcomes separately. For each workpiece/mark slot, enter the observed position, uncertainty radius, source label and source class. Explicitly declare that the outcome was collected after the plan. An authored example remains an authored example.
5. Inspect the complete course, its missing or imprecise slots, the remaining shared readings and their per-mark rules. Keep a known contradiction visible even if other results are missing.
6. Export the complete study to retain its source, frozen plan and entered outcomes. Reopen it in a fresh lab to recompute the conclusion.

The prospective and collection declarations are statements supplied by the user. This application does not authenticate acquisition time, verify an instrument or prove that a physical experiment was independent.

## What is tested

Training first determines the supported source readings and the possible rules for each selected mark. Freezing stores that complete training account and the planned workpieces.

For a given source reading, each mark retains only those rules compatible with **all of that mark's qualified future outcomes**. A source reading survives only when every selected mark still has a possible rule. The implementation keeps these alternatives factored by reading and mark; it does not expand the Cartesian product of complete explanations.

The displayed explanation count is a finite count under the declared model. It is not a probability, confidence level or estimate of how likely a physical skill is to follow a rule. A single survivor is conditional on the supplied source, training observations, rule family, measurement bounds and declarations.

### Precision and incomplete evidence

A result is qualified only when its measurement radius is no larger than the radius accepted by its frozen trial. An imprecise result remains visible but cannot eliminate a rule.

A missing result also cannot eliminate an explanation. Qualified evidence that contradicts every coherent explanation remains a contradiction even when other slots are missing or imprecise. Complete collection alone does not establish adequate precision.

| Status | Meaning |
| --- | --- |
| Awaiting results | No future outcomes have been entered. |
| Incomplete | Some planned workpiece/mark slots still lack an outcome. |
| Insufficient precision | The collection has results whose stated radii do not meet the plan. |
| None compatible | The qualified results exclude every coherent joint explanation. |
| One joint explanation | The complete qualified course retains one explanation within the declared family. |
| Unresolved | Multiple coherent explanations remain after the qualified course. |

The exact order of status decisions is part of the scientific contract: known qualified contradiction takes precedence over collection or precision incompleteness.

## Inspect contradictory workpiece groups

The same consumer can inspect every inclusion-minimal group of future workpieces
that contradicts the frozen joint explanations. All supplied mark outcomes stay
with their workpiece. The disclosure retains original observation identities,
shows how each source reading loses its rules, and explains why every member is
necessary to that group. Alternative groups of different sizes remain visible.

The complete source account and verdict remain intact. These groups do not
identify faulty measurements or recommend removing evidence. See
[Contradictory workpiece groups](JOINT_WORKPIECE_CONFLICTS.md) for the bounded
enumeration, authored example, source custody and verification commands.

## Source custody and reopening

A plan is a frozen snapshot. Editing the parent investigation does not silently change its source, training or predictions. The interface marks the old plan as stale relative to the edited investigation; a new challenge must be planned explicitly.

Saved studies contain source inputs and declarations. Reopening recomputes predictions, training support and results rather than trusting cached verdicts or forged derived fields. Supplied source, observation and hypothesis anchors are checked; explicitly malformed anchors are not treated as if they were absent.

Selecting a new file or starting a parent edit invalidates older pending file reads. Invalid or superseded imports preserve the current valid investigation and challenge. Result replacement validates the complete candidate collection before adoption, so a failed replacement does not partially change the visible account.

The core limits the complete canonical UTF-8 study representation to **4,000,000 bytes**. It admits at most 12 selected marks, 6 future workpieces and 72 outcome slots. Export uses the compact source representation so formatting overhead does not turn a valid saved account into an oversized one.

## Scientific limits

This increment checks finite geometric explanations of source marks and future workpiece positions. It does not infer arbitrary physical skill, establish causal understanding, authenticate measurements or prove transfer outside the declared rule family.

Predictions are conditioned on the original geometry and supplied readings. Measurement radii are declared bounds, not calibrated statistical coverage. Hypotheses that are absent from the original family cannot be discovered by eliminating the available alternatives.

The instrument preserves unsuccessful courses. If every explanation fails, that can reveal an inadequate source reading, rule family, measurement account or physical assumption; it does not identify which one caused the failure.

## Implementation and checks

The numerical implementation is in src/joint-challenge.mjs. Its public operations freeze and import a plan, create an outcome, analyze the complete challenge, and export/import the source-only study. The mounted browser panel is in web/joint-challenge.mjs and extends the existing shared-source lab.

Run the native controls with the maintained Node runtime:

    node --test --test-reporter=tap test/joint-calibration.test.mjs test/joint-challenge.test.mjs

The challenge controls include cross-mark source switching, rule switching across future workpieces, an independent small Cartesian calculation, qualified contradiction with missing/imprecise evidence, impossible-course refusal, source-anchor validation, source-only round trips and all 72 outcome slots.

The server integration adds three explicit asset routes and preserves the maintained server's source-boundary and native-request checks:

    node --test --test-reporter=tap test/server.test.mjs test/server-native-origin.test.mjs test/server-static-symlink-boundary.test.mjs

Actual native receiving of the reviewed composition on Node 22.23.4 passed all **35 tests**, including nested server checks, on base e9a29b3ead307ea2e79aaeb0ffdf1f8a47da6cfd. The current maintained server retains its newer routes and native handlers. Five feature assets were also compared byte for byte through actual HTTP. Exact source, dependency, command and outcome bindings are retained in [the integration receipt](receipts/joint-challenge-441/current-integration.json) and [native output](receipts/joint-challenge-441/native.log).

The completed browser course used the real maintained server and **/joint-calibration**, with strict Chromium sandbox admission. All **six groups** passed: shared-source outcome comparison; source-only download and fresh reopen; both delayed-read directions with trusted typing; failed replacement and contradiction precedence; the exact 4,000,000-byte UTF-8 boundary; and six-workpiece planning with keyboard, focus and overflow checks at 1440, 390 and 320 pixels. The screenshot hashes and sandbox observations are in the integration receipt.

Run the browser course against an already running maintained server, supplying the installed Playwright module path:

    BASE_URL=http://127.0.0.1:8787 PLAYWRIGHT_PATH=/absolute/path/to/playwright node tools/browser-joint-challenge.mjs

This receiving course uses Linux Chromium at /usr/bin/google-chrome and checks active namespace, PID, network and seccomp sandboxing. Authored controls are explicitly labeled. [The receiving history](receipts/joint-challenge-441/history.json) preserves earlier failed and incomplete harness attempts.
