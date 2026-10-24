# Learner placements from a separate image

Open **Observe learner placements** from practice. The observation uses the
practice workpiece dimensions and existing task marks; it does not resize the
setup or derive marks from image appearance. Pair a local PNG/JPEG, identify the
four workpiece corners in top-left, top-right, bottom-right, bottom-left order,
and check the planar calibration. Choose each task mark and click its observed
position or enter its original image pixel coordinates. Numeric inputs provide
an alternative to pointer annotation, including fractional pixels.

The review maps these annotations to millimetres and recomputes errors against
the existing target. Missing marks remain incomplete. Reported photo annotation
and authored image control are separate, retained evidence classes. Neither is
an authenticated observation, a measurement uncertainty estimate, or proof of
physical skill, execution, material interaction or task success. The source
image, dimensions, calibration and annotation meaning remain supplied evidence.

Applying uses the maintained `observePractice` API. If the current round has
placements, it archives them before starting the observation round. Earlier raw
photo annotations and manual detach metadata stay in history. Subsequent manual
practice edits retain original photo points and explicitly detach the affected
placement claims. Return without applying restores the incoming practice
snapshot, including view preferences, without appending a round.

## Notebook and image identity

The downloadable `skill-translator-observation-bundle/v1` contains the matching
practice setup/session and the normalized raw observation: image SHA-256 and
browser-oriented dimensions, corner pixels, physical dimensions, annotation
pixels, evidence class and note. It contains neither image bytes nor trusted
scores. Reopening validates the saved setup/session against the active task and
recomputes coordinates; it imports only the normalized photo observation. The
active practice session, later history and view preferences remain unchanged.
Applying appends the observation through the normal round-history API. Restoring
a complete older practice session belongs to the separate practice-session
import, not this observation workflow. Reopening requires the exact image to be
paired again before applying. A wrong-image
selection or invalid notebook leaves the prior accepted state intact. Async
image/notebook requests use a generation fence so an older completion cannot
overwrite a newer selection. Object URLs are released when replaced or left.
All processing is local to the browser; no external service is used.

The page receives `skill-translator-observation-input/v1` in session storage and
returns the same setup shape with its updated session in
`skill-translator-observation-result/v1`, navigating to
`/practice?resume=observation`. The no-apply return copies the original input.
The browser requires normal same-origin storage and local file access.

## Verification and scope

`test/learner-observation.test.mjs` supplies independent rational projective
controls and tests analytic errors, complete/missing annotations, v1/v2 lineage,
manual detachment, retries, stale coordinate refusal and source/setup binding.

`tools/browser-observation.mjs` is a separate real Chromium receiving course.
Set `PUPPETEER_PATH` and `CHROME_BINARY` for the installed browser dependencies.
The course defaults to the repository's `test/fixtures/learner-observation`
directory, resolved relative to the script rather than the working directory.
It requires no unpublished neighboring checkout. `OBSERVATION_CONTROLS` can
explicitly select another copy of those controls; PNG hashes and lengths must
match its manifest. `QA_OUTPUT` chooses the receipt directory.

The course seeds a session through the maintained practice APIs, restores the
actual practice page, and enters through its **Observe a learner photo** button.
It checks actual restored DOM, selected view, hidden goals and history, rather
than treating a session-storage write alone as successful receiving. It uses
actual browser file downloads for the observation notebook and practice exports.
A manual override and subsequent retry must retain the original photo pixels,
identity and detach metadata in the exported round history. An older notebook
with conflicting view preferences cannot erase later rounds or change the active
view. Wrong-image rejection includes cases B/C with equal mark geometry but
different bytes. The course also covers invalid import, exact re-pair, no-apply
return and 390/320 pixel viewports. It launches its own ephemeral server and
closes browser/server in cleanup; failures are recorded in its receipt.

### Reproduce the authored fixtures

The committed `expected.json` and three PNGs are exact copies of the independent
control set. `tools/generate-learner-observation-controls.py` uses Python's
`Fraction` arithmetic for the geometry and does not import application geometry.
It includes exact rational pixel coordinates in the expected manifest and labels
every raster **AUTHORED CONTROL / NO PHYSICAL ACQUISITION**.

```sh
python tools/generate-learner-observation-controls.py --output /tmp/learner-controls-reproduced
```

Omitting `--output` regenerates `test/fixtures/learner-observation` in this
repository. Python 3.12.14 and Pillow 12.3.0 reproduce all four committed files
byte for byte. The generator records its actual Python/Pillow versions; other
versions may produce different font/raster/compression bytes and should not be
assumed byte-identical. Compare the regenerated files before replacing fixtures.
The browser course needs only the committed files and its existing Node/Chrome
runtime, not Python or Pillow.

The independent control maps source rectangle fractions through a specified
projective transform onto a 300 × 200 mm workpiece. Case A has a guide error of
(+6, −4) mm, distance √52 mm; case B is exact. Case C has a different image hash
from B despite equal declared mark geometry. These are authored mathematical
and raster controls, not physical photographs or acquired validation data.

## Recorded receiving

On maintained base `d18370100a295a3c9c421344702721408aa36b1d`, all 223 native tests passed with no skips. Twelve actual Chrome receiving groups passed, including downloads, raw history, manual overrides, notebook reopening and 390/320 pixel layouts. Desktop and mobile screenshots were inspected. These are authored controls; no physical skill or measurement-accuracy qualification is inferred. Exact source identities and receipts are under `docs/receipts/learner-observation-20261024/`.

The maintained focused-result receiver also accepts photo-backed v2 drill sessions, preserves the full-task raw photo/manual-override history separately, recomputes the selected-subset score and starts a full-task retest with no inherited attempts. The learner integration test exercises this composed consumer.
