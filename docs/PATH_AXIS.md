# Inferred straight reference axis

Open a complete original-frame sampled path at `/sampled-path`, inspect its selected samples, and choose **Infer straight axis from samples**. The existing calibrated point correspondences and common-plane declaration are reused. No additional guide-anchor annotations are needed. Original PNG overlays retain the selected points and distinguish the inferred line with a dashed amber segment.

The mechanism computes the principal eigenvector of the centered 2D covariance matrix. This is the total-least-squares line minimizing summed squared perpendicular sample distances. It includes every observed selected point with equal weight; it does not discard outliers or weight by elapsed time. The displayed segment spans their projections; the mathematical line is unbounded.

The consumer shows each residual, RMS and maximum residual, and leave-one-out errors. Each held-out check fits the remaining observations and predicts the excluded point. These checks can expose endpoint leverage and curved excursions, but reuse one demonstration and do not replace independent trials. No threshold silently turns a fit into success. Three observed samples are required for the complete hypothesis. Coincident and nearly isotropic samples have unresolved direction, and missing observations remain explicit.

The numerical orientation guard requires an eigenvalue gap greater than the larger of the squared maintained path length guard and 1e-10 times covariance trace. This is a numerical convention, not a physical uncertainty bound. Nearly isotropic inputs can have a highly unstable orientation even above that bound; interpret residuals, original frames and held-out checks together. Axis sign is deterministic numerical orientation, not travel direction.

Saving uses the existing complete sampled-path bundle. It preserves original frames, annotations and declarations, without saving inferred output as evidence. Reopening and requesting inference recomputes from source. Any declaration edit hides the previous accepted result; inference never changes authored guides, tolerances, scores or practice history.

## Verification

`node test/path-axis.test.mjs` exercises unfamiliar rotated paths, an independent analytic noisy-line oracle, curved and endpoint-leverage negatives, coincident/isotropic/insufficient observations, source tampering, missing coverage, and an independent dense angle search. `node tools/browser-path-axis.mjs` runs original-PNG intake, ordinary authoring, inferred overlays, actual download/reopen, stale/missing edits, transactional tamper refusal, new curved input, and narrow keyboard receiving. Set PLAYWRIGHT_PATH and CHROME_BINARY to a qualified local installation.

This is a geometric interpretation of supplied calibrated samples. A fitted line is not evidence of an actual guide, physical contact, a required task invariant, continuous straight motion, safe technique or acquired skill. Those interpretations need additional evidence.
