# Contradictory workpiece groups

The Shared Source Lab at **/joint-calibration** can explain a failed prospective
course by showing every inclusion-minimal group of workpieces that contradicts
the original frozen explanations.

A workpiece is one evidence group containing all its supplied selected-mark
outcomes. One source reading must serve every selected mark, and each mark must
keep the same rule across every workpiece in the group. The diagnostic never
refits training or substitutes different readings or rules after each outcome.

## Inspect the evidence

1. Freeze or reopen a complete [joint challenge](JOINT_CHALLENGE.md).
2. Enter outcomes through the existing form. The original source, prospective
   plan, missing slots and achieved precision remain visible.
3. Inspect **Contradictory workpiece groups** below the complete-course verdict.
   All minimal alternatives are listed, including groups of different sizes.
4. Open a group with its disclosure control or keyboard. Inspect its original
   observation identities, the rules eliminated under each source reading, and
   the support restored by omitting each workpiece from that group.
5. Export the complete challenge to retain the original account. Reopening
   recomputes groups from the source inputs.

The subset comparison is explanatory. It does not remove a workpiece, change the
full-course verdict, identify a faulty observation or recommend discarding data.
Existing outcome-editing controls remain explicit changes to the source account.

## What “minimal” means

A group is contradictory when no originally supported coherent explanation
survives all its qualified outcomes. It is **inclusion-minimal** when every
one-workpiece removal restores at least one original explanation.

This differs from asking only for a group with the smallest number of members.
One minimal group can contain a single workpiece while another contains two or
more. Both are retained. Minimality is over whole workpieces, not individual mark
observations within them.

Missing outcomes do not eliminate explanations. A result whose reported radius
exceeds its frozen planned radius remains visible but also cannot eliminate.
Qualified contradiction stays visible even if another mark or workpiece is
missing or imprecise.

If no group is found, the statement applies only to the qualified outcomes
currently present. It does not imply that the course is complete or that future
measurements will agree.

## Authored example with two different minimal groups

The executable control uses a 100 × 80 mm rectangular source with guide at
(20,30) mm and index at (60,50) mm. Training admits the maintained finite rule
family. There is one original source reading in this example.

| Future workpiece | Dimensions, mm | Guide outcome, mm | Index outcome, mm |
| --- | --- | --- | --- |
| Narrow | 200 × 160 | (20,60) | (60,100) |
| Wide | 300 × 240 | (220,90) | (60,150) |
| Third | 400 × 320 | (399,319) | Missing |

Qualified outcomes have declared radius 0.01 mm under a planned maximum of
0.1 mm. These are authored geometric controls, not physical measurements.

The narrow and wide workpieces are each compatible separately. Their guide
outcomes require different fixed rules, so the pair is contradictory. The
third guide outcome contradicts every offered rule on its own, despite its
missing index outcome.

The complete list is therefore **{Third}** and **{Narrow, Wide}**. Larger groups
containing Third are contradictory but not minimal. The interface preserves the
complete five-outcome account while explaining both alternatives.

## Complete enumeration with a factored family

The maintained plan admits at most six future workpieces. The diagnostic
evaluates every nonempty subset, at most 63.

It first calls the maintained challenge analysis for source admission,
reconstructed predictions, precision qualification and residual decisions.
Each originally admitted rule then records which workpieces contain a qualified
observation that rejects it.

For each subset, a rule survives exactly when none of those rejecting
workpieces is included. A reading survives when every selected mark retains at
least one rule. The implementation multiplies per-mark counts within each
reading and sums across readings, preserving the factored representation rather
than expanding the Cartesian product of complete explanations.

Adding qualified observations cannot restore an eliminated explanation.
Consequently, checking every immediate one-workpiece removal proves
inclusion-minimality; there is no search heuristic or omitted alternative within
the six-workpiece contract.

Each returned group includes original qualified and imprecise observation IDs,
missing slots, all source readings’ blocked marks and rejected rules, and the
remaining support after each single removal. These are witnesses to the
conditional model result, not attribution of physical fault.

## Source custody and interpretation

The original challenge format remains unchanged. Export contains source inputs,
the frozen plan and supplied outcomes. It contains no trusted conflict-group
cache. Forged derived fields do not change the recomputed diagnostic, and invalid
source anchors are refused before replacement.

Parent training edits mark the retained frozen account stale. Its outcomes,
groups and export remain attached to their original investigation. Keyboard
interaction with a group also retires older pending imports, following the
maintained consumer’s activity policy.

The subset enumeration is complete under the existing finite model and its
numerical residual predicate. It does not turn binary64 geometric calculations
or declared uncertainty bounds into certified interval arithmetic or calibrated
statistical coverage. Counts are finite explanation combinations, not
probabilities. Source identity, provenance and prospective timing remain
supplied declarations.

## Verification

Native controls include source switching across marks, fixed-rule switching
across workpieces, alternative minimal groups of different sizes, missing and
imprecise evidence, original-ID invariance, six workpieces with 72 outcomes, and
source-only replay. An independent small Cartesian oracle computes rectangular
predictions directly from original coordinates and checks every proper subset.

Run the core and maintained-server controls:

    node --test --test-reporter=tap test/joint-calibration.test.mjs test/joint-challenge.test.mjs test/joint-challenge-conflicts.test.mjs test/server.test.mjs test/server-native-origin.test.mjs test/server-static-symlink-boundary.test.mjs

For a local Node runtime that reports only file-level wrappers, use
--test-isolation=none to obtain the individual named-test report.

Run the maintained browser course against an already running server:

    BASE_URL=http://127.0.0.1:8787 PLAYWRIGHT_PATH=/absolute/path/to/playwright node tools/browser-joint-challenge.mjs

The browser course retains the prior challenge controls and adds actual conflict
inspection, fresh download/reopen, derived-cache recomputation, source-error retention,
a delayed-parent-read/keyboard control, and desktop/narrow captures. It uses
/usr/bin/google-chrome and the maintained strict sandbox admission helper.
An installed harness is not itself evidence that the course has passed.

### Received evidence for issue 450

The current-main integration on 2026-10-28 passed **44 named native tests**, all
**nine browser groups**, and **ten exact HTTP source-byte comparisons**. It ran
Node 22.23.4 and Chrome 156.0.8078.47 with the maintained sandbox checks admitted.
The browser course exercised 1440, 390 and 320 pixel widths, including keyboard
disclosure and the delayed-parent-import control.

The exact [current integration record](receipts/joint-workpiece-conflicts-450/current-integration.json)
binds 12 then-candidate files and 87 unchanged current-main dependencies to
their bytes, commands, results, captures and server cleanup. It preserves four
unrelated routes added to main since the original receiving run and verifies
their served bytes alongside the six challenge resources. The
[current native TAP report](receipts/joint-workpiece-conflicts-450/native-current.tap)
contains the individual results.

The [review record](receipts/joint-workpiece-conflicts-450/review.json) retains
independent core, consumer and current-tree composition reviews. Root inspected
the actual desktop overview and 390-pixel disclosure captures from the
[original receiving run](receipts/joint-workpiece-conflicts-450/receiving.json),
which passed the same 44 native tests and nine browser groups with six HTTP
resources. Their visual source files are identical in the current integration.
The original [native report](receipts/joint-workpiece-conflicts-450/native.tap)
is retained separately.

Only this evidence description, the updated review record and the two exact
current-run receipt files were added or changed after current integration.
Executable source, tests, fixture, browser harness and styles remain byte
identical to that received composition. The run qualifies the authored controls
and stated finite-model behavior; it provides no new physical measurement or
statistical-coverage evidence.
