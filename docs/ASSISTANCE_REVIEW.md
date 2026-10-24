# Placements before and after target requests

Open `/assistance-review` from the workpiece rehearsal's **Review target help** link. Export a rehearsal from the maintained producer and open that JSON in the review. Its source, plan, placements and target requests remain the original `skill-translator-rehearsal/v1` input. Saving from review exports that input, with no cached assessments or replacement scores.

## What is compared

For each **submitted** trial, the receiver replays the maintained rehearsal and evaluates the exact placements retained immediately before each target request using `evaluatePractice`. The first snapshot is before the first help request recorded in this file. Later snapshots explicitly follow earlier recorded help. Every checkpoint is retained; a selector renders one at a time so a maximum-size record does not create thousands of tables.

The committed result retains the original whole-task assessment. At each checkpoint, the review shows missing marks, raw before/committed coordinates, errors, and whether a mark was added, moved or unchanged. The paired RMS comparison uses only marks actually placed at both times. Newly added marks are displayed separately and cannot make a partial first attempt appear to have zero error or a lower matched error.

An empty first snapshot has no paired comparison. A no-request trial has a committed result but no manufactured pre-help snapshot. Unsubmitted trials expose neither calculated targets nor checkpoint assessment. A bad incoming file leaves the prior accepted review intact; later-selected files take precedence over slower older reads.

## Interpretation

These are descriptive changes in diagram placements. A change after a target request does not establish that help caused it. No request in a local record cannot establish absence of outside assistance. Source explanations and other workpieces may have been seen previously. Local files are editable, so this is not authenticated chronology, physical execution, or evidence of learned independent skill. Rehearsal source rules and calibration retain their existing limitations.

## Verification commands

```sh
node --test --test-isolation=none test/*.test.mjs
node tools/browser-assistance-review.mjs
node tools/rehearsal-browser.mjs
```

Browser scripts use the existing `PUPPETEER_PATH`, `CHROME_BINARY`, and `QA_OUTPUT` conventions. The new receiver script makes placements and requests in the actual rehearsal UI, downloads its record, opens the review through the producer link, checks same-mark and missing-mark findings, reopens the original exported record, rejects an invalid history, checks desktop/narrow layout and keyboard table inspection, and receives the admitted 2,048-action, 30-mark, 2,017-request capacity case with bounded table rendering.
