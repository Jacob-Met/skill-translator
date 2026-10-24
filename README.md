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

## Challenge a rule with another demonstration

The **additional observation workbench** closes the loop between a proposed relationship and an observed outcome. Select a source mark, enter a differently sized sheet and its observed mark in physical millimetres, name the source, and declare a measurement uncertainty radius. Label each entry as an authored example or a reported measurement. The app checks all five supported rules against every additional observation: proportional position, or fixed clearance from the left, right, top or bottom edge.

Candidate parameters remain anchored to the original source annotation. A rule stays compatible only if every predicted point is inside the corresponding observation's uncertainty circle. A workpiece too small for its fixed offset contradicts that candidate explicitly. Practice tolerance does not substitute for measurement uncertainty. Repeated same-size observations do not resolve identical predictions, conflicting observations may contradict every candidate, and a single remaining candidate is only a survivor within this limited rule family. No probability or expert-intention claim is produced.

The source-selectable comparison plot shows the entered mark, its uncertainty circle and numbered predictions. A bounded search over 16 sheet-size combinations proposes a next observation by how many pairs of remaining rules have non-overlapping uncertainty circles. It refuses to manufacture a useful distinction when the measurement radius is too large or two rules remain geometrically identical. The dimensions are a mathematical proposal, not permission or a safety judgment for physical work.

Export observations to retain them; reopen them after loading the corresponding source annotation. Each record binds to source dimensions, corners, provenance and the original landmark pixel. If the source includes image metadata, its SHA-256 digest and pixel dimensions are also bound; renaming the same image does not invalidate it. A mismatched import is refused transactionally. A successfully replaced source clears previous comparisons; adding a new mark preserves evidence for unchanged marks. Data stays in the browser session until explicitly exported. Source-calibration uncertainty, sheet-dimension error and physical variability are not modeled by the added observation radius; predictions condition on the supplied reference geometry.

An analytic example: on a 100×80 mm source, a mark at (20,30) mm is compatible with every rule. On a 200×160 mm sheet, a mark at (20,60) mm with ±0.5 mm measurement uncertainty supports only fixed-left clearance; (40,60) supports proportional position. If both are entered as observations of the same relationship, every supported rule is contradicted. These are authored controls, not a measured learning study.

You can load your **own local annotated geometry JSON** (≤256 KB) without uploading it. The tool visualizes annotations, transfers each declared invariant and refuses degenerate calibration or a target too small to maintain fixed physical clearance. It does **not** infer invariant types from video; the author must label each relationship.

## Annotate a source photograph

Open **Annotate your own source photo** or visit `/capture`. Choose a local PNG or JPEG, enter the measured width and height of a flat workpiece, and select its four corners in top-left, top-right, bottom-right, bottom-left order. You can click the photo or use numeric coordinates. Apply the calibration, then click an observed mark and explicitly give it a proportional or physical-edge meaning and a positional tolerance.

Download the annotations and import that JSON into Task Space. Use **Pair the original photo** to display the original pixels under the annotations. The application checks the complete file digest, decoded dimensions and pixel orientation; a different image cannot silently inherit the annotations. Renaming the original file is fine. Existing authored JSON still works without a photo. Invalid replacement files preserve the accepted source and marks.

The photo remains in browser memory and is not embedded in the annotation JSON or uploaded. Select it again after reopening the workbench. Supported images are bounded at 12 MB, 24 megapixels and 8192 pixels per side. JPEG coordinates use the browser-oriented image, including EXIF rotation. Calibration is a planar model based on the supplied dimensions; a successful import does not establish those measurements, expert intent, contact, or physical task success.

### Reopen and revise source annotations

In Source Studio, expand **Reopen saved annotations with their original image**. Select the annotation JSON and its original photo or saved frame PNG, then choose **Reopen for editing**. The complete image digest, dimensions and orientation must match before either accepted file is replaced. A different or malformed file leaves the current work intact; renaming identical image bytes is allowed. Annotation files are limited to 256 KiB to remain compatible with Task Space's source importer.

Use **Edit** beside an existing mark to change its pixel position, label, relationship or tolerance while retaining its stable identity and source context. **Cancel mark edit** discards the draft. **Remove** deletes that mark; remaining marks keep their IDs. Removing the last mark leaves an editable calibration draft, with source export disabled until another valid mark is added. Calibration revisions preserve author provenance, unknowns and any video-frame metadata, and are refused if existing pixel annotations would fall outside the revised sheet.

Download the revised annotations to save them. This replaces no source file automatically. Reopening a video frame's PNG checks its image identity and preserves the supplied clip/timing record; it does not re-open or verify the original video clip. As elsewhere, metadata is a supplied record, not an authenticated claim of expertise or physical success.

## Choose a moment from local footage

In Source Studio, expand **Use a moment from a demonstration clip** and select a local MP4 or WebM supported by your browser. Clips are limited to 128 MB, three hours and the same frame-size bounds as photos. Play, pause or enter a time, then choose **Use this frame**. A captured frame starts a new calibration; previous work remains accepted until capture succeeds. A newer photo or clip selection cancels an unfinished frame capture.

The studio copies pixels inside the browser's presented-frame callback. It keeps the requested seek time separate from the reported presentation timestamp: asking for 1.25 seconds in a two-frame-per-second clip can select the frame presented at 1.00 seconds. If a decoder does not present an unchanged paused frame, the clip advances briefly while muted and pauses on the received frame; its reported time identifies the actual extracted pixels. The source record binds the complete original clip digest, reported time, decoded dimensions and the extracted PNG digest. These describe a local decoded source, not physical contact or skill inferred from motion. A browser without presented-frame timing can still use the photo workflow.

Choose **Save frame PNG**, calibrate and annotate it, then download the annotations. Reopen the JSON in Task Space and pair that saved PNG. Video bytes remain on the device and are neither embedded in exports nor uploaded. Frame metadata checks consistency with its image; it is not a cryptographic attestation of a manually edited JSON file. The complete source record remains inspectable in exports.

## Practice the complete task

Choose **Practice the complete task** to carry the current source, dimensions and view into a separate practice surface. Each mark retains its placement while you select another. Place by click, keyboard or physical coordinate entry; hide target marks for an unassisted geometric attempt. **Review complete attempt** checks every actual placement against its own tolerance and keeps missing marks explicitly incomplete.

For two or more placements, a descriptive common-translation diagnostic separates mean displacement from remaining local errors. It shows a hypothetical shared shift while leaving actual coordinates and the pass/fail result untouched. It does not identify a physical cause, prove learning or move marks for the user. **Try a fresh round** archives the previous complete or partial attempt and clears the new round; up to 21 rounds can be retained before beginning a new exported session.

Export the session and source annotations to reopen the same setup. Outcomes are recomputed from placements; saved verdict fields are not trusted. Sessions bind source geometry, image identity where present, transfer rules, tolerances and target dimensions. Mismatched imports are refused transactionally. Open `/practice` directly to use the authored example.

## Challenge the original calibration

Open **[Calibration Lab](http://127.0.0.1:8787/calibration)** from Task Space to investigate whether a rule conclusion depends on how its original source was read. Load the same source annotation JSON and exported observation JSON, or choose the clearly labeled authored example. The lab reuses the maintained perspective calibration, five rule interpretations and observation scoring.

A named alternative reading can change the original sheet dimensions, its four pixel corners, and the selected landmark's pixel location. It keeps the original image identity and observation anchors unchanged. Declare whether the entry is a proposed reading or a repeated annotation; the software does not independently verify either label. The original calibration always remains in the comparison. Up to 24 alternatives can be entered for a selected source mark.

Each complete `(rule, source reading)` explanation must fit **every** observation within that observation's declared measurement radius. The lab never chooses one reference dimension for one trial and another reference dimension for the next. The matrix shows which complete readings survive, which trials contradict them, and whether a tempting apparent fit would require switching the original source per trial. A rule can remain compatible under every entered reading, depend on a particular reading, or have no coherent reading. These are finite compatibility statements, not probability, votes, exhaustive uncertainty bounds or proof of expert intent.

For an analytic example, an original 100 × 80 mm source has a mark at (20,30) mm. An observed mark at (20,60) mm on a 200 × 160 mm sheet agrees with fixed-left clearance under that original reading. If an explicit alternative reads the original mark at (10,30) mm, proportional position also explains the same result. Both explanations remain visible. A new result at (30,90) mm on a 300 × 240 mm sheet distinguishes them. These are authored controls; the alternative's plausibility must come from actual source evidence, not from its ability to fit the result.

The next-observation search compares the **sets of predictions** from all surviving complete explanations at 16 bounded sheet-size combinations. A rule pair separates only if its closest cross-rule predictions are farther apart than twice the proposed observation radius. It does not average away alternative calibrations. If all tested sizes remain ambiguous, the lab says so. If any surviving explanation cannot fit a proposed sheet, that dimension combination is excluded. The proposal is a geometric comparison, not a physical action instruction.

The original/alternative geometry and observed-placement plots follow the selected reading and trial. The lab displays annotation geometry rather than original photo pixels; use Source Studio or Task Space to inspect paired image pixels. Source annotation and observation imports are validated before replacing accepted data. Reopening a saved investigation includes its source, explicit assumptions and source-bound observations; results are recalculated rather than trusted from a saved verdict. Export the selected investigation to retain it. Switching marks retains their alternative readings during the session; a new source clears prior comparisons. No data is uploaded or persisted by the server.

This investigates finite source alternatives, not a distribution over all possible calibrations. Observation dimensions, physical variability and unentered source readings may still change the outcome. Alternatives chosen after seeing the observations are exploratory; agreement is not an independent held-out validation. A single surviving rule remains a survivor within these five modeled relationships, not a demonstrated physical skill or learning benefit.

The focused native course is `node --test test/calibration-evidence.test.mjs`. The actual browser course, using the same optional Puppeteer/Chrome setup as the original workbench, is `node tools/browser-calibration-evidence.mjs`. It exercises changed-source ambiguity, contradiction, rejected imports, coherent-reference enforcement, source-bound export/reopen and a fresh 390px browser.

## Source JSON contract

The compact schema is illustrated by [src/demo.mjs](src/demo.mjs). Supply an object with:

- **title, provenance:** the origin of the observations/annotations.
- **source:** an object containing widthMm, heightMm and corners. Physical dimensions are in millimetres; corners are four pixel coordinate objects with x/y, ordered **top-left, top-right, bottom-right, bottom-left**. Legacy authored sources use a 520×390 illustration frame. Photo-backed sources additionally supply **image** with full sha256, widthPx, heightPx, mimeType (`image/png` or `image/jpeg`), name, and pixelCoordinates (`browser-oriented`). Their source view uses those image dimensions.
- **landmarks:** 1–30 annotations, each with a unique id, label, sourcePx coordinate object, toleranceMm and optional why. Supply kind of either fraction or edge_offset_mm; the latter also requires edge of left, right, top or bottom. Fractional landmarks preserve normalized u/v positions. Edge-offset landmarks preserve perpendicular physical clearance in **mm** and along-edge fractional position.
- **unknowns:** optional list of explicitly absent or unresolved measurements. These are displayed as limitations, not inferred properties.

No source file or practice attempt leaves the browser through an API. Export is user-triggered. Local input files are not persisted by the server. For real source data, obtain appropriate rights, consent and expert annotation review.

## Geometry and deliberate limits

Four page corners define a 2D projective homography. Source pixel annotations are mapped to normalized page coordinates and transferred into a differently sized physical sheet. Mirroring is **display-only**, not an assessment of left- versus right-handed mechanics. Coordinates and distances are informational landmarks, not safe force, adhesive, grain direction, tool contact, body motion or validated physical task outcomes. A planar view does not measure depth or pressure. Passing a positional tolerance does not establish skill acquisition or expert equivalence.

Local photos and selected video frames now supply inspectable pixels. Automatic object-state interpretation, contact measurement, expert correction, independent learner trials, and genuine NVIDIA model/Nebius runtime integration remain **unimplemented and unqualified**. The [product seed](docs/PRODUCT_SEED.md) remains an open-ended vision rather than a completion checklist.

## Actual Chrome course

An optional real-browser QA course uses separately installed Puppeteer and Chrome, neither a production dependency. On a machine that already has them, set PUPPETEER_PATH to the module directory and CHROME_BINARY if needed.

    PUPPETEER_PATH=/path/to/puppeteer node tools/browser-smoke.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/capture-browser-smoke.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/capture-editing-browser.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/video-browser-smoke.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/browser-evidence.mjs
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/browser-practice.mjs

The original course exercises rendered source/target geometry, a failing attempt, target resizing, contrasting physical interpretations and their counterfactual size suggestion, mirrored accurate placement, keyboard correction, hidden goals, valid/invalid local imports, mobile layout, exceptions and offsite requests. Fictional screenshots and the browser receipt are retained under [docs/receipts/task-space-20261024](docs/receipts/task-space-20261024) after running it. Do not treat browser tests as proof of physical skill, video perception or provider inference.

The capture course generates an explicitly authored bitmap locally, then exercises PNG/JPEG admission, clicked and numeric calibration, annotation export, independently checked image hashes, wrong-image refusal, stale-source replacement, legacy imports and 390px layout. `RECEIPT_DIR` can direct its screenshots, input fixtures and JSON receipt outside the checkout. Production needs neither Puppeteer nor a model account.

The video course additionally uses an installed FFmpeg to generate an original changing-frame clip, then checks selected pixels against the known frames, independent clip/PNG hashes, requested versus presented times, invalid replacement rollback, cancelled delayed encoding and the exported-frame handoff. FFmpeg is a QA dependency only; source capture uses the browser's decoder.

The evidence course exercises additional demonstrations, contradictory results, uncertainty-sensitive experiment proposals, actual observation downloads, source binding, transactional reimport, source replacement and fresh mobile reopening. Its inputs are analytic authored controls. It writes review screenshots and receipts to `docs/receipts/rule-evidence-20261024` (or `QA_OUTPUT`) when run.

The complete-task course checks retained multi-mark attempts, incomplete/failing/passing results, shared-shift diagnosis without automatic correction, mirrored keyboard placement, archived retries, actual session downloads, source/setup mismatch refusal and fresh mobile reopening. Its authored review evidence is written to `docs/receipts/task-practice-20261024` (or `QA_OUTPUT`).


## Independent calibration checks

Open **Check source calibration** in the workbench header (or `/calibration-checks`). Import the same source annotation JSON, then provide interior pixel locations and physical coordinates measured independently of the fitted corner transform. Supply a combined measurement bound in millimetres and label each row as an authored example or a reported measurement. The check page reuses the maintained geometry; it never fits to the checks or alters a learner's targets.

The residual map shows measured positions, predictions and disagreement vectors. Fitted corner locations are excluded from independent evidence. The hull is only the spatial extent of the supplied checks, and task landmarks show distance to their nearest check. A compatible result at a few points does not establish accuracy across that hull, validate an uncertainty distribution or demonstrate physical skill. The page does not infer whether a user's measurements are independent.

The two authored controls illustrate agreement and an interior 4 mm discrepancy while the same four corners continue to fit exactly. Actual use requires separately obtained measurements; copying the page's predictions would be circular. Save both source and checks before leaving. Reopening checks requires matching dimensions, corners and source-media identity, and recomputes findings rather than trusting saved results. Invalid imports preserve the current source/check ledger. No measurements are uploaded.

`node test/calibration-checks.test.mjs` runs independent analytic projective, dimension-error, interior-displacement, bounds, spatial-extent and provenance controls. `node tools/browser-calibration.mjs` exercises the real browser import/check/export loop when an existing Puppeteer installation and Chrome are supplied through `PUPPETEER_PATH` and `CHROME_BINARY`.

## From observation evidence to deliberate practice

Open **Review supported rule choices** in the workbench after retaining observations, or visit `/rule-adoption` and open the source and observation JSON files. The page reuses the maintained five-rule evidence analysis. Only rules compatible with observations for that mark can be selected; untested and contradicted rules remain unavailable. No rule is selected automatically. A choice among several survivors keeps those alternatives visible.

Compare the original and proposed target positions, explicitly confirm the interpretation, and open a fresh round in the existing complete-task practice page. Earlier attempts stay attached to their original rules and cannot be reopened as attempts against the changed interpretation. Marks without a new selection keep their original annotation.

Save a decision bundle to retain the complete original source, source-bound observations, explicit selections, and target/display settings. Reopening recomputes the derived interpretation and restores the validated practice setup; saved derived results are not trusted. The original source and the newly interpreted source can also be exported separately. Evidence compatibility is conditional on the supplied calibration and measurement bounds; it does not establish physical skill or exclude relationships outside the tested family.

Verification: `node --test test/*.test.mjs` and `node tools/browser-rule-adoption.mjs` (requires Puppeteer; set `PUPPETEER_PATH` and `CHROME_BINARY` for an existing installation). The browser test exercises the actual workbench → decision → practice path, retained ambiguity, conflicting observations, source anchoring, saved setup restoration, and mobile layout using authored analytic controls.

## Inspect calibration sensitivity

From complete-task practice, choose **Inspect calibration sensitivity** to carry the exact source, selected mark and target dimensions into `/sensitivity`. Vary explicit bounds on corner coordinates, the source landmark, and source/target dimensions. The view compares the resulting transferred positions with the mark's declared tolerance and retains geometries that cannot be calibrated as visible refusals.

The method evaluates a finite deterministic set of individual and combined perturbations. These are sensitivity samples, not confidence intervals, probabilities or guaranteed error bounds. The assumptions must come from measurements or a clearly declared exploration; small sampled movement does not establish physical accuracy, lens calibration, planarity or expert intent. Use the independent calibration checks for separately measured evidence.

Save the source-and-assumptions experiment to reopen it with results recomputed. Dirty assumption edits disable export until recomputed. **Return to practice** restores the original raw placements, archived rounds, view and goal visibility; the sensitivity experiment never corrects a learner's attempt. Details and receiving evidence are in [docs/CALIBRATION_SENSITIVITY.md](docs/CALIBRATION_SENSITIVITY.md).

## Freeze a prospective new-workpiece challenge

From Calibration Lab, choose **Plan a separate challenge** to carry the selected
training investigation into `/challenge`. The local sessionStorage handoff is
consumed after validation. Alternatively open an exported investigation or start
the explicitly authored example, which offers two draft workpieces at 300×240
and 400×320 mm. No challenge outcomes are prefilled.

Add up to six new workpieces, declare expected measurement radii and explicitly
confirm that outcomes have not been used to choose the plan. **Freeze source,
predictions and plan** retains every complete surviving training explanation.
Only then can separate results be entered. Challenge results never refit the
source readings or revive a hypothesis rejected in training. One coherent source
reading must satisfy all qualified challenges; changing readings per result is
not allowed. Missing or imprecise results remain visible, and cannot hide a known
contradiction established by a qualified result.

Save the frozen plan before collecting results, then save plan + results to
reopen the complete study. Imports validate before replacing accepted state and
late file reads cannot overwrite newer edits. A worse achieved measurement radius
is retained as insufficient precision. Source identity and collection timing are
user-declared: files are not signed acquisition records or trusted timestamps.
Compatibility concerns the finite offered geometric explanations, not expert
intent, learned skill or physical safety. This page adds no cloud call or actuator.

Browser receiving is provided by `tools/browser-challenge.mjs` (requires the same
optional Puppeteer/Chrome environment as other browser courses). Its presence is
not a passing receipt; see integration evidence for executed results.



## Shared-source consistency across task marks

Open `/joint-calibration`, or use **Compare marks under one source** in the Calibration Lab. Select 2–12 original marks and compare one global dimensions/corners reading at a time. Every alternative explicitly retains coordinates for every original mark, including marks outside the selected scope. Numeric controls add complete alternatives and source-bound observations; removing a row recomputes conclusions. The original annotation is never edited.

The authored source-switch example demonstrates why independently supported marks can still have no coherent global reading. Its coherent control shares a 150 mm source width across both marks. The matrix exposes each reading’s per-mark surviving rules and complete-source viability. A mark keeps the same rule across all its observations. Unobserved marks remain untested; counts enumerate finite offered combinations and are not probabilities, physical validation or expert intent. The drawing shows annotation coordinates only, not original photo pixels.

Open a full joint study, an existing single-mark investigation, or a source annotation followed by its observation file. Single-mark alternatives are promoted with explicit original points for the other marks and refused entirely if any other mark becomes invalid. Source and observation anchors are validated before replacement. Exported input-only studies reopen and recompute results; asynchronous imports cannot overwrite newer edits. Scope changes retain out-of-scope observations.

Run the actual browser course with `PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/path/to/receipts node tools/browser-joint-calibration.mjs`. It exercises the real calibration handoff, source-switch and coherent controls, numeric controls, source-bound imports, transactional refusal, delayed reads, exact reopening and a fresh 390 px keyboard flow. These are authored browser controls, not claims of physical measurement.
