# Compare calibrated demonstration states

Open `/sequence-change` to inspect how declared source points changed across an
authored demonstration step. The viewer keeps the original before/after pixels
beside their common-plane geometry. It reuses maintained sequence admission,
calibration and image validation; it does not track objects or infer a motion path.

## Prepare and inspect a comparison

1. In the sequence editor, attach calibrated annotations to both moments used by
   the step, then save the complete sequence with its retained PNGs. The
   [moment-calibration guide](MOMENT_CALIBRATION.md) describes that workflow.
2. Open that saved sequence in the state comparison. Choose the step to inspect.
   Selecting another step starts a fresh comparison: save the current reference
   and correspondences first. The complete original sequence remains retained.
3. Identify the common reference surface and explain how you recognized it and
   its corners. Explicitly confirm that both frames use the same planar surface
   and the same physical TL, TR, BR, BL corner meanings. Both supplied widths and
   heights must agree exactly. Missing or differing calibration prevents metric
   comparison while the original images remain inspectable.
4. Choose a before mark and an after mark, name the paired point, and add the
   correspondence. Source labels and pixel coordinates help distinguish choices.
   Correspondence is your declaration; matching labels do not establish identity.
   Each source mark can belong to only one correspondence, up to 30 pairs.
5. Inspect the original-image overlays, the common-plane endpoints and the table.
   With two pairs, inspect how their separation changed. Unpaired marks remain
   listed. Removing a correspondence preserves the original marks and images.
6. Save the comparison with its complete source frames. Reopening verifies the
   pixels and source bindings again and recomputes positions and differences.

Reference edits remain drafts until explicitly applied. A changed reference or
unfinished paired-point label prevents export, so the saved file does not silently
omit that draft. Failed admission retains the accepted comparison. New source
operations, authored reference edits and selection changes invalidate older reads
or exports; original PNG bytes are hashed again when saving.

## What the geometry means

Each source point is transformed through its own maintained planar calibration.
Its normalized coordinates are multiplied by the common supplied surface
dimensions. A changed camera view can therefore produce different source pixels
for an unchanged declared physical location.

The table shows the two physical endpoints, signed horizontal/vertical change and
the straight-line distance between endpoints. The common-plane view uses hollow
circles for before and filled circles for after. Dashed connectors identify those
endpoints; they are not reconstructed trajectories.

The separation view compares two declared point pairs. It shows before/after
distance and directed horizontal/vertical separation. A translation of both
points can preserve their separation; a change in relative position can alter
it. These are descriptions of the annotated states, not automatically discovered
invariants or a verdict about which relationship was necessary for success.

The reported interval uses the two actual presented-frame times. Requested seek
times remain separately visible. This interval does not establish exact action
onset/completion, intermediate positions, distance traveled or instantaneous
speed. Surface identity, dimensions, corner meanings and point identity remain
supplied declarations. No contact, force, camera authenticity or physical task
success is inferred.

## Source and saved contract

`src/sequence-change.mjs` validates `skill-translator.state-change/v1`, containing
the normalized complete sequence, chosen step, optional common-reference
declaration and explicit one-to-one point pairs. The maintained source-mark ID
alphabet is preserved. Drafts with no reference or pairs can be retained; no
geometric comparison is fabricated from them.

`skill-translator.state-change-bundle/v1` saves the maintained sequence bundle
once, alongside those comparison settings. It retains every original PNG,
calibrated task, requested/presented time, authored step and supplied evidence
class. The source video is not embedded. Reopen uses `readSequenceBundle`, then
binds comparison settings to the admitted sequence. An embedded competing
sequence or saved derived result cannot override the verified source.

All existing source/sequence/image limits apply. The complete comparison file
admits the maintained 48 MiB source bundle plus at most 64 KiB of bounded settings
and formatting. Oversize files refuse rather than drop source evidence. Invalid
settings discovered after image admission release the newly created source URLs.
Ordinary page teardown releases accepted URLs; persisted page transitions retain
them with the page.

## Verification

Seven focused native controls cover camera-view changes with fixed physical
points, known translation, changed separation, common-reference/calibration
admission, one-to-one identity, immutable refusal, saved-result recomputation,
source tampering, strict numeric bounds and the full maintained source-ID
alphabet. The independent MICROVERSE contributor reproduced all seven and
reviewed the core and complete-source bundle helper without a blocking finding.

The composition with main `e6e32c1` passes 210 native/HTTP cases. After the
learner-photo, layout-feedback and finite-feature-clearance changes on main `aa7f283`, eight focused
native/HTTP controls and the complete comparison browser course pass again.
The actual Chrome 156.0.8078.47 course passes eight groups using original authored PNGs and an
independent analytic perspective projection. It exercises actual source pixels,
declaration/point entry, known geometry, save/reopen, wrong-PNG refusal, delayed
read/export supersession, explicit removal, 390px layout and strict CSP with no
offsite requests or page exceptions. Root inspected desktop and narrow views.

Run `CHROME_BINARY=/path/to/chrome PLAYWRIGHT_PATH=/path/to/playwright
RECEIPT_DIR=/path/to/receipts node tools/browser-sequence-change.mjs` with the
environment assignments on one command line. The course uses Node-side polling
and permitted image decoding under the unchanged application CSP. Exact source,
commands, review and evidence limits are in the
[verification receipt](receipts/state-change-20261024/verification.json).

These controls qualify authored geometry and source-bound software behavior.
They do not constitute a physical demonstration, tracking evaluation, expert
agreement, learning study, provider workload or deployed application.
