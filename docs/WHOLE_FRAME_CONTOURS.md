# Explicit whole-original-frame contours

The existing ROI contour workflow retains the complete field for its declared ROI. It does not establish equivalence to full-frame detection: cropping can change Canny hysteresis as well as the immediate crop border. On the four retained 1920×1080 scissors PNGs, combining two independently processed half-frame fields differs from a single full-raster Canny call at 28, 7, 56 and 60 pixels. One difference reaches 17 rows away from the artificial seam. A narrow halo cannot be assumed to reproduce the complete original result.

This separate mode runs Canny once on every original pixel. It keeps the unchanged fixed settings, original PNG admission and contour arithmetic. It has its own explicit scope and report format; neither the maintained edge-field receiver nor the existing ROI mode has its capacity silently widened.

## Scope and bounds

The native request must declare `scope: "whole-original-frame"` and must not contain an ROI. It supplies the same original `image`, `momentId`, `origin` and `pngBase64` inputs. The original raster must be at most 2,097,152 pixels, with each dimension between 3 and 8,192. PNG bytes remain bounded to 16 MiB; only unchanged opaque 8-bit decoded samples are admitted. EXIF-oriented and animated PNGs refuse in the native producer and before the selected report is adopted or reopened in the consumer; no orientation transform or animation frame is guessed. Full contours retain the existing limits of 4,096 walks and 131,072 vertices. Exceeding a bound refuses the complete result.

```sh
python3 tools/whole-frame-contours-native.py < original-request.json > whole-frame-report.json
```

Open `/whole-frame-contours`, load the original demonstration sequence, and load the whole-frame report. The original sequence and every PNG are preserved when saving. The imported report is checked for source identity, explicit scope/method, complete field bytes, walk membership/adjacency, hierarchy consistency and exact visited/omitted coverage. Browser admission is not an independent native recomputation.

The full-frame producer intentionally does not invent full-frame Hough segments from separately generated ROI reports. This outcome is a complete Canny field with its auxiliary native walks. Original boundaries, blur, texture, occlusion and detector uncertainty remain. No physical object, contact, persistent identity or task success is established.

## Actual receiving

Four separate local OpenCV 5.0.0 processes received the exact original PNGs. Their complete edge counts were 6,917, 6,000, 9,842 and 13,162, with 139, 75, 104 and 512 walks. Omitted contour coverage was 2, 0, 0 and 6 edge pixels, retained explicitly. Observed process peak RSS was 63,804–66,216 KiB and elapsed time was approximately 0.23–0.27 seconds in this local course. These are observations, not guaranteed resource ceilings or performance gains. The receiving harness imposed a 15-second subprocess timeout; the standalone command has no claimed wall-time guarantee.

Five native control groups check exact capacity and overflow, unchanged ROI admission, unsupported scopes/ROI mixing, original hash/dimensions, transparent and 16-bit input refusal, full-raster field equality and unchanged walk semantics over all 512 binary 3×3 fields. Source-contract checks admit the four actual reports and refuse 20 source/scope/capacity/coverage/vertex mutations. Actual sandboxed Chrome receives the four full reports, saves exact original PNGs and reports, reopens at 390 pixels and refuses wrong-source replacement without losing the accepted result.

The initial resource-measurement launch failed because `/usr/bin/time` was unavailable; a receiver-only syntax error was corrected before the successful course. Neither failure is represented as native receiving. The first full consumer course passed; a subsequent focused screenshot launch was blocked before browser startup by local disk exhaustion. A subsequent successful focused capture showed the complete original frame, exact source time, walks and coverage together at 390 pixels; independent visual review accepted it. The earlier blocked launch remains retained.

No cloud, Nebius, physical accuracy or reliability qualification follows from these local results. Reproduction uses the same explicit `BROWSER_HELPER`, `CHROME_BINARY`, `QA_OUTPUT`, `SOURCE_BUNDLE` and `NATIVE_REPORTS` environment inputs as `tools/browser-whole-contours.mjs`; the four reports are named `frame-0.json` through `frame-3.json`.

## Source-coordinate admission

A separate authored 48×48 asymmetric PNG control demonstrated why the orientation refusal is necessary. With an `eXIf` orientation value of 3, the maintained browser image loader displayed the 180-degree rotation while OpenCV's unchanged decoder retained the original raster. Both accepted dimensions were still 48×48. The same original bytes therefore did not by themselves establish matching display coordinates. The native producer now refuses EXIF and animation metadata, following the maintained calibration producer's existing policy. The consumer checks the selected original PNG before adopting or reopening a report, including reports produced before this refusal existed. Context frames remain retained; no source image is silently rewritten.

Run the native and selected-PNG admission controls with the same pinned OpenCV runtime:

```sh
python3 test/whole-frame-contours.test.py
node --test test/whole-frame-png.test.mjs
WHOLE_FRAME_TEST_OUTPUT="$NEW_FIXTURE_DIRECTORY" python3 test/whole-frame-png-fixtures.py
BROWSER_HELPER="$EARTH_BROWSER_HELPER" CHROME_BINARY="$CHROME_BINARY" QA_OUTPUT="$NEW_BROWSER_OUTPUT" WHOLE_FRAME_TEST_OUTPUT="$NEW_FIXTURE_DIRECTORY" node tools/browser-whole-frame-png.mjs
```

The fixture generator uses the repository's authored PNG control. Its deliberately constructed oriented report is a refusal input, not native output or a physical demonstration. The browser course checks atomic own-bundle refusal, separately imported report refusal, unchanged original-PNG export after a failed replacement, and a delayed selected-file read retired by a newer source. These controls do not replace the separate attributed scissors course.
