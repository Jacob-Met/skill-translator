# Original-frame contour walks

The maintained source-edge producer reports straight Hough segments. A curved image boundary can be visible in its complete Canny field without a corresponding straight segment. This auxiliary consumer preserves native pixel walks so a reader can inspect that evidence directly on the original PNG.

## Produce and inspect

Use the same original-PNG request as `sequence-edge-native.py`, with `representation: "complete-field"`. The native request retains `momentId`, `image`, `origin`, `roi` and `pngBase64`.

```sh
python3 tools/sequence-contours-native.py < original-request.json > contours.json
```

Run the maintained server and open `/sequence-contours`. Load the original demonstration sequence, then the native contour report. The source bundle must contain every retained PNG. Choose all walks or an individual walk; optionally show the complete edge field and the pixels omitted by native walks. Saving retains the original sequence and every original PNG plus the complete native report. Reopening validates those inputs again.

This increment depends on the separately qualified OpenCV 5 Hough layout repair. It does not change the existing edge report format, straight-edge review, source acquisition, regional placement, refinement or semantic decision mechanisms.

## What the output establishes

The producer calls the maintained original-PNG decoder and fixed Canny/Hough producer unchanged. It then runs OpenCV `RETR_TREE` with `CHAIN_APPROX_NONE` on that exact complete binary field. All walks and native hierarchy references are retained in original image coordinates. The complete field and straight-segment report remain available, unchanged. Capacity limits refuse the whole result rather than truncating it: at most 4,096 walks and 131,072 vertices within the existing 1,048,576-pixel ROI bound.

A native walk is not a physical object, identified part, semantic curve, contact, persistent identity or success criterion. Nested and double-sided walks are expected. Walks can omit interior pixels, so the report retains an exact omitted-pixel field and separate visited/omitted counts. The browser checks source identity, lattice adjacency, edge membership, hierarchy consistency and exact coverage accounting. It does not rerun OpenCV or prove that an imported report is exactly the native result. Selecting a walk is a viewing choice and adds no physical label.

## Executed evidence

Local OpenCV 5.0.0 processed eight predeclared half-frame tiles from the retained attributed scissors demonstration, with unchanged original PNGs and fixed edge settings. All eight embedded edge reports equaled the previously received edge reports. Walks omitted 2 of 4,289 edge pixels in the first upper tile and 6 of 11,534 in the final lower tile; the other six tiles had no omitted edge pixels. The original 4.978-second frame visibly contains a notch followed by the auxiliary walks. This observation establishes useful image evidence, not a correct skill interpretation.

The native test independently enumerates all 512 binary 3×3 fields using lattice flood-fill and exact set partition checks. It checks every component is represented, all walk steps/closure are adjacent, every vertex belongs to its original component, coverage and omitted fields are exact, and the input is unchanged. Additional controls cover filled-interior omission and complete capacity refusal.

The browser course loads all eight reports through the maintained server, saves exact original PNGs and complete reports, reopens in a fresh 390-pixel view, checks all overlay images decode, and rejects a wrong source identity without replacing accepted evidence. An earlier receiving screenshot exposed a blocked data-image overlay; that failed visual receipt is retained, and the page-specific image policy is corrected in the qualified course.

## Reproduce receiving

```sh
python3 test/sequence-contours-native.test.py
BROWSER_HELPER=/absolute/path/to/maintained/browser-session.mjs \
CHROME_BINARY=/absolute/path/to/sandboxed/chrome \
QA_OUTPUT=/absolute/path/to/fresh/output \
SOURCE_BUNDLE=/absolute/path/to/original-sequence.json \
NATIVE_REPORTS=/absolute/path/to/eight-native-reports \
node tools/browser-contours.mjs
```

The eight reports are named `frame-0-tile-0.json` through `frame-3-tile-1.json`. Use an ordinary sandboxed browser and a fresh task-owned run directory. This qualification is local; it is not a Nebius execution, cloud deployment, perception-accuracy or physical reliability result.
