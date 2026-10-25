# Compact original-frame path explanations

Open the maintained `/sampled-path` consumer and receive a complete original PNG
sequence plus explicit calibrated point correspondences. After inspecting the
selected samples, choose **Propose retained frames** with a finite nonnegative
maximum nominal sample deviation in millimetres.

The proposal retains the fewest original selected samples within each contiguous
observed run. For every candidate endpoint pair, it interpolates the endpoint
positions at each intervening original presented time and checks every original
sample's Euclidean discrepancy. Dynamic programming selects a shortest path
through admitted spans; equal-size alternatives choose the earliest next sample.
A straight spatial path with a return or a pause therefore cannot disappear just
because every point lies on the same line. Missing observations remain retained,
split runs, and cannot be bridged regardless of allowance. All observed run
endpoints remain retained, including isolated known points.

Inspect any retained or omitted sample using its original-frame button. The
complete source account, point annotations, source PNGs, and ordinary sampled
geometry remain unchanged. Save retains **all** original frames, including those
omitted from the temporary explanation. The discrepancy and proposal are not
saved; enter the discrepancy again after reopening to recompute. Changing the
source declarations invalidates the ordinary findings and proposal together.
Changing discrepancy clears the old proposal until explicitly recomputed.

The discrepancy uses nominal floating-point positions and times from the
maintained calibration. No epsilon is silently added to the supplied threshold.
Very small thresholds may retain extra frames because of numerical residues.
This is not a certified measurement bound, continuous motion reconstruction,
automatic point correspondence, task-phase inference, or evidence of learning.
Unselected frames and intervening motion remain unknown. The proposal describes
one coordinate/time representation; it does not establish which frames teach a
human best or which movement is functionally essential.

## Verification

`node --test test/path-summary.test.mjs test/sequence-path.test.mjs` checks an
independently enumerated subset oracle on120 unfamiliar authored paths, source
immutability, straight/collinear-return/pause controls, missing runs, malformed
bounds, exact computed-threshold/just-below decisions, and forged findings.
`tools/browser-path-summary.mjs` extends the maintained original-PNG consumer
course with changed discrepancy, omitted-frame receiving, complete save/reopen,
blank-input refusal, missing-data controls and narrow keyboard interaction.
Browser execution must be recorded separately; source availability is not a pass.
