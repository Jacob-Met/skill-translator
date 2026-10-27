# Shared-motion practice comparison

Shared-motion practice compares actual placements with every inferred whole-course maximal group from the original demonstrations. It complements the existing positional score without changing adapted targets, point tolerances, practice history or scoring rules.

This continues [issue #398](https://github.com/Jacob-Met/skill-translator/issues/398). The original owner, `hamon-5d7f8b83-20261026`, retains attribution for the original grouping/span contributions and design. Recovery work preserves those branches and continues the unfinished practice comparison.

## Use the existing workflow

1. Open original demonstrations in Relationship Discovery. A complete sequence discovery bundle retains its original demonstration PNGs and annotations.
2. Set the target dimensions in the existing workpiece controls.
3. Choose **Open empty practice**. The existing Practice interface opens in another tab with the first original demonstration and no placements.
4. Make actual placements, retain retries as needed, and export the session from Practice.
5. Return to the same Discovery investigation and declare a separate practice fitted-residual tolerance and written basis.
6. Open the actual Practice export, then inspect its group comparisons and unchanged positional scores.

The tolerance must be finite and between **0 and 1000 mm**, inclusive. The basis must contain non-whitespace text and be at most **2000 characters**. These inputs remain separate from both the original inference threshold and the existing point tolerances. Editing comparison parameters leaves the previously accepted report visible and identifies it as such; recompute before exporting the edited comparison.

## Complete comparison coverage

For every retained historical round and the current round, the assessor compares **every inferred maximal group with every original demonstration**. Selecting a round or group changes inspection only. Overlapping maximal groups remain separate alternatives, and missing group members are never replaced by other placements.

Each complete comparison uses the maintained least-squares proper rigid fit: rotation and translation, without reflection or scaling. Its largest individual point residual must be within the explicit tolerance plus **1e-9 mm numerical slack**. The fitter minimizes squared residuals, not the largest residual directly. This does not search all transformations that might satisfy a maximum-residual threshold.

Results retain original coordinates, actual coordinates, complete fitted residuals and the largest-residual witness. Individual comparisons are supported, outside the fitted threshold, incomplete, or unresolved because a unique orientation cannot be determined. An empty inference or capacity refusal never passes; the original inference status, reason, counts, work and interpretation boundary remain available.

Aggregate success requires a nonempty set with every comparison supported. A successful later round does not erase an incomplete or unsuccessful earlier one.

## Positional scores and source evidence

Each round retains the unchanged `evaluatePractice` result separately. A translated fixed-shape configuration can pass group comparison while failing adapted positional scoring. Conversely, placements exactly matching doubled adapted targets can pass positional scoring while failing the original fixed-shape comparison.

The maintained Practice importer binds the complete canonical reference to the first original demonstration and target dimensions, including provenance, physical dimensions, corners, image identity, landmark coordinates, transfer rules and point tolerances. Reviewed source-coordinate mappings continue through `sharedMotionInputs`; original source identities are shown alongside reference identities.

Admitted photo-observation metadata and detached manual marks survive every round and round trip. This includes image identity, calibration and supplied point annotations. Learner image pixel bytes are not part of the maintained Practice export. Original demonstration PNGs are retained in the complete discovery bundle.

Groups describe the supplied calibrated geometry. They do not establish physical objects, causal necessity, successful skill acquisition or an adopted teaching rule. Temporal spans remain a separate investigation.

## Saving and reopening

**Save comparison and original inputs** retains the complete validated discovery account and raw Practice session. **Save original inputs** retains its existing discovery-only behavior. Reopen either through the existing investigation file input.

The core record uses:

```json
{
  "schema": "skill-translator-shared-motion-practice/v1",
  "study": {},
  "session": {},
  "fitToleranceMm": 0.01,
  "basis": "Explain the chosen exploratory comparison."
}
```

The public APIs are `createSharedMotionPractice`, `importSharedMotionPractice` and `assessSharedMotionPractice`.

The browser envelope uses `format: "skill-translator.shared-motion-practice-bundle/v1"`, with `discovery` holding the ordinary study or complete existing sequence discovery bundle, and `comparison` holding `{session, fitToleranceMm, basis}`. Authoritative verdicts are never serialized. Supplied verdict fields are discarded, and inference and comparisons are recomputed.

Source and comparison admission share one revision and commit together after validation. A failed or stale intake preserves the accepted investigation; its newly staged image URLs are released. A newer successful ordinary source intake clears the old comparison. Saving uses one accepted snapshot and cancels if newer work replaces it before the download.

## Contributor receiving

Focused tests cover both scoring disagreements, foreign sessions, missing historical members, degeneracy, overlaps, changed later sources, forged verdicts, immutable inputs and photo/manual history:

```sh
node --test test/shared-motion-practice.test.mjs test/shared-motion-groups.test.mjs test/practice.test.mjs
```

Follow [CALIBRATION_DRAFTS.md](CALIBRATION_DRAFTS.md) for the documented native fixture preparation before the complete `npm test` suite.

```sh
PLAYWRIGHT_PATH=/path/to/playwright \
CHROME_BINARY=/path/to/sandboxable/chrome \
QA_OUTPUT=/tmp/shared-motion-practice-qa \
node tools/browser-shared-motion-practice.mjs
```

The browser course enters actual placements through Practice forms, independently checks physical coordinates and fitted residuals, compares rendered source results, downloads and reopens original PNG evidence, and exercises failed/stale intake and saving. It uses the existing content security policy and verifies Chromium sandbox admission. The stale-file cases specifically exercise the immediate post-file-read revision guard.

Receive the final composed source and its unpacked private package before reporting integration. This workflow does not publish a release or establish a physical learning outcome.
