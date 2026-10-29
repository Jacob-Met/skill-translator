# Connect two selected original edge pixels

Open a complete original sequence and its whole-frame native contour report at `/whole-frame-contours`, or reopen a saved contour study. Enter two exact zero-based original pixel coordinates and inspect their connection. Both points must be present in the complete retained binary edge field; absent pixels are refused without snapping.

The cyan overlay shows the complete field, including pixels omitted by native contour walks. Green and red mark the selected start and end. Yellow is one deterministic shortest eight-neighbour path. Every orthogonal or diagonal move costs one step: this is not Euclidean length. A disconnected answer exhausts the start's connected field component. Neither result establishes a physical boundary, object identity, contact or physical separation. Native threshold settings are unchanged.

The queue admits each pixel once, within2,097,152 original pixels; at most eight neighbour visits per admitted raster pixel are allowed. Insufficient declared work refuses without a partial answer. Imported report/source consistency does not prove that OpenCV was independently recomputed in the browser.

Save with an accepted selected pair creates `skill-translator.whole-frame-edge-connection/v1`. It retains original PNGs, complete report and two coordinates, not a saved path. Reopening revalidates original identity/report and recomputes the path before adoption. Editing an endpoint retires the prior result. Without a selected pair the unchanged contour-study format is saved.

## Reproduction

`node --test test/edge-connection.test.mjs` compares all512 three-by-three binary fields and11,520 admitted endpoint pairs against independent all-pairs shortest distances, plus exact endpoint, unused-bit, diagonal, equality and capacity refusal controls.

`test/whole-edge-connection.browser.mjs` takes `ORIGINAL_STUDY_FILE`, `QA_OUTPUT`, `CHROME_BINARY` and `BROWSER_HELPER`. Supply an ordinary sandboxed Chrome and the maintained Experimental Earth `tests/support/browser-session.mjs` plus its two sibling helpers from commitc20a357e4e34c0f6de30fb942ae9ed4b08b975c2. It starts the real application server.

The retained original-scissors receiving course uses the1920×1080 frame at4.978seconds from Aerra Carnicom's CC BY-SA4.0 video, acquired through the maintained frame producer. Generate its complete report with unchanged `tools/whole-frame-contours-native.py` and retain it with its original sequence. The actual OpenCV5.0.0 field has6,000 edge pixels in70 eight-connected components. Selected endpoints(1376,235) and(1919,423) have a543-step path; endpoint(1747,0) is in a different component. These endpoint choices are authored inquiries, not detector-assigned workpiece identities. The browser course checks both outcomes, actual download/reopen, absent-pixel atomic refusal and390px layout. The original field remains authoritative; no contour-only approximation replaces it.
