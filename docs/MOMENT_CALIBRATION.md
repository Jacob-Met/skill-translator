# Calibrate a retained demonstration moment

A demonstration sequence can retain the calibrated source task for each moment.
The account keeps its before/after explanation while the existing capture editor
supplies calibration and the existing practice workbench receives the task.

## Use the maintained editor and practice workbench

1. Open `/sequence`, retain a moment from a local clip, or reopen a saved sequence.
   Choose **Calibrate / practice** on the moment, or select it in the calibration
   panel. The retained image and its actual presentation time identify the source.
2. Save the retained PNG and open **Source capture**. The PNG is copied from the
   retained bytes; it is not a new seek or a screenshot of the displayed preview.
3. In Source capture, select that PNG, declare the surface dimensions and four
   source corners, and add at least one mark with its relationship and tolerance.
   Download the calibrated annotations from that editor.
4. Back in the sequence, attach those annotations to the selected moment. The
   accepted overlay and list show each mark and its declared relationship.
   Another frame's annotations or a conflicting video record are refused while
   the accepted calibration and authored sequence remain available.
5. Save the source task, save the complete sequence, or open practice in a new tab.
   The practice tab receives the existing task contract with target guides hidden
   initially. The sequence tab remains available for its images and explanation.
   If a browser blocks the new tab, save the task and open it in practice manually.

Replacing annotations is explicit. Removing them removes only the selected
moment's calibrated task; its image, time, notes and connected steps remain.

With both moments of a step calibrated, save the sequence and open the
[calibrated-state comparison](STATE_CHANGE.md). It keeps the original views beside
explicitly paired points on a declared common reference, showing endpoint and
separation changes without inferring the intervening motion.

Calibration is supplied by the author. The application does not infer a surface,
dimensions, contact, force, expert intention or a successful physical action.

## Source binding and preserved context

The shared capture admission validates the imported task, source quadrilateral,
mark bounds, relationships and tolerances. The adapter additionally requires the
retained image's exact SHA-256, dimensions, MIME type and browser orientation.
Renaming the same PNG is allowed. Actual exported PNG bytes are independently
hashed; cached image metadata alone is insufficient.

Annotations made from the exported still image normally carry no video origin.
After their exact image binding passes, the adapter adds the already retained
moment's normalized origin. If annotations already carry an origin, every
substantive timeline field must agree: requested and presented time, clip digest,
byte length, MIME type and duration, frame digest, and decoded/display dimensions.
A renamed clip is allowed. The supplied evidence class is preserved. A matching
digest establishes record consistency, not capture authenticity.

Exported tasks include `sequenceContext`, regenerated from the currently accepted
sequence. It retains the current title/context, selected moment and original
source record, and each saved step that uses that moment, including the moment's
before/after role and the two presentation times. An imported context cannot
override a later edit. Related steps retain supplied intent, visible change,
sensory cue and recovery cue; unsupplied fields remain unsupplied.

Practice assesses the declared geometry of one state under its existing rules.
Its saved source task preserves this temporal context, while learner placements
remain separate in the practice session. It does not assess action order,
physical execution, sensory skill or mastery of the full demonstration.

## Saved format and bounded admission

Uncalibrated sequences retain `skill-translator.demonstration-sequence/v1`.
Attaching a task upgrades the inner sequence to `/v2`; it stays v2 after removal.
A v1 document containing calibrated tasks is refused. Older readers therefore
refuse v2 instead of silently dropping annotations. The enclosing
`skill-translator.sequence-bundle/v1` remains unchanged and validates its inner
sequence independently.

Saved bundles include the original retained PNGs and calibrated tasks. Reopening
rehashes and decodes the PNGs, validates the sequence and rebinds each task before
accepting the account. The source video is not embedded. All existing moment,
step, image, clip and bundle limits still apply.

Annotation files and complete exported tasks are bounded at 256 KiB, including
the regenerated temporal context. Oversize context is refused, never truncated.
File reads and byte exports are fenced by source generation and account revision.
A changed selection, newer attachment, authored edit or source operation cannot
be overwritten by an older pending result.

## Verification and scope

`node test/sequence-capture.test.mjs` exercises exact image/timeline binding,
format compatibility, immutable revisions, current-context regeneration and the
actual practice contract. Independent review reproduced all six cases and an
additional combined task/context size refusal, then inspected the browser
handlers, byte hashing and new-tab handoff without a blocking finding.

`tools/browser-sequence-calibration.mjs` drives the actual maintained HTTP server,
capture editor and practice UI. Its nine groups cover exact PNG export, actual
editor annotation, source-bound attachment, save/reopen, wrong-source refusal,
new-tab practice/source export, delayed-read controls, removal, 390px layout,
strict CSP and stable source hashes. Run it with `CHROME_BINARY`,
`PLAYWRIGHT_PATH` and `RECEIPT_DIR` environment variables pointing to the installed
browser, Playwright package and an output directory.

This course uses original authored PNGs and a declared timeline. Actual MP4/WebM
decoding and presented-frame timing are covered by the separate demonstration
sequence course. The [verification receipt](receipts/moment-calibration-20261024/verification.json)
records exact source, commands, composition and the scope of each executed check.
No physical demonstration, learner study, provider workload, installed deployment
or low-end-device performance is inferred from these controls.
