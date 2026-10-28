# Compare retained original frames

The `/appearance-pair` page makes a retained-frame appearance comparison available from the ordinary sequence workflow. Open a complete exported sequence, select two chronologically ordered original frames, declare the sample width and integer search radius, and compare. The page previews both originals and exposes their actual presented times. The sequence page links directly to it.

The calculation runs in a module worker. Editing either frame or a setting immediately retires the displayed finding and disables saving. Cancel, a replacement source, and page exit terminate obsolete work. Revision, worker-identity and exact request checks prevent a late reply from restoring an obsolete finding. A worker-load failure permits an ordinary retry.

## What the result measures

The page uses the maintained `compareTranslatedSamples` kernel. It samples the entire original images with the declared aspect-preserving canvas raster, then checks every integer displacement in the declared square search range. Every candidate uses the same inset reference support. It fits one shared additive RGB brightness offset with the maintained lower-median absolute-difference convention. Sample dimensions are at most 160 pixels per axis and 14,400 pixels total; radius is 1–16 pixels and must retain at least a 3×3 common interior.

The result leads with whether the minimum is unique, tied, or on the search boundary, followed by the residual and sampled-pixel shift. The maintained presenter keeps all exact minima available through pagination. Original hashes, moment IDs, presented times and complete sampling settings remain accessible in the closed **Source identities and sampling settings** disclosure.

These are finite image-appearance measurements. They do not establish object correspondence, camera or physical motion, contact, an action category, a numeric cue or skill quality. A boundary minimum does not establish an interior optimum. Changing the sample or support changes the question; results with different settings must not be treated as identical measurements. Browser resampling may vary.

## Source-only persistence

Saved files use `skill-translator.appearance-pair/v1`. They contain the complete original sequence and verified original PNGs plus the canonical request. The request binds the clip hash and both moment IDs, PNG hashes and actual presented times to that sequence. It also retains raster dimensions, radius, common support, sampler and brightness convention.

Saving rechecks the original PNG hashes. Computed answers are omitted. Opening a saved request verifies its original source and automatically recomputes the result; supplied extra answer fields are ignored. The earlier unpublished experimental pair format is not admitted as this format. Sequence metadata and all original PNG bytes remain unchanged through save/reopen.

## Qualification

The maintained base was `e9a29b3ead307ea2e79aaeb0ffdf1f8a47da6cfd`. The change adds the new page/modules and explicit server routes, plus one sequence navigation link; it does not change the maintained acquisition, numerical kernel or numeric-cue schemas. Server security policy is unchanged.

- `node --test test/appearance-pair.test.mjs` executes four defined native groups covering source bindings, chronology, coherent settings and an actual maintained-kernel ambiguity control. See `docs/evidence/appearance-pair-native-acquisition.md` for commands and the reporter qualification.
- A fresh licensed video went through ordinary sequence admission, four original-frame captures, observer interval authoring, export and fresh reopen. All complete original PNG hashes and dimensions were verified. The fourth frame was actually presented at 1.912 seconds; no historical 1.945-second measurement was reused.
- `tools/browser-appearance-pair.mjs` passed seven ordinary browser groups on that fresh source: source custody; settings invalidation and boundary outcome; forged-answer reopening; cancellation of a delayed real worker response; source/worker/URL retirement; worker-load failure and retry; and narrow keyboard/layout behavior. The final presenter also passed disclosure checks and sequence navigation by keyboard at 390 pixels.
- Root inspected the final 1440-pixel and 390-pixel layouts and a 1440-pixel boundary-result view. Full source identifiers were moved into the disclosure in response to that visual review, and the browser receiving was repeated on the final presenter.

The source-only browser receipt is `tools/appearance-pair-browser-receipt.json`. Independent review is recorded in `docs/evidence/appearance-pair-independent-review.json`. Screenshots and source media are excluded from these records. This qualification is for the local composed source; it does not assert a remote commit, merge, deployment or physical validation.

## Reproduce with original evidence

Use the existing sequence page to capture and export original frames. The acquisition helper `tools/browser-capture-appearance-source.mjs` can reproduce the documented four requested times from the attributed public video when `ACQUIRE_VIDEO`, `ACQUIRE_ATTRIBUTION`, `QA_OUTPUT`, `CHROME_BINARY` and `PLAYWRIGHT_PATH` are supplied. Each run records its actual presented times and hashes; decoder presentation is not assumed to repeat historical values.

Start the maintained server and provide `APPEARANCE_PAIR_URL`, `APPEARANCE_PAIR_SOURCE`, `APPEARANCE_PAIR_OUTPUT`, `CHROME_BINARY` and `PLAYWRIGHT_PATH` to the appearance browser harness. Use an unprivileged process with Chromium sandboxing enabled and a private output directory. The contained and boundary fixture indices default to `[0,1]` and `[2,3]`; another source must independently establish the expected cases or supply explicit fixture indices. The harness refuses a source whose actual results do not match those declared acceptance cases.
