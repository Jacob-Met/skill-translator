# Maintained pixel-region dependency

`pixel-observations.mjs` is the **unchanged exact source file** from the MICROVERSE commit and blob recorded in `source-pin.mjs` and `source-lock.json`. MICROVERSE remains the algorithm owner. SKILL TRANSLATOR consumes `analyzePixels` for bounded, user-reviewed source-image crops; it does not use the biological encounter export.

This pin keeps the browser local and offline without making requests to GitHub or uploading image bytes. No forked segmentation implementation or new license/visibility decision is introduced.

Verify exact bytes with `node tools/verify-pixel-core.mjs`. For a reviewed update from an authorized MICROVERSE checkout, run `node tools/verify-pixel-core.mjs --update /path/to/microverse <exact-40-character-commit>`, then run the consumer's native and browser tests and review the changed pin. Confirm that the commit belongs to the maintained upstream before using the updater. Never edit the vendored algorithm locally; propose shared algorithm changes in MICROVERSE.

The extractor reports thresholded eight-connected image regions and pixel-center centroids. Crop truncation, touching features, background-window effects and intensity thresholds limit interpretation. A selected region is not an automatically recognized craft landmark or an accuracy estimate.
