# Finite variation proposals and receiver allowances

The Task Space observation planner and the calibration investigation compare a finite list of workpiece sizes. They count pairs whose predicted positions are separated at the declared observation radius. A separating proposal is a prospective geometric comparison, not a measurement or proof of which rule is correct.

## Match both numerical allowances

The maintained observation receiver accepts a prediction when its distance from the reported point is at most `reportedRadius + 1e-9` millimetres. Because each of two predictions receives that allowance, the planners now require strict separation greater than `2 * (plannedRadius + 1e-9)`. Equality remains nondistinguishable.

Previously, both planners used `2 * plannedRadius + 1e-9`. For the authored 100 × 80 mm source with mark `(20, 30)`, one returned 170 × 136 mm variation places the proportional and top-clearance predictions at `(34, 51)` and `(34, 30)`. Their separation is 21 mm. At radius `10.49999999925` mm, the previous predicate called that pair distinguishable, although the unchanged receiver accepts the midpoint `(34, 40.5)` for both predictions. The corrected proposal leaves this pair unresolved.

Only the two separation predicates and their explanatory comments change. Observation acceptance, source identity, declared tolerances, finite candidate dimensions, closest surviving source-reading witnesses and ranking tie-breaks are preserved. Corrected pair counts can legitimately change which finite variation ranks first. The continuous affine planners and their source contracts are unchanged.

This aligns the explicit receiver allowances. It is not a theorem about every binary64 distance calculation, a validated physical measurement tolerance, a calibration certificate or evidence of skill transfer. The finite list is not a search over all possible workpieces.

## Reproduce the controls

Run the changed behavior and maintained observation/calibration tests:

```sh
node --test test/finite-variation-guards.test.mjs test/evidence.test.mjs test/calibration-evidence.test.mjs
```

The new controls cover the original shared midpoint, touching and broad separation, zero declared radius, multiple source readings and their closest witnesses, and ordinary source-bound save/reopen. They use the actual maintained observation receiver rather than a replacement acceptance formula.

For the actual page consumers, install Playwright and a Chromium executable with its normal sandbox available. Run as an ordinary user. `PLAYWRIGHT_MODULE` may be a package name or a file URL for the installed Playwright module; `CHROMIUM_BIN` selects the executable. The output directory must not already exist:

```sh
PLAYWRIGHT_MODULE=playwright CHROMIUM_BIN=/path/to/chrome \
  node tools/browser-finite-variation-guards.mjs /path/to/new-receiving-directory
```

The course launches the maintained application server, verifies browser sandbox admission, imports the authored source through the real file controls, and checks the corrected proposal in both existing pages. It receives real observation and calibration downloads into fresh pages, verifies source mismatch refusal without losing the accepted trial, and exercises keyboard edits and a 390 px viewport. The receipt binds actual served planner bytes, records errors and offsite requests, and checks the received files remain unchanged. Screenshots support separate visual inspection; viewport assertions alone do not establish legibility.

## Received scope

On the pinned parent `ca1da44be3507bfa668d211075d9ab099c3544b4`, the unchanged implementation passed two and failed six of the eight new native controls. It also failed the first actual browser comparison, reporting nine separable pairs where the complete receiver allowances admit eight. These original failures were retained.

The corrected implementation passed all 33 focused and maintained native tests, with no failures or skips, and all eight actual browser groups with no page errors or offsite requests. The served source was unchanged through receiving. Desktop and narrow screenshots were inspected for the relevant proposal and controls. Independent review covered the two source predicates and the consumer oracles. This is relevant source and consumer qualification, not a claim that the whole repository test suite, physical calibration or natural demonstrations were evaluated.
