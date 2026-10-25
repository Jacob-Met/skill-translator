# Whole-frame appearance across a sampled interval

Inside the existing local clip scanner, choose an earlier and later requested
sample and **Compare sampled span**. This uses the same retained whole-frame
scan samples; it does not change capture, sampling, region selection or the
original demonstration.

The endpoint comparison recomputes the maintained raw and brightness-adjusted
RGB scores. Separately, the panel sums raw changes across the selected adjacent
intervals only when every interval was compared. A missing image, repeated or
reversed presented time, or changed sample dimensions prevents that complete
sum. Available endpoint evidence and each individual interval/refusal remain
visible. Brightness-adjusted scores are not summed: each fits its own shift.

An authored example demonstrates why these questions differ. Images A→B→A and
A→B→C have the same adjacent raw changes,0.0625 and0.0625, yet endpoint changes
are0 and0.125 respectively. Substantial sampled appearance change can therefore
end at the earlier appearance. This does not prove physical motion, a task
boundary, contact, success or a physical return. Unsampled frames, camera changes
and details lost in resizing remain unknown.

Every preview is labeled as a small whole-frame scan image. **Inspect earlier
original moment** and **Inspect later original moment** reuse the existing source
selection and decoder-readiness gates. Retain the chosen moment through the
ordinary capture controls to save its actual full-resolution PNG and presented
time. A scan thumbnail never becomes retained source evidence.

Changing the selected endpoints clears the comparison. A new completed scan or
source clears older findings; cancellation preserves the earlier completed scan.
Settings edited after a scan do not alter that scan's retained plan. The span is
an ephemeral investigation; save chosen original moments through the maintained
sequence workflow. The separately owned ROI investigation remains unchanged.

Native checks: `node test/visual-span.test.mjs`. Actual video receiving uses
`tools/browser-visual-span.mjs`, which preserves the original scan regression
course and adds span inspection, original endpoint capture, incomplete decoding,
new-scan retirement and narrow-screen checks. Its generated video is authored
software evidence, not a measured craft demonstration or learning study.


## Executed receiving

Four native groups and fourteen actual sandboxed Chrome groups pass on the
maintained sequence consumer, including full-resolution original capture and
source-only reopening, missing decoder intervals, source changes and 390-pixel
layout. The browser harness polls from Node so the product content-security
policy remains unchanged. Concurrent original-interval playback routes through
main aaeb04c are preserved. Exact source and browser evidence is retained in
docs/receipts/visual-span-7bb49db0/receiving.json.
