# SKILL TRANSLATOR — Task Space Lab

SKILL TRANSLATOR aims to explain and adapt skilled physical work without treating an expert's motion as the only correct motion. The first **working source/consumer slice** is a local browser geometry workbench, not automatic skill extraction.

## Try it

Requires Node.js 20+, with **no dependency install and no service keys**.

    npm test
    npm start

Open http://127.0.0.1:8787 in a browser. The server binds loopback only and its Content Security Policy disallows external connections.

The included demonstration is **authored, synthetic 2D bookbinding registration geometry**. Its four corners simulate a pictured sheet; three annotated source landmarks represent a fixed distance from the spine edge, a fractional page alignment and a fixed top-edge index. Change the target sheet dimensions, select a mark and switch the workspace to a mirrored left-handed view. Physical edge names and transferred targets do not change merely because the view is mirrored. Click/drag or use arrow keys to place an attempted mark, press **Evaluate placement**, and inspect measured millimetre error against the authored tolerance. Hide targets for less-guided practice, or export a local JSON receipt of the geometry and attempt.

The **competing interpretation** inspector treats the same original landmark as potentially meaning another physical-edge clearance or a proportional position. Its dashed alternative position and numerical separation update with sheet size, while a bounded counterfactual proposes a different sheet size that would separate predictions. This identifies useful follow-up **observations**, not the correct rule or a real demonstration outcome.

The **source annotation studio** also lets you click a point directly on the pictured sheet (or type source pixel coordinates), name it, explicitly choose proportional or fixed-edge semantics, set its tolerance and add the mark transactionally. Invalid source points or incompatible physical rules are refused without overwriting existing annotations. Download the revised annotation JSON locally to retain and reimport your evidence; the server does not store it.

You can load your **own local annotated geometry JSON** (≤256 KB) without uploading it. The tool visualizes annotations, transfers each declared invariant and refuses degenerate calibration or a target too small to maintain fixed physical clearance. It does **not** infer invariant types from video; the author must label each relationship.

## Annotate a source photograph

Open **Annotate your own source photo** or visit `/capture`. Choose a local PNG or JPEG, enter the measured width and height of a flat workpiece, and select its four corners in top-left, top-right, bottom-right, bottom-left order. You can click the photo or use numeric coordinates. Apply the calibration, then click an observed mark and explicitly give it a proportional or physical-edge meaning and a positional tolerance.

Download the annotations and import that JSON into Task Space. Use **Pair the original photo** to display the original pixels under the annotations. The application checks the complete file digest, decoded dimensions and pixel orientation; a different image cannot silently inherit the annotations. Renaming the original file is fine. Existing authored JSON still works without a photo. Invalid replacement files preserve the accepted source and marks.

The photo remains in browser memory and is not embedded in the annotation JSON or uploaded. Select it again after reopening the workbench. Supported images are bounded at 12 MB, 24 megapixels and 8192 pixels per side. JPEG coordinates use the browser-oriented image, including EXIF rotation. Calibration is a planar model based on the supplied dimensions; a successful import does not establish those measurements, expert intent, contact, or physical task success.

## Source JSON contract

The compact schema is illustrated by [src/demo.mjs](src/demo.mjs). Supply an object with:

- **title, provenance:** the origin of the observations/annotations.
- **source:** an object containing widthMm, heightMm and corners. Physical dimensions are in millimetres; corners are four pixel coordinate objects with x/y, ordered **top-left, top-right, bottom-right, bottom-left**. Legacy authored sources use a 520×390 illustration frame. Photo-backed sources additionally supply **image** with full sha256, widthPx, heightPx, mimeType (`image/png` or `image/jpeg`), name, and pixelCoordinates (`browser-oriented`). Their source view uses those image dimensions.
- **landmarks:** 1–30 annotations, each with a unique id, label, sourcePx coordinate object, toleranceMm and optional why. Supply kind of either fraction or edge_offset_mm; the latter also requires edge of left, right, top or bottom. Fractional landmarks preserve normalized u/v positions. Edge-offset landmarks preserve perpendicular physical clearance in **mm** and along-edge fractional position.
- **unknowns:** optional list of explicitly absent or unresolved measurements. These are displayed as limitations, not inferred properties.

No source file or practice attempt leaves the browser through an API. Export is user-triggered. Local input files are not persisted by the server. For real source data, obtain appropriate rights, consent and expert annotation review.

## Geometry and deliberate limits

Four page corners define a 2D projective homography. Source pixel annotations are mapped to normalized page coordinates and transferred into a differently sized physical sheet. Mirroring is **display-only**, not an assessment of left- versus right-handed mechanics. Coordinates and distances are informational landmarks, not safe force, adhesive, grain direction, tool contact, body motion or validated physical task outcomes. A planar view does not measure depth or pressure. Passing a positional tolerance does not establish skill acquisition or expert equivalence.

This first capability opens subsequent work on observed video, object states, contact measurement, expert correction, independent learner trials, and genuine NVIDIA model/Nebius runtime integration. Those remain **unimplemented and unqualified**. The [product seed](docs/PRODUCT_SEED.md) remains an open-ended vision rather than a completion checklist.

## Actual Chrome course

An optional real-browser QA course uses separately installed Puppeteer and Chrome, neither a production dependency. On a machine that already has them, set PUPPETEER_PATH to the module directory and CHROME_BINARY if needed.

    PUPPETEER_PATH=/path/to/puppeteer node tools/browser-smoke.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/capture-browser-smoke.mjs

It exercises rendered source/target geometry, a failing attempt, target resizing, contrasting physical interpretations and their counterfactual size suggestion, mirrored accurate placement, keyboard correction, hidden goals, valid/invalid local imports, mobile layout, exceptions and offsite requests. Fictional screenshots and the browser receipt are retained under [docs/receipts/task-space-20261024](docs/receipts/task-space-20261024) after running it. Do not treat browser tests as proof of physical skill, video perception or provider inference.

The capture course generates an explicitly authored bitmap locally, then exercises PNG/JPEG admission, clicked and numeric calibration, annotation export, independently checked image hashes, wrong-image refusal, stale-source replacement, legacy imports and 390px layout. `RECEIPT_DIR` can direct its screenshots, input fixtures and JSON receipt outside the checkout. Production needs neither Puppeteer nor a model account.
