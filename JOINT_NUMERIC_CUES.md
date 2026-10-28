# Paired numeric demonstration explanations — local candidate

Run `node tools/joint-numeric-cues.mjs INPUT.json REPORT.json` from this repository. The output path must not already exist. Input is bounded to 8 MiB.

The input contains `format: "skill-translator.joint-numeric-cues/v1"`, `cues: [firstNumericStudy, secondNumericStudy]`, `directions: ["below", "below"]` and a nonempty `basis` explaining the pairing and model. Existing numeric study producers retain the complete original sources and readings. Both studies must retain the identical ordered source comparison, decision labels and optional target step. The two quantity names, units and measurement bases remain separate. The explicit orientation can be `above` for either quantity.

The model is a conjunction of two oriented strict threshold tests. Above negates the quantity and range before applying the test. Both inside/outside label assignments are examined. Every model must agree with every value in every known reading box; the two ranges define a Cartesian product, so this does not infer correlation. Missing readings and labels remain unvalidated and are listed by original row index.

Threshold cells use `(lower, upper]` boundaries in oriented units. A null lower means negative infinity and a null upper positive infinity. Every retained cell is an alternative; its count is neither a probability nor the number of individual models. No boundary is chosen. Target labels are emitted only when every point in the target box and every retained cell agree. Whole original clips are withheld together for descriptive omission checks; this does not establish independent validation or unseen-task accuracy.

An authored three-row account has A at (1,1), B at (3,1), and B at (1,3). Neither coordinate alone distinguishes the labels. The paired low/low model retains both boundaries in (1,3]. Target [0,1]×[0,1] receives conditional A; [3,4]×[0,1] receives conditional B; (2,2) remains unresolved. These are software controls, not a physical operating instruction or measured skill result.

The report includes the complete normalized input in `study`; write that member as the next input to recompute. Findings are derived and are never trusted on import. Source identity checks enforce paired records, not authenticity of editable files.

## Original producer exports and replay

Pair files saved by the maintained numeric-cue page with:

```sh
node tools/pair-numeric-cues.mjs FIRST.json SECOND.json below below "Declared pairing basis" PAIRED.json
node tools/joint-numeric-cues.mjs PAIRED.json REPORT.json
```

Numeric browser bundle V1 and trace-bearing V2 are accepted through the maintained numeric and trace validators. The paired V2 wrapper retains both original input records in `producer_exports`, including comparison and target sequence bundles, PNG bytes, measurement traces and provenance. It separately derives normalized cues for computation; it does not replace the retained exports with normalized records. Comparison, decisions, source frames and target identity must agree. Missing or incompatible original bundle evidence is refused. Raw numeric API studies remain supported explicitly; two raw V1 studies retain the earlier paired V1 format.

Each CLI source file is limited to 4 MiB, and the complete paired input remains limited to 8 MiB. CLI admission checks original PNG digests, header dimensions and retained identities. It does not decode compressed pixels. Browser admission additionally invokes the maintained comparison/sequence image readers to decode original PNGs and verify their dimensions. Those checks establish record consistency, not authenticity or physical skill performance.

For V2 reports, `study` contains the retained producer exports and `normalizedStudy` contains derived computation inputs. Save `study` to replay original evidence. Both individual quantities retain their maintained single-threshold baselines, so joint compatibility can be compared with the simpler accounts.

## Verification status

Run `node --test test/joint-numeric-cues.test.mjs test/joint-consumer.test.mjs test/bounded-json-input.test.mjs test/joint-producer.test.mjs`. Nine native subtests pass on the maintained-server composition, including the independent 486-course threshold oracle, interval corners, original source mismatch, unknowns, orientation, bounded descriptor reads, fatal UTF-8, actual FIFO, retained V1/V2 PNG and trace records, missing bundle evidence and replay. Independent mathematical/source-custody review of the original core is complete; the producer-export adapter has also passed independent contract review.

The prior exact repaired standalone browser course passed both baselines, conditional target display, original download/reopen, 390px layout, refusal and clean console. It does not qualify the subsequently added producer adapter. The maintained-server end-to-end V1/V2 producer course in `tools/browser-producer.cjs` passed on October 27, 2026 (native operation `skill-e7e-producer-browser-f`): actual producer downloads, both CLIs, discoverable navigation, unchanged strict CSP with loaded external CSS, browser PNG decoding, preserved original records on save/reopen, 390px layout and an empty error console. The receiving launcher returns 204 only for favicon requests; all application requests use the maintained server. Normal publication remains outstanding.


Target familiarity is not established. A different retained interval can come from the same original clip; the receiver labels it Retained target. Identity admission is not a claim of novelty or independence.

## Repeat the final browser receiving course

Run `node tools/browser.cjs` with these environment variables:

- `PLAYWRIGHT_MODULE`: installed Playwright module path (default: `playwright`).
- `BROWSER_EXECUTABLE`: approved Chromium executable (default: Playwright Chromium). Chromium sandboxing remains enabled.
- `BASE_URL`: server root URL, including any project prefix; the harness appends `web/joint-numeric-cues.html`.
- `SOURCE_FILE` and `REFUSED_FILE`: absolute paths to the authored valid paired study and its conflicting-decision control. Defaults are `receiving.json` and `refused.json` at the project root.
- `RECEIPT_DIR`: dedicated writable receiving directory; the default is a fresh temporary directory.

The harness checks both rendered single-cue baselines, conditional target, target label, actual raw download/reopen, narrow layout, source/UTF-8 refusal and an empty browser console with no page errors. It retains desktop/narrow screenshots and reopened input during the course, and writes a PASS JSON receipt only after all assertions succeed. Its empty favicon response avoids an unrelated static-server 404. Source qualification still requires running this course on the exact repaired files; authoring this harness does not establish that result.

## Actual maintained producer course

Run `node tools/browser-producer.cjs` with `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, `BASE_URL`, required dedicated `RECEIPT_DIR`, and optional `APP_ROOT`. The server must expose the maintained `/numeric-cue-thresholds` page and its unmodified asset dependencies. The course imports authored PNG/trace controls, saves actual V1/V2 exports through that page, pairs the downloaded exports through both CLIs, follows the discoverable link to `/joint-numeric-cues`, checks strict CSP and loaded CSS, receives/decodes the retained originals, downloads and reopens the paired input, and checks narrow layout and console errors. A PASS receipt is written only after all assertions succeed.

For the original raw-study harness, optional `NUMERIC_PAGE_URL` starts at the maintained numeric page and follows the actual navigation link; without it, the standalone route remains available.
