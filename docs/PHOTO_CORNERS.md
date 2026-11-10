# Original-photo workpiece outlines

## Current gaps and independent review

Independent review of merged `9bd9c09` found a material phone usability gap: proposal controls could occupy the screen while the photograph was elsewhere in the page. Functional phone checks had passed but missed that visual failure. This revision opens an image-first inspection mode with original pixels, draggable corner handles, coordinate entry, zoom, one-pixel correction and explicit draft adoption together. The same mode supports manual placement without a detector proposal. Independent visual recheck is pending in task `skill-translator-photo-use-judge-kestrel71b9`; author checks below are not a replacement for that verdict.

The detector is deliberately limited to well-separated, opaque, approximately four-sided regions. Complex backgrounds, shadows, occlusion, texture, curved boundaries, clipped workpieces and very thin images can yield no proposal or the wrong visible region. Every proposal remains an editable draft. Manual calibration remains available.

## Photographic comparison

The first filled-region-only candidate omitted all four board photographs below. The revised method was developed using `left01.jpg`, then frozen before receiving `left02.jpg`, `left07.jpg` and `left11.jpg`. Author inspection of the retained original-image overlays found that each revised proposal follows the printed checkerboard face; it does not select the surrounding dark backing. The author must measure the same boundary they accept.

| Original OpenCV sample | Initial filled regions | Revised boundaries | Ordinary OpenCV contour baseline |
| --- | --- | --- | --- |
| left01.jpg (development) | No proposal | Printed face outline | Printed face outline |
| left02.jpg (held out) | No proposal | Printed face outline | No proposal |
| left07.jpg (held out) | No proposal | Printed face outline | Printed face outline |
| left11.jpg (held out) | No proposal | Printed face outline | No proposal |
| sudoku.png | Interior cells | Interior cells; whole grid omitted | Whole grid and interior cells |
| box_in_scene.png | No proposal | No proposal | No proposal |

These are six selected photographs and author visual checks, not a representative benchmark, pixel-accuracy ground truth or learning study. The three held-out photographs share the same photographed board and scene; they test different views, not a different environment. The baseline used OpenCV 4.13, Gaussian 5×5, Canny 50/150, RETR_LIST contours, approxPolyDP at 2% perimeter, convex four-point contours and a 1% image-area floor. It was not tuned per image.

Manual corner placement remains the complete fallback and allows the user to choose a boundary the detector does not offer. The automatic path replaces four initial point selections with scan, outline choice and draft adoption; review and any needed correction remain. No human timing or accuracy advantage was measured. No threshold choice can infer which physical dimensions the user intended.

The input source is [OpenCV samples/data](https://github.com/opencv/opencv/tree/4.x/samples/data). Exact source blob IDs, image hashes, candidate coordinates and baseline code are retained with the release evidence. Run `tools/compare-photo-corners.py --output baseline.json image1.jpg image2.png` in the optional OpenCV environment to repeat the ordinary contour baseline.

## Use in the existing Source Studio

Run `node server.mjs` with Node 20 or newer, then open
<http://127.0.0.1:8787/capture>. No package installation, external service or key is needed for this workflow.

1. Choose a local PNG or JPEG. Enter the workpiece dimensions you measured.
2. Select **Find outlines in this photo**. Nothing is chosen or applied automatically.
3. Select an outline to open the image inspector. The original photo, numbered corners, correction controls and draft action stay on one screen. The list is ordered by image area, not probability or intended workpiece identity.
4. Select the corner you want to correct; drag it, tap its intended position, edit X/Y or use the one-pixel arrow controls. Keyboard arrow keys move one pixel; Shift moves ten. Use **1× / 2× / 4×** to inspect the active corner and **Fit** to see the whole image. Use **Rotate labels** if needed so 1–4 mean physical top left, top right, bottom right and bottom left.
5. Select **Use corners as draft**, then review the measured dimensions and select **Apply calibration**. **Close** or Escape discards inspector edits. To place or revise corners without detection, choose **Inspect and adjust corners**. No calibration changes until you explicitly adopt and apply the draft.
6. Add a meaningful source mark. Save an editable source package, or open the existing placement-practice workflow.

The proposal never supplies physical width, height, scale, uncertainty or task semantics. The existing calibration/mark validation still decides whether the authored geometry can be accepted. Accepted source marks retain their original image coordinates when calibration is revised.

## Method and provenance

The browser creates an explicitly disclosed analysis raster of at most 1024 pixels per side. It retains the original image unchanged and maps candidate pixel-cell coordinates back with the separate original/analysis width and height ratios. Preview sampling can shift a boundary; the author should inspect and correct it.

The method compares a global Otsu intensity split and a fixed local-contrast profile through the existing pinned MICROVERSE `analyzePixels` implementation, in both polarities. Boundary-touching and small regions are excluded. A convex hull of each component's pixel cells is simplified as a closed curve. Dense quadrilateral regions can survive directly. Sparse printed or outlined regions additionally require at least 92% support on each proposed side from that same observed component; an open three-sided shape is not completed. At most eight deduplicated candidates are shown and further omissions are explicit.

This is a conventional contour-approximation approach, consistent with the comparison in [OpenCV's square-detection sample](https://docs.opencv.org/3.4.17/db/d00/samples_2cpp_2squares_8cpp-example.html). It does not make an algorithm-novelty claim. The interaction preserves human inspection and correction, as image-annotation systems such as [Label Studio's polygon annotation](https://labelstud.io/tags/polygonlabels) do; SKILL TRANSLATOR additionally carries the accepted geometry into its existing physical-dimension and practice workflow.

The pinned detector remains byte-identical. `node tools/verify-pixel-core.mjs` checks the maintained MICROVERSE source pin. The new algorithm lives in `src/photo-corners.mjs`; the browser worker performs the bounded analysis without blocking the authoring thread.

Saved `source.calibrationDraftEvidence` records the image identity, analysis size, threshold, selected region, corner-label rotation and original proposed coordinates. Accepted corner coordinates are stored separately. Later manual corrections therefore do not turn the old proposal into a claim that the final corners were automatically measured.

## Verification and reproduction

The author ran these on fleet host `hamon-browser-7` using Node 22.23.4 and sandboxed Chrome 156:

- Eight numerical/raster tests: bright and dark oblique regions, multiple alternatives, explicit no-proposal cases, notched shape, original-coordinate mapping/label rotation, transparent/oversized raster refusal, printed interior holes and closed-versus-open boundary support.
- Thirty existing capture, editing, source-package and sequence-capture checks, plus eight maintained native calibration groups and five existing JavaScript calibration-draft groups.
- A real browser course: original 1400×1000 PNG → 1024 preview → explicit choice → corrected 320×210 mm calibration → source mark → JSON and editable package → fresh reopen → existing practice. Alternative selection, rotated labels, no-proposal outcomes, changed-draft retirement and a 390-pixel phone layout were exercised. The retained authored quadrilateral coordinates differed by less than 1 original pixel before manual correction in this one control.
- Exact MICROVERSE detector verification.
- An additional real-photo phone course on OpenCV `left02.jpg`: image and correction/adoption controls within one 390×844 viewport; zoomed drag, button/keyboard nudges, cancel without adopting, a 2-pixel manual correction with original proposed coordinates retained, JSON/editable-package reopen and practice. The 305×198 mm values are test inputs, not measured truth for that photograph. A manual four-corner path without scanning uses the same inspector. Actual phone and desktop screenshots were inspected.

Run the applicable tests with:

```sh
node --test --test-concurrency=2 test/photo-corners.test.mjs test/capture.test.mjs test/capture-editing.test.mjs test/source-package.test.mjs test/sequence-capture.test.mjs
node tools/verify-pixel-core.mjs
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome RECEIPT_DIR=/absolute/new/receipt node tools/browser-photo-corners.mjs
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome RECEIPT_DIR=/absolute/new/inspection node tools/browser-photo-inspection.mjs /absolute/path/to/opencv/left02.jpg
```

The browser course generates its own clearly authored original images, records the actual interaction, and saves desktop/phone screenshots, a short browser video, JSON and an editable source package. It uses the application's normal controls; no target coordinates are passed to the detector. For additional supplied images, use `tools/inspect-photo-corners.mjs /absolute/image.png` with the same environment variables.

The older reference-translation tests require generated native fixtures. The initial run correctly failed because the browser host had no `cv2`. An isolated environment was then created from the repository's unchanged `requirements-native-edge.txt` (OpenCV 4.13.0.92 and NumPy 2.3.5); its documented generator `python test/calibration-translation-native.py` passed all eight native groups and `node test/calibration-draft.test.mjs` passed all five draft groups. The native transfer algorithm is unchanged.

No learning study, expert assessment, contest qualification or measured physical accuracy is claimed.
