# Receive original-frame edge proposals with OpenCV 5

The maintained source-edge producer now accepts both native HoughLinesP endpoint layouts: integer N×4 arrays from the received OpenCV5 runtime and legacy N×1×4 arrays. It refuses other layouts before producing a partial report. The fixed Canny/Hough settings, complete edge field, every candidate endpoint, support geometry, ROI limits and original PNG identity checks are unchanged.

The prior producer failed on all eight predeclared original scissors/cardstock tiles because indexing raw[:,0] reduced an N×4 endpoint row to a scalar. The repair normalizes only the two explicit complete layouts. Ten native tests cover the seven maintained controls plus full-report layout equivalence, malformed layouts and exact endpoint-pair preservation. Legacy-layout equivalence is exercised within the actual OpenCV5 runtime; it is not a claim of a separately executed older runtime.

## Original demonstration course

The existing attributed Aerra scissors/cardstock clip supplies unchanged original1920×1080 PNGs at3.012,4.978,7.012 and9.012seconds. A predeclared two-tile partition, [0,0,1920,540] and [0,540,1920,540], covers every original pixel. The tile seam is an analysis boundary, not a claim of whole-frame edge continuity. No ROI, threshold or candidate was selected after observing results. All eight requests retain complete fields and every proposal. The maintained consumer saves one complete four-moment study for each tile, because its existing study retains one report per moment. Both studies remain unreviewed.

Actual local OpenCV5.0.0 with NumPy2.3.5 produced1–17 candidates and1,662–11,534 edge pixels per tile. The maintained HTTP/native/browser path independently reproduces the eight exact reports, saves original source PNGs and all reviews, reopens at390px and refuses a wrong PNG digest without replacing accepted evidence. These are image-space proposals, not semantic object labels, material contact, persistent identity, physical skill success or learning evidence. This local execution is neither Nebius/NVIDIA integration nor AWS qualification.

## Reproduce

Use an explicitly selected Python environment containing OpenCV/NumPy:

```sh
PYTHONPATH="$OPENCV_RUNTIME" python3 test/sequence-edge-native.test.py
PYTHONPATH="$OPENCV_RUNTIME" SKILL_EDGE_PYTHON="$PYTHON_BINARY" \
BROWSER_HELPER="$EARTH_BROWSER_HELPER" CHROME_BINARY="$CHROME_BINARY" \
QA_OUTPUT="$NEW_OUTPUT_DIRECTORY" SOURCE_BUNDLE="$ORIGINAL_SEQUENCE_BUNDLE" \
NATIVE_REPORTS="$INDEPENDENT_REPORT_DIRECTORY" \
node tools/browser-opencv5-edge.mjs
```

The receiver expects the retained four-frame sequence and independent reports named frame-0-tile-0.json through frame-3-tile-1.json from the fixed partition above. Supply the maintained browser helper and ordinary sandbox-enabled Chrome explicitly. No runtime download, credential change or original-source substitution occurs. Earlier failed native and browser attempts are retained separately; only the final completed course qualifies the consumer.
