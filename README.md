# SKILL TRANSLATOR — Task Space Lab

SKILL TRANSLATOR aims to explain and adapt skilled physical work without treating an expert's motion as the only correct motion. The first **working source/consumer slice** is a local browser geometry workbench, not automatic skill extraction.

## Rehearse a decision from a retained demonstration

Choose **Practice decisions from retained demonstrations** in Task Space, or open
`/decision-practice`. Import a saved demonstration from the existing studio. The
before frame and authored context are shown first; retain your expected visible
change, decision cue and recovery judgment, or explicitly declare uncertainty.
Reveal the actual after frame and supplied account, then record your own
comparison. A reveal before submission stays recorded, including when a draft
was already being typed. Earlier submitted responses remain separate from the
source account.

Save practice separately and reopen it with the matching demonstration. Source
pixels and authored context are validated, actions are replayed, and changed or
late imports preserve accepted work. This is reflective practice without an
automatic correctness or physical-skill score; the source itself may be
incomplete or mistaken. Details and test instructions are in
[Decision Practice](docs/DECISION_PRACTICE.md).

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

### Inspect the pixels supporting a source mark

Open `/mark-inspector` from Source Studio and pair saved annotations with their original photo or frame PNG. Select an existing mark, position a 16–512 pixel crop, and explicitly choose contrast method, polarity, threshold and area limits. The original crop is analyzed without resizing. Inspect the highlighted connected regions and choose one yourself; no component is selected automatically. Boundary-truncated and out-of-workpiece regions cannot be adopted.

**Use selected region center** revises only the mark's source position, retaining its stable identity, authored relationship, tolerance, prior point and extraction decision. Download the revised source and recompute downstream investigations. A saved region can be reproduced from the paired original image. If Source Studio later changes the coordinates manually, the old inspection remains history and is not presented as verification of the new point. Up to eight decisions per mark are retained; exports share the 256 KiB source-reader limit.

The detector is the exact pinned MICROVERSE `analyzePixels` implementation recorded in `vendor/microverse/source-pin.mjs`. Verify its bytes with `node tools/verify-pixel-core.mjs`; update instructions are in `vendor/microverse/README.md`. MICROVERSE retains algorithm ownership. The browser makes no external model or repository request and uploads no image bytes.

This is pixel-region inspection, not automatic craft landmark recognition. Touching features can merge, local contrast can fragment broad marks, and low contrast can yield no region. A centroid is not necessarily the expert's intended point and supplies no accuracy bound or physical-success evidence.

## Choose a moment from local footage

In Source Studio, expand **Use a moment from a demonstration clip** and select a local MP4 or WebM supported by your browser. Clips are limited to 128 MB, three hours and the same frame-size bounds as photos. Play, pause or enter a time, then choose **Use this frame**. A captured frame starts a new calibration; previous work remains accepted until capture succeeds. A newer photo or clip selection cancels an unfinished frame capture.

The studio copies pixels inside the browser's presented-frame callback. It keeps the requested seek time separate from the reported presentation timestamp: asking for 1.25 seconds in a two-frame-per-second clip can select the frame presented at 1.00 seconds. If a decoder does not present an unchanged paused frame, the clip advances briefly while muted and pauses on the received frame; its reported time identifies the actual extracted pixels. The source record binds the complete original clip digest, reported time, decoded dimensions and the extracted PNG digest. These describe a local decoded source, not physical contact or skill inferred from motion. A browser without presented-frame timing can still use the photo workflow.

Choose **Save frame PNG**, calibrate and annotate it, then download the annotations. Reopen the JSON in Task Space and pair that saved PNG. Video bytes remain on the device and are neither embedded in exports nor uploaded. Frame metadata checks consistency with its image; it is not a cryptographic attestation of a manually edited JSON file. The complete source record remains inspectable in exports.

## Practice the complete task

Choose **Practice the complete task** to carry the current source, dimensions and view into a separate practice surface. Each mark retains its placement while you select another. Place by click, keyboard or physical coordinate entry; hide target marks for an unassisted geometric attempt. **Review complete attempt** checks every actual placement against its own tolerance and keeps missing marks explicitly incomplete.

For two or more placements, a descriptive common-translation diagnostic separates mean displacement from remaining local errors. It shows a hypothetical shared shift while leaving actual coordinates and the pass/fail result untouched. It does not identify a physical cause, prove learning or move marks for the user. **Try a fresh round** archives the previous complete or partial attempt and clears the new round; up to 21 rounds can be retained before beginning a new exported session.

Export the session and source annotations to reopen the same setup. Outcomes are recomputed from placements; saved verdict fields are not trusted. Sessions bind source geometry, image identity where present, transfer rules, tolerances and target dimensions. Mismatched imports are refused transactionally. Open `/practice` directly to use the authored example.

### Observe a learner's photographed attempt

Choose **Observe a learner photo** in complete-task practice. Pair a separate local PNG or JPEG, identify the four corners of the practice workpiece and annotate the existing task marks. The practice dimensions stay fixed. The page maps these raw pixels through the supplied planar calibration and evaluates them using the same target geometry and tolerances as manual practice. Missing marks remain incomplete.

The image is kept locally. Its complete file digest, decoded dimensions, supplied corners, original mark pixels, evidence class and note are retained in an observation notebook and in the resulting practice round. Reopening a notebook checks that its source and workpiece match, recomputes placements from raw pixels, and requires pairing the exact image before applying. It preserves the current practice history; importing an older observation cannot replace later rounds.

Applying an observation archives any existing placements and begins the next round. A subsequent manual edit is explicitly marked as a manual override while the original photo annotation remains inspectable. Practice exports preserve both current and historical raw evidence. The mapping depends on supplied measurements and annotations; it does not verify a physical mark, planarity, expertise or learned skill. See [the learner-observation guide](docs/LEARNER_OBSERVATIONS.md) for the full local workflow and authored verification controls.

## Rehearse across changing workpieces

Open **Rehearse across changing workpiece sizes**, or visit `/rehearsal`. Use the authored example or open your own source annotations under **Source and planned workpieces**. Declare 2–8 distinct sheet sizes. This separate diagram exercise reuses the maintained placement evaluator; it does not alter complete-task practice or its photo observations.

Every sheet begins with adapted targets hidden. The source author's explanation and tolerance remain available. Place marks by clicking, keyboard or physical coordinates. **Show targets · record help** retains the request and the exact placements that existed before it. Hiding the targets does not erase that history. **Commit placements and review** freezes the sheet, including missing marks, before feedback appears. The next size starts with no placements or target requests.

Export the full source, declared plan and ordered actions. Reopening recomputes assistance records and geometric results; stored verdicts are not trusted. A session contains at most 2048 actions, and exports/imports are bounded at 1 MiB. Invalid replacement files preserve accepted work. Nothing is uploaded or persisted automatically.

The final comparison describes positional results and target requests for each size. It does not estimate a learning effect or establish independent performance: source explanations remain visible, outside help is unknown, and local JSON can be edited. Different workpieces may have different difficulty. Diagram success is not evidence of physical skill, expert equivalence or safe tool use.

Verification: `node test/transfer-rehearsal.test.mjs` and `node tools/rehearsal-browser.mjs` (the latter requires existing Puppeteer and Chrome as described below).

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
    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/mark-inspector-browser.mjs
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

## Timed demonstration account

Open `/sequence` to retain actual local video frames and explain a change through an intended result, visible evidence, supplied sensory cue and recovery note. Saved accounts embed the exact retained PNGs, validate their hashes on reopen and keep actual presented times distinct from requested seeks. The original video remains separate. [Demonstration sequence details](docs/DEMONSTRATION_SEQUENCE.md) describe the source contract, editing, limits and receiving. These authored accounts do not establish physical task success or learning.
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


## Review task relationships

Open `/relationships` to pair the source JSON and an exported Practice session. Declare a pair of source marks, a directed horizontal/vertical separation or straight-line distance, and its allowed difference in millimetres. The reference is recomputed from the source's transfer rules at the retained target size. Each retained round keeps its original point assessment while the new review reports the pair's reference, actual value, signed difference and missing observations. A common translation can preserve spacing while individual points fail; conversely, two individually acceptable points can violate a tighter relationship. Distance alone cannot detect reversed order. These diagnostics describe supplied geometry and authored criteria, not physical causes or learning.

The authored example demonstrates a 4 mm spacing discrepancy despite all individual points meeting their tolerances. Its second round remains empty. Export/reopen retains the complete source and raw practice rounds, revalidates their binding, and recomputes findings. Rules can be removed without changing the session; malformed or mismatched imports preserve the accepted review. Criteria selected after looking at outcomes are exploratory. Native controls: `node --test test/task-relationships.test.mjs`.

## Inspect spacing and orientation in practice

After reviewing an attempt in **Complete Task**, the spacing and orientation panel compares pair distances through the maintained task-relationship evaluator. A distance error larger than the two marks' positional tolerances combined is incompatible with both positions being correct. Passing that necessary check does not establish correct location or orientation.

An orientation-preserving least-squares rigid fit describes the rotation and centroid displacement between intended and observed marks, with residual error after hypothetical alignment. It excludes scaling and reflection, retains missing marks and reports configurations with no unique fitted orientation. Two points alone cannot distinguish a reflection from a rotation. No fitted transform changes placements, source rules, saved rounds or the actual pass/fail result. This is geometric description, not a diagnosis of physical cause or demonstrated learning.

Focused controls: `node test/layout-feedback.test.mjs`. Actual browser receiving: `node tools/browser-layout-feedback.mjs` with the repository's existing Puppeteer/Chrome environment variables.

## Adapt a declared edge-fed tool setup

Choose **Adapt this task to a tool** in Task Space to carry the current source and
workpiece into `/tool-access`. Or open the tool page and import source annotations.
Declare the tool's minimum insertion depth, maximum throat depth, required supported
lateral half-width, available physical approach edges, and where those dimensions
came from. The included dimensions are explicitly authored examples.

The page uses the existing landmark transfer without moving targets, changing
rules, or enlarging tool reach by a mark's placement tolerance. Compatibility
concerns nominal target centers; it does not establish clearance over a mark's
whole tolerance region or an uncertainty range. For every mark and
edge it computes the insertion depth and four signed margins: minimum depth,
maximum depth, and support on either side. Negative margins identify the exact
shortfall. An unavailable edge stays unavailable even if its geometry fits.
The diagram shows the selected approach strip and the unchanged target marks.

The solver enumerates all 15 nonempty subsets of the four physical edges and retains every
inclusion-minimal complete cover: each listed set covers every task mark, and
removing any edge loses coverage. This may reveal that a task requires separate
approaches from opposite edges. It does not prescribe a movement sequence or rank
options by physical effort. Uncovered marks prevent a complete-setup claim.
Changing the workpiece or tool dimensions recomputes the alternatives; pending
input edits disable saving and practice handoff until compared.

This is a declared planar strip model. It requires the lateral strip from the
chosen edge to the mark to fit within the workpiece. It does not infer tool-body
shape, collisions, clamps, thickness, material response, force, or safe operation.
Boundary comparisons allow 1e-9 mm numerical roundoff; this is not physical
uncertainty. Boundary contact is accepted mathematically; any desired clearance belongs in
the supplied dimensions. Reported dimensions remain supplied information, not
verified equipment specifications. Source unknowns stay visible.

Save a study to retain the source, its maintained practice reference, and declared
tool inputs. Reopening checks the reference and recomputes findings; saved derived
verdicts are ignored. Invalid or superseded asynchronous imports preserve the
accepted study. **Practice unchanged targets** opens the existing practice consumer
with the exact source and dimensions, initially hiding targets. The practice
assessment does not acquire a physical tool-compatibility guarantee.

`node test/tool-access.test.mjs` exercises analytic changed-tool/workpiece,
complete-coverage, boundary, failure and source-binding controls.
`PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome
QA_OUTPUT=/path/to/receipts node tools/browser-tool-access.mjs` exercises actual
browser handoff, import/export, conflict inspection and mobile receiving when the
optional existing browser dependencies are available. These are authored geometry
controls, not a physical task or learning study.

## Inspect the extent of a declared contact patch

Open **Inspect a declared contact patch at the task point**, or visit `/footprint`. Load your task annotations or use the authored source. Declare a rectangular or circular patch, its dimensions, orientation, and the registration point inside it that must coincide with the adapted task mark. Coordinates for that registration point are measured from the patch center before rotation, with +x right and +y down. Positive rotation is clockwise in physical sheet coordinates; mirroring changes the view only.

The instrument reuses the maintained task adaptation without changing the source point, rule, tolerance or practice verdict. It computes the full rectangle's oriented support extrema or the circle's analytic extrema, then reports signed clearance from each workpiece edge. Positive values lie inward; negative values are overhang. Values near floating-point precision are labeled **numerical boundary**, which is not a physical measurement tolerance or a certified accuracy interval. The complete declared extent remains visible in the scaled drawing.

The authored control compares a 50 × 10 mm rectangle at 0° and 90°. On a task point 20 mm from the left edge, the first orientation overhangs by 5 mm; the second can fit that same point on a sufficiently tall sheet. This is analytic geometry, not a measured tool, an inferred contact state or a recommended operation.

Retain up to eight alternatives with explicit authored/reported labels and dimension provenance. Revisions keep their IDs. Setup or declaration drafts hide old comparisons and disable export until applied or discarded. Save the full task, declarations and source reference to reopen with results recomputed; source/rule/setup mismatches and invalid replacements are refused transactionally. Source files are bounded at 256 KiB and studies at 512 KiB. No images or measurements are uploaded.

Only the declared planar patch is modeled. Tool body, handle, reach, force, friction, support stiffness, other obstacles and out-of-plane geometry remain unknown. A workpiece boundary is not automatically a forbidden zone, and containment does not establish safe use or physical task success. Decide whether full containment is relevant from actual task knowledge.

Verification: `node test/contact-footprint.test.mjs` and `node tools/footprint-browser.mjs` (actual browser receiving needs the existing Puppeteer/Chrome setup).


## Feature separation

Open `/feature-clearance` to compare declared circular feature footprints across workpiece sizes. The original source and adaptation rules remain unchanged. Inspect every pair's nominal gap and minimum gap over declared placement tolerances, save/reopen the source and declarations, then hand the selected size to existing practice. This is prospective planar geometry, separate from the center-placement score and tool/edge access. See [Feature separation](docs/FEATURE_CLEARANCE.md).

## Reuse declared relationship criteria

In the relationship review, export the current review if you want to retain it,
then choose **Next practice session JSON** and **Replace session, keep declared
relationships**. The new session must match the same original source task.
The declared pairs, relation kinds and tolerances stay unchanged. Reference
separations adapt from the source rules to the new session's displayed target
dimensions. Only that incoming session's rounds are retained; previous rounds
are not merged into it.

A mismatched source refuses while preserving the accepted review. Focused
drills with a different landmark subset remain distinct sources and cannot be
silently attached to the full-task criteria. Selecting another file, loading
another review or changing criteria cancels a pending older session read.
Export/reopen retains the resulting source, session and criteria.

This supports using the same authored criteria across attempts. It does not
authenticate when those criteria were chosen, prove that they predate an
attempt, combine different learners, or establish learning benefit.

## Rehearse declared prerequisites

Open **Rehearse prerequisites** from Demonstration Sequence to retain reasons for step dependencies, try valid alternate orders, and inspect full or partial first attempts against the same checked source frames. [The rehearsal guide](docs/PREREQUISITE_REHEARSAL.md) explains source-bound reopening, actual browser receiving and the limits of this declared-order comparison.


## Inspect a workpiece-response family

Open `/response-family` to condition an affine geometric response on an original demonstrated mark and explicit coordinate bounds from varied workpiece sizes. Inspect the complete compatible coefficient family, unresolved dimension variation and target ranges; raw-study reopening recomputes all conclusions. The source reading and finite coefficient domain remain declared assumptions. [Method, supported workflow and limits](docs/RESPONSE_FAMILIES.md).

## Challenge a frozen workpiece-response family

Open [the separate-workpiece challenge](/affine-challenge) from the response-family investigation. Freeze the original training account and new sizes, save that plan, then receive separate coordinate measurements. The view distinguishes individual agreement from one common model that explains every result, keeps missing outcomes untested, and recomputes raw saved accounts. [Method and actual receiving](docs/AFFINE_CHALLENGE.md). Prospective timing and measurement bounds remain supplied declarations.

## Compare observed order across demonstrations

The [order-evidence workspace](docs/ORDER_EVIDENCE.md) compares retained before/after intervals only after explicit step matching. Inspect repeated, opposing, overlapping or unavailable ordering evidence with original frames; then separately declare any prerequisite reason and export it into the maintained rehearsal. Complete comparison studies retain all examples and source relationships for checked reopening.

## Retain the source behind each response observation

Open `/response-demonstrations` to retain separately calibrated source annotations, explicitly bind their marks to the original reference relationship, and declare independent x/y discrepancy bounds. Reattach each original PNG/JPEG for exact image-identity inspection. Save the complete annotation account to keep every additional source; the separate numeric export opens in the existing Response Lab or affine challenge but does not contain those additional raw annotations. [Source custody, receiving and limits](docs/RESPONSE_DEMONSTRATIONS.md).

The numeric affine challenge now bounds the complete account before accepting a result and saves the same compact JSON representation that admission measures. This prevents repeated source bindings or pretty-print expansion from producing a download that cannot reopen. Oversized additions leave the accepted account intact. [Capacity and replay details](docs/AFFINE_CHALLENGE.md).

The prior #77 composition, including the ordering-evidence changes, passed **320 native checks**, **13 actual sandboxed Chrome Demonstration Sources groups**, and **13 actual sandboxed Chrome affine-challenge groups**, including capacity refusal and exact-boundary download/reopen. These authored controls qualify the source-retention workflow and capacity repair; they do not establish physical calibration accuracy, skill transfer or prospective timing. Those counts cover the prior demonstration and capacity delivery; raw-source prospective receiving is recorded separately below.

The final receiving preserves ordering-evidence routes and the complete current README. [Exact source and commands](docs/receipts/response-demonstrations-20261024/verification.json).

## Challenge separate workpieces while retaining raw sources

Open `/raw-affine-challenge` from Demonstration Sources and import the saved complete annotation account. Freeze that raw training evidence and a separate-size plan before receiving outcomes. Each outcome retains its own calibrated annotation, explicitly corresponding mark and discrepancy bounds. Inspect its matching original image, compare individual compatibility with one common original model, and save the complete raw challenge for recomputed reopening. Outcomes never refit training or change the original prediction ranges. [Workflow and limits](docs/RAW_AFFINE_CHALLENGE.md).

The #81 composition on readiness-practice main `09ae668bf2194d686a0da7c81a15bb37ab124583`, preserving merged #77, passed **336 native checks with no failures or skips**, including **nine raw-challenge controls**, and **13 actual sandboxed Chrome raw-challenge groups**. This is a separate browser course from the prior Demonstration Sources and numeric affine-capacity courses. It covers complete raw download/reopen, unchanged predictions, explicit source binding, wrong-image and malformed-input retention, late-work cancellation, and 390px inspection/removal. [Received source and verification scope](docs/receipts/raw-affine-challenge-20261024/verification.json). All examples are authored analytic and PNG controls; they do not validate physical calibration, skill transfer or the declared prospective timing.

## Inspect minimal contradictory outcome groups

Open `/affine-outcome-conflicts` with a retained [raw prospective challenge](docs/RAW_AFFINE_CHALLENGE.md). The receiver evaluates every nonempty subset of up to six received outcomes against unchanged frozen training, then shows all inclusion-minimal contradictory groups. Each member opens its own retained calibration, explicit landmark correspondence and supplied bounds; original pixels can be reattached through exact image-identity admission.

Minimality is group-local, not a recommendation to remove evidence. A conflicting group does not identify a faulty measurement, prove a causal explanation or validate skill transfer. Missing outcomes remain untested. Invalid, over-capacity or unavailable analyses are explicitly refused; previous accepted results are labeled while another import is pending or refused. Saving preserves the compact raw account, and groups recompute on reopening.

See [the interpretation and receiving guide](docs/AFFINE_OUTCOME_CONFLICTS.md). The composed source passed **353 native tests, zero failures/skips**, and **nine actual sandboxed Chrome groups**, with independent source review and parent desktop/390px inspection. [Exact receiving receipt](docs/receipts/affine-outcome-conflicts-20261024/verification.json). Prior #81 receiving remains recorded separately.

### Learner-photo annotation regions

From the photo observation page, open **Inspect annotation bounds in a new tab** to inspect the complete mapped region of a declared pixel rectangle under the fixed calibration. Compare conditional distance extrema with the unchanged point tolerance result, preserve missing marks, and export/reopen source-bound inputs. Original photo drafts and practice sessions remain intact. See [annotation-region assumptions and receiving](docs/ANNOTATION_BOUND.md). This does not estimate calibration uncertainty or establish physical accuracy or skill.

## Compare declared context changes

Open `/context-order` from Prerequisite rehearsal to compare complete sequential orders under imported prerequisites and explicitly authored context labels. The bounded exact solver reports one representative and the count of optimal orders, while retaining original frames and the learner’s first proposal unchanged. Save partial declarations, reopen and recompute, or export the original rehearsal. Fewer declared context changes does not establish physical efficiency, readiness, completion or learning. See [the context-order model](docs/CONTEXT_ORDER_MODEL.md) for assumptions and receiving.
