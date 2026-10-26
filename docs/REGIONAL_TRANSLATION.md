# Regional image-shift comparison

Open an interval in the ordinary sequence scanner and choose **Compare shifts across eight fixed image regions**. The scan itself still samples the original local clip through the maintained browser acquisition path. Opening the inspection starts a cancellable worker; the original samples are not detached or modified.

The complete common interior for the ±16 integer search is divided into four columns and two rows. Every region uses the same reference pixels at all 1089 candidate shifts and fits its own lower-median additive brightness offset with the existing RGB L1 metric. Every exact minimizing shift remains available. No seed point, crop or region is supplied by the user, and no favorable tile is selected or discarded. Small images that cannot supply eight regions of at least3×3 pixels are unavailable as a whole.

For a160×90 sample, the regions partition7424 reference pixels, the same pixels as the maintained whole-image ±16 comparison. The omitted outer48.44% remains outside this wide comparison; the original whole-image scores and ±4 comparison remain separately available. The regional candidate bank charges the same total reference-pixel comparisons as one whole-interior search, plus region statistics and validation. The global comparison is a separate additional pass. It is not a free acceleration.

## Reading the result

The earlier figure labels all eight reference rectangles. The later figure draws a rectangle only when its regional appearance fit is unique. Amber denotes tied fits, pink a search-edge fit, and mint a unique interior fit. Later rectangles can overlap; the view does not claim a one-to-one physical mapping. Colors supplement text labels and complete numeric alternatives.

The intersection lists integer shifts that are preferred in every region. Brightness offsets are independently fitted, so a shared shift does not demonstrate common rigid motion. A lower regional residual is expected from the model's added freedom and does not establish greater accuracy. Fixed rectangles may cross objects, repeating texture can remain ambiguous, and none of this identifies a tool, action, contact, original-resolution correspondence or physical identity. The existing calibrated point-motion and original-ROI owners retain those separate scopes.

The eight result summaries are always retained. Each region's full tied alternatives are lazy and paged50 at a time through the existing comparison view. Whole-image rerenders retain completed regional results, open details, alternative pages and focus. The scanner admits one regional worker at a time. Cancellation, changed report/source and detached actions cannot install a stale result. Scan results remain an inspection; source-only saved sequences retain their existing format and original moment images.

## Qualification

`node test/regional-translation.test.mjs` checks two independent regional translations on three texture seeds, a shared translation, all1089flat-image ties in every region, support/refusal boundaries and an independent exhaustive median oracle. Twenty receipts from pre-refactor revision `ad218f4d4f390e1d817b132e4c06c45ab2d9628b` preserve both existing whole-image and change-region outputs. The fixture records the old producer hash and is self-contained; no sibling checkout is needed.

`PLAYWRIGHT_PATH=<installed playwright> RECEIPT_DIR=<new directory> node tools/browser-regional-translation.mjs` encodes a new160×90 gray course, acquires it through the actual scanner, and checks every region against the prescribed two image shifts. The codec tolerance is declared before decoding; pure native tests require zero residual. It also checks1089ties per region, all22pages, keyboard focus through actual whole-image completion, cancellation, stale actions,390px display and original-source save/reopen. This authored course establishes the bounded image-comparison behavior, not real-world skill understanding.
