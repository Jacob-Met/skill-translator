# Hypothetical minimum missing support

First inspect two exact original edge pixels in the whole-frame viewer. The existing connectivity answer remains authoritative. Choose **Inspect hypothetical minimum missing support** for a different finite graph question: minimize absent edge pixels traversed inside the complete original raster, with eight-neighbour moves. Each present pixel costs 0; each absent pixel costs 1. Endpoints must already be present, without snapping.

No field pixels are added, thresholds changed or contours repaired. This is not geometric shortest distance, physical gap length or object identity. Cyan retains the complete field. The dashed white route is hypothetical; orange outlines mark absent pixels. Optional original-coordinate zoom enlarges the same PNG and overlays; switching it off restores the complete frame. Connected inputs have zero missing support and remain labeled connected.

Original connectivity and missing-support traversal have separate allowances of at most eight neighbour visits per raster pixel, within 2,097,152 pixels. Source admission, decoding, allocation and drawing are additional work. The 0–1 deque settles each pixel once; insufficient work refuses without a partial answer.

## Save and reopen

`skill-translator.whole-frame-edge-gap/v1` retains original PNGs, complete native report, exact endpoints and explicit `minimum-absent-pixels` goal. Derived paths and scores are recomputed before source adoption. Wrong goals and invalid sources refuse without replacing accepted evidence. Existing contour and connection-only formats remain separate. Imported-report consistency is not independent browser execution of OpenCV; hypothetical missing support is not a recommendation to edit evidence.

## Reproduce

`node --test test/edge-gap.test.mjs` checks all 512 three-by-three fields and 11,520 endpoint pairs against independent weighted all-pairs distances, including returned bounds, endpoints, adjacency and exact absent-pixel counts. Inadequate work refuses.

The actual original-scissors course uses unchanged OpenCV 5 processing of the retained 1920 × 1080 frame at 4.978 seconds. Its complete field has 6,000 edge pixels. Endpoints (902,192) and (900,194) are disconnected; a hypothetical route through absent (901,193) proves minimum cost 1. Endpoint choices are authored inquiries, not physical labels; source PNG/report bytes remain unchanged.

Run `test/whole-edge-gap.browser.mjs` with `ORIGINAL_STUDY_FILE`, `QA_OUTPUT`, `CHROME_BINARY` and `BROWSER_HELPER`. Supply the maintained whole-frame study for that licensed frame (Aerra Carnicom / CC BY-SA 4.0), an ordinary sandboxed Chrome and a fresh writable output directory. Use Experimental Earth's `tests/support/browser-session.mjs` and its two sibling helpers at commit `c20a357e4e34c0f6de30fb942ae9ed4b08b975c2`. The receiver starts the actual server and exercises real connection/gap downloads, fresh replay, action availability, unchanged original source, zero cost, atomic wrong-goal refusal and 390px original-pixel captures. See the maintained whole-frame source acquisition/producer instructions; authored pixels must not be silently substituted for the original course.
