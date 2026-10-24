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

## Source JSON contract

The compact schema is illustrated by [src/demo.mjs](src/demo.mjs). Supply an object with:

- **title, provenance:** the origin of the observations/annotations.
- **source:** an object containing widthMm, heightMm and corners. Physical dimensions are in millimetres; corners are four pixel coordinate objects with x/y, ordered **top-left, top-right, bottom-right, bottom-left**. The source SVG is calibrated for a 520×390 annotation coordinate frame, not an image importer.
- **landmarks:** 1–30 annotations, each with a unique id, label, sourcePx coordinate object, toleranceMm and optional why. Supply kind of either fraction or edge_offset_mm; the latter also requires edge of left, right, top or bottom. Fractional landmarks preserve normalized u/v positions. Edge-offset landmarks preserve perpendicular physical clearance in **mm** and along-edge fractional position.
- **unknowns:** optional list of explicitly absent or unresolved measurements. These are displayed as limitations, not inferred properties.

No source file or practice attempt leaves the browser through an API. Export is user-triggered. Local input files are not persisted by the server. For real source data, obtain appropriate rights, consent and expert annotation review.

## Geometry and deliberate limits

Four page corners define a 2D projective homography. Source pixel annotations are mapped to normalized page coordinates and transferred into a differently sized physical sheet. Mirroring is **display-only**, not an assessment of left- versus right-handed mechanics. Coordinates and distances are informational landmarks, not safe force, adhesive, grain direction, tool contact, body motion or validated physical task outcomes. A planar view does not measure depth or pressure. Passing a positional tolerance does not establish skill acquisition or expert equivalence.

This first capability opens subsequent work on observed video, object states, contact measurement, expert correction, independent learner trials, and genuine NVIDIA model/Nebius runtime integration. Those remain **unimplemented and unqualified**. The [product seed](docs/PRODUCT_SEED.md) remains an open-ended vision rather than a completion checklist.

## Actual Chrome course

An optional real-browser QA course uses separately installed Puppeteer and Chrome, neither a production dependency. On a machine that already has them, set PUPPETEER_PATH to the module directory and CHROME_BINARY if needed.

    PUPPETEER_PATH=/path/to/puppeteer node tools/browser-smoke.mjs

It exercises rendered source/target geometry, a failing attempt, target resizing, contrasting physical interpretations and their counterfactual size suggestion, mirrored accurate placement, keyboard correction, hidden goals, valid/invalid local imports, mobile layout, exceptions and offsite requests. Fictional screenshots and the browser receipt are retained under [docs/receipts/task-space-20261024](docs/receipts/task-space-20261024) after running it. Do not treat browser tests as proof of physical skill, video perception or provider inference.
