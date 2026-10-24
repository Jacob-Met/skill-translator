# Practice outcomes and feature gaps

After comparing declared circular feature footprints, import a complete practice session on the same page. Its retained source geometry, mark rules, tolerances and source image identity must match the comparison, and its workpiece size must be one of the explicitly offered sizes. The maintained practice importer remains authoritative.

Choose a current or historical round. Each pair with both supplied placements has a boundary gap equal to center distance minus both declared radii. A missing mark leaves the affected pair unobserved. These are gaps implied by supplied centers and declared footprints; they are not measurements of physical feature boundaries. The unchanged center-placement verdict is displayed separately.

A complete review retains the original comparison, the entire accepted practice session and selected round. Practice v2 image identity, calibration, raw image points, history and manual detachments remain intact. Reopen restores those inputs and recomputes both findings. Replacing a session replaces its history rather than combining records. Editing the comparison detaches its review. Retained declarations do not prove they predate the attempt.

## Verification

Run `node --test test/feature-practice.test.mjs`. The real-browser course is `node tools/browser-feature-practice.mjs`, using the existing `PUPPETEER_PATH` and `CHROME_BINARY` environment conventions. It performs actual practice placement/retry/export, current and historical receiving, completed wrapper download/reopen, mismatched-source refusal, session replacement, overlapping imports and desktop/narrow layout. Its photo record is an explicitly authored coordinate control; the separate maintained observation consumer owns image decoding and observation admission.
