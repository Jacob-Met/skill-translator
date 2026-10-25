# Find useful moments in a local demonstration

In **Demonstration sequence**, pair the original MP4 or WebM and expand **Find
moments by visual change**. Choose a start time, an end before the clip finishes,
and 2–64 samples. The scan is local and does not retain moments or author steps
automatically. More samples inspect more of the interval; they do not establish
complete coverage of its motion.

Each request copies a small image inside the browser's presented-frame callback.
The largest side is at most 160 pixels. Requested time and reported presentation
time remain separate. Every adjacent requested interval stays in the list,
including a decoder failure, an unattempted request or two requests that returned
the same presented frame. Missing evidence is never assigned zero change or
bridged to a later image.

## Read both comparisons

**Raw change** is the mean absolute difference over all RGB channels in the two
samples. **Adjusted change** removes one median additive channel shift before
computing that mean. This can reduce uniform brightening without suppressing a
small moving region. The list also reports the fitted shift and the fraction of
sampled pixels with at least one adjusted channel difference of 16 levels or
more. Channel levels ordinarily range from 0 to 255; adjusted residuals are not
clipped and can exceed that range.

Adjustment can hide a real global appearance change, so raw evidence remains
beside it and both orderings are available. Neither metric is a probability,
action detector or measure of skill. Camera motion, lighting, compression and
resizing affect the comparison. Small details or movement that returns to the
same appearance between samples can be missed.

## Carry a candidate into the existing account

Choose **Inspect earlier** or **Inspect later** to see the small sampled preview
and move the original clip to its reported time. The original video remains
available for closer inspection. Use **Retain this moment** to capture its
full-resolution PNG through the maintained source workflow. A new capture records
the frame actually presented by the decoder; it does not assert that a new seek
returned the identical sampled frame.

Name the before/after moments, write the intended change and any supplied cues,
then save the existing sequence with its retained frames. Small scan previews
never replace the original PNGs in that export. Scan results themselves are
temporary; the authored sequence and original source clip are the durable input.

Canceling a scan preserves retained moments and any previous completed scan.
Changing source or beginning another input operation interrupts pending sampling.
A wrong clip is still refused by the maintained original-source check. A decoder
failure stops further requests and leaves completed comparisons and missing
intervals visible. New settings do not relabel earlier completed results.

## Verification

- `node test/visual-scan.test.mjs`: analytic still, localized movement, uniform
  brightness, color, request/timing, missing, duplicate and changed-size cases.
- `node tools/browser-visual-scan.mjs`: original authored video through actual
  decoding, the studio, keyboard selection, full-resolution capture, byte-bound
  sequence download/reopen, cancellation, source replacement, decoder failure
  and desktop/390-pixel receiving.
- `node tools/browser-sequence.mjs`: existing original-frame and sequence
  regression course.

Browser courses use an installed Playwright or Playwright Core package through
`PLAYWRIGHT_PATH`, an installed Chrome through `CHROME_BINARY`, and write evidence
under `RECEIPT_DIR`. The authored media test software behavior; they do not
establish performance on physical craft demonstrations or learning outcomes.
