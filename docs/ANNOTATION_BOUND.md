# Declared learner-photo annotation regions

From **Read placements from your image**, pair and calibrate the photo and retain a mark. **Inspect annotation bounds in a new tab** opens a separate conditional geometric investigation. The original photo draft remains in its tab. Return to unchanged practice restores the original incoming practice session; it does not apply the new photo or modify placements, round history, tolerances or readiness.

Declare horizontal and vertical pixel half widths around one retained annotation. Zero widths explicitly produce a segment or point. The full region must lie inside the identified image and calibrated workpiece. Unsupported regions are refused, never clipped. Missing marks remain missing.

## Mechanism and assumptions

The maintained `calibrate` and `fromImage` functions define a fixed planar homography. Its inverse homogeneous denominator is affine in image coordinates. Matching, well-separated denominator signs at every rectangle vertex exclude an interior projective pole. The mapped admitted rectangle is convex. Its maximum Euclidean target distance occurs at a vertex; its minimum is zero for a contained target, otherwise the closest point on an edge. Segments use closest-point projection; points use the existing maintained assessment directly.

For nonzero regions, comparisons within a guard of `1e-9 * max(1, widthMm, heightMm)` remain unresolved. Thin or numerically nonconvex mapped areas and poorly separated inverse denominators are refused. The guard is a practical numerical policy, not a proof of floating-point enclosure. Exact tangencies can therefore remain unresolved. Zero-width point status preserves the maintained assessment's existing tolerance policy.

The extrema concern a declared pixel rectangle **under a fixed calibration**. They do not bound calibration error, lens distortion, nonplanarity, source authenticity, physical accuracy or skill. The rectangles are user assumptions, not inferred measurement distributions. A selected mark's result is not a jointly certified whole-task result. No probability is attached.

## Custody and replay

The input-only `skill-translator-annotation-bound/v1` notebook retains source setup, unchanged practice session, normalized raw photo observation, matching reference and declaration. Import recomputes all findings, ignores cached results, and refuses changed source/observation references. In an active photo handoff, foreign observations are refused. An exported standalone notebook can reopen without its image bytes; those numerical results are conditional on the retained metadata. Pairing the original local image separately checks its digest before rendering the pixel overlay. No image is uploaded.

The separate inspector adds only four explicit server routes and one button/action in the existing observation page. It does not change the shared geometry, photo normalization or practice evaluation modules. Pixel-candidate selection and adoption (#62), demonstration correspondences (#64), recovery (#46/#63) and readiness (#80) remain separate.

## Receiving

`node --test test/annotation-bound.test.mjs` covers independent analytic extrema, zero point parity, perspective dense falsification, region refusal, source binding and mutation checks. Dense sampling is a falsification check, not the mathematical basis of extrema.

`PUPPETEER_PATH=/existing/puppeteer/module CHROME_BINARY=/existing/chrome QA_OUTPUT=/isolated/receiving node tools/browser-annotation-bound.mjs` prepares the actual authored PNG → photo calibration/annotation → inspector → unchanged practice course, with keyboard region input, download/reopen, source-refusal rollback and 390px/desktop screenshots. No browser/runtime installation is performed. Browser results must be recorded by the receiver; preparing the script is not a browser pass.
