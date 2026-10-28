# Continue a joint workpiece inquiry

The shared-source lab can retain a complete joint challenge and use its reported outcomes when planning another workpiece. The initial source, original training and earlier outcomes remain separate. Each later round freezes predictions from the original explanations still compatible with the evidence already reported.

## Use the maintained consumer

Open `/joint-calibration`. In the existing new-workpiece section, freeze or reopen a complete joint challenge and record its outcomes. Under **Continue the inquiry**, retain that challenge as the initial course.

Choose the next workpiece's name, dimensions and planned maximum outcome radius. Declare that its outcomes have not been seen, and explicitly seal the prior evidence currently reported. Missing outcomes and radii above their plans remain visible and nonconstraining when sealed. Freeze the workpiece and export the complete source-only sequence before collecting its outcomes.

Record each original mark's outcome against the current round. Keep its evidence origin and reported radius explicit. A radius above the plan stays in the account but cannot eliminate an explanation. The current round can correct its own mark slots; exporting first retains another copy. Once a later round is frozen, those earlier slots are sealed.

Each round shows the number of compatible combinations before and after its outcomes, the original mark identities and the predictions frozen from its own prior evidence. Expanding an earlier round after later results does not replace its predictions with hindsight. The initial course remains inspectable, including every original outcome and its role.

The complete account includes at most six workpieces and 72 outcomes. The initial challenge counts toward both limits. Each later round adds one workpiece with dimensions distinct from every original training observation and previously planned workpiece. A six-workpiece initial challenge therefore has no remaining continuation capacity.

## What is conditioned

An original explanation consists of one retained source reading and one fixed transfer rule for each selected mark. That reading and those rules apply across every workpiece in the complete course.

For round k, retain exactly the original explanations compatible with every qualified outcome in the initial challenge and rounds before k. Compute round k's predictions from that retained family. Its outcomes may remove more explanations, but they do not fit a new source reading or transfer rule. A mark cannot change its rule between workpieces, and different marks cannot use mutually inconsistent source readings.

The implementation reuses `freezeJointChallengePlan` and `analyzeJointChallenge`. It does not replace the maintained geometry or residual predicate. The residual comparison is the existing binary64 distance check with its existing numerical allowance; this continuation does not introduce certified interval geometry or a new uncertainty interpretation. Finite counts include the explicitly declared reading/rule identities and are not probabilities.

An authored control demonstrates the distinction. Original training on a 100 × 80 mm source supports 25 two-mark combinations. Outcomes on a 200 × 160 mm workpiece retain one combination, with left clearance for both marks. The next 300 × 240 mm workpiece then predicts guide (20, 90) and index (60, 150). Starting a fresh training-only plan would correctly show 25 possibilities again; the continuation explicitly retains the earlier actual constraints. A contradictory later outcome can leave no shared explanation, at which point another round cannot be frozen.

The maintained freezer conservatively requires every originally training-supported prediction to fit each proposed sheet. This check is unchanged even when prior outcomes excluded a rule. Consequently, a small new workpiece can be refused even if the currently remaining explanations would fit. No original alternative is silently dropped to admit a sheet.

## Source and timing contract

`skill-translator-joint-challenge-sequence/v1` contains an immutable initial v1 challenge and an ordered list of later source rounds. Each round retains its identifier, label, future trial, prospective and prior-sealing declarations, reported results, and a complete normalized prior-source prefix.

The prefix contains the original initial challenge and all preceding source rounds. Earlier prefixes and derived caches are excluded from that prefix representation, so it is not recursively nested history. Comparisons use canonical key ordering; array order and source values remain explicit. The binding is the complete normalized source, not an externally supplied hash or a plan ID alone.

Current outcome intake checks the entire active request, including its trial and prior-source prefix. Supplied original anchors are validated rather than silently rebound. Observation IDs stay globally distinct across training and the whole course. Replacing an outcome is limited to the latest round's same mark slot. Earlier evidence cannot be changed through current intake.

Changing an earlier source record without updating the later bound prefix is refused on reopen. This is a consistency check, not an authenticated or tamper-proof acquisition log. A deliberately rewritten, internally consistent source account remains a new declaration. Reported timing, evidence origin and expert authorship are not independently authenticated by these files.

Source-only export omits computed predictions, counts and verdicts. Reopen re-admits the source and recomputes each round from its own prefix. Supplied derived caches do not determine an answer. Complete UTF-8 input and canonical output are bounded to 4,000,000 bytes; canonical export includes its final newline in that bound. A larger prefix can therefore refuse a continuation even when the initial challenge alone fit its own limit. Admission completes before the accepted account is replaced.

## Retained context and asynchronous imports

A sequence retains its own initial challenge. Editing or reopening the challenge or training above it does not refit or erase the retained sequence. A visible context notice identifies that difference. Opening a complete sequence on a fresh page restores its own source account; it can be inspected without first replacing the parent challenge.

Sequence, challenge and outer training activity invalidate older pending imports. A late file read loses to a newer draft or explicit action. Failed imports retain the accepted sequence and export. The file input is cleared only when it still holds the same captured File, permitting same-file retry without an older completion clearing a newer selection.

## Module entry points

`src/joint-challenge-sequence.mjs` exports:

| Function | Purpose |
| --- | --- |
| `startJointChallengeSequence(initialStudy)` | Retain an admitted complete v1 challenge as the initial course. |
| `freezeNextJointChallengeRound(sequence, input)` | Seal the current prior evidence and freeze one declared later workpiece. |
| `activeJointChallengeSequenceRequest(sequence)` | Return the complete source-bound current request. |
| `recordJointChallengeSequenceResult(sequence, request, input)` | Validate and replace only the current round's selected mark outcome. |
| `analyzeJointChallengeSequence(sequence)` | Recompute original-prefix predictions, before/after counts, slots and limits. |
| `exportJointChallengeSequence(sequence)` | Return normalized source-only data. |
| `serializeJointChallengeSequence(sequence)` | Return canonical source JSON plus its counted final newline. |
| `importJointChallengeSequence(value)` | Re-admit complete source data or JSON text. |
| `jointChallengeSequenceContextMatches(sequence, initial, investigation)` | Compare already-admitted retained and current source context independently of JSON key order; it is not input admission. |

These operations return new source accounts and do not mutate caller objects. Runtime and browser routes are explicit server allowlist entries. Test fixtures and browser harnesses remain unserved.

## Evidence and limits

The frozen controls are in [JOINT_CHALLENGE_SEQUENCE_CONTROLS.md](JOINT_CHALLENGE_SEQUENCE_CONTROLS.md). They cover the authored two-round mechanism, global reading/rule consistency, no hindsight, complete prefixes, missing/imprecise evidence, current-request and anchor binding, capacity, exact byte boundaries, transactional replacement and actual browser interaction.

This work preserves the continuous affine prospective-set, fixed-workpiece practice, learner-placement, original-reference continuous-family and coupled-layout owners. It does not establish physical safety, expert intent, calibrated confidence, independently measured acquisition, or demonstrated learning benefit.

### Recorded receiving course

The current composition passed 57 native controls, nine maintained browser groups, eight sequence browser groups and twelve exact HTTP resource checks. The full source-bound receipt is [current-integration155.json](receipts/joint-challenge-sequence-461/current-integration155.json). The [receiving history](receipts/joint-challenge-sequence-461/history.json) retains both earlier failures and their distinct repairs. Independent core, consumer and context-fix reviews are retained beside the receipt. Root inspected actual desktop and narrow-screen pixels; [the visual record](receipts/joint-challenge-sequence-461/root-visual-review.json) binds those observations to source and image hashes.
