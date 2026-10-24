# Retaining source demonstrations behind response observations

`/response-demonstrations` receives a saved Workpiece Response study and additional source annotations exported by the maintained Source Studio. It keeps every additional source's calibration, dimensions, raw marks, declared media identity, chosen correspondence and measurement-bound assumptions. The source images remain separate local files.

The reference source and any original numeric observations remain unchanged. For each additional demonstration, explicitly choose the mark representing the reference relationship, declare its authored/reported evidence basis and supply independent x/y discrepancy bounds. Equal labels do not establish correspondence. A mark's practice tolerance is not reused as a measurement bound.

## Geometry and inference

The receiver calls the maintained source derivation and calibration. For an additional workpiece of widthW and heightH, the selected normalized annotation `(u,v)` supplies the physical coordinates `(uW,vH)`. It uses the literal annotated source position, not that source mark's rule adapted to another sheet. The original additional annotation is retained unchanged.

Photo-backed annotations use maintained `validateCapturedDemo`, including media metadata, image-coordinate bounds and video-frame origin validation when present. Non-image authored geometry uses maintained `derive`. The receiver does not create a new homography, image parser, point detector or physical-calibration estimator.

The derived coordinates become additional observations for the existing source-conditioned affine family. The explicit correspondence links the selected additional mark to the original reference mark; identifiers need not match. Original numeric observations and annotation-derived ones can coexist, with distinct observation IDs and a shared total limit of60.

Source geometry uses the maintained binary64 computation. A zero coordinate bound asserts the literal derived number; it is not proof of exact physical measurement. Bounds must be supplied for the intended use and account for whatever annotation/calibration errors the author intends to model. These assumptions are not inferred from image resolution, the solver's arithmetic, practice tolerance or photo appearance.

## Original-pixel inspection

Select the reference, a pending source or a retained additional source. The canvas shows the exact supplied calibration corners and selected annotation. With no original image attached, it is explicitly an annotation diagram.

For a photo-backed source, reattach its PNG/JPEG. The maintained `loadLocalImage` validates encoded headers, byte/pixel limits, actual browser decoding and SHA-256; `assertImageMatches` requires the annotation's exact hash, dimensions, type and browser-oriented coordinate convention. A filename match alone is insufficient. The original pixels are drawn beneath the overlay only after that verification. Invalid replacement preserves accepted pixels, while switching sources releases their object URL. A late decode cannot attach to a newer source and is released.

Pixel reattachment demonstrates which bytes underlie the annotation. It does not prove correct corner selection, mark identity, physical dimensions, planarity, expert intent or calibration accuracy. This consumer never relocates a mark or infers correspondence automatically.

## Save, reopen and downstream use

**Save complete annotation account** retains the original response study and every additional raw annotation, declared correspondence and bound. Reopening validates before replacement and recomputes all derived positions and family support. Original images are not embedded and must be reattached. Complete accounts are limited to2MB; an oversized account is refused without dropping sources, ensuring that exported files remain within the receiving limit.

**Export numeric response study** creates a standard input for the existing Response Lab and separate-workpiece challenge. This export contains the original reference and derived numeric rows; it does not include the additional raw annotations. Save the complete annotation account as their source record. The UI states this distinction explicitly instead of suggesting that the numeric export alone preserves every demonstrated source.

Changing the reference account replaces the working account. Removing a retained demonstration recomputes the family; pending source fields remain available. Malformed source files, image mismatch and superseded imports preserve accepted state. No data is uploaded.

## Evidence

`node test/response-demonstrations.test.mjs` includes changed-camera annotation controls, full raw-source replay, explicit correspondence, inherited numeric evidence, maintained image admission, separate measurement bounds and complete-file capacity. `tools/browser-response-demonstrations.mjs` generates original authored PNG controls and exercises actual reattachment, wrong-file refusal, numeric export into the maintained Response Lab, full-account download/reopen, stale file/image receiving and fresh390px keyboard inspection.

These controls are authored geometry and pixels. They do not establish a real expert demonstration, physical transfer, learned skill, cloud/model execution or deployment. The presence of a browser course is not an execution receipt; use the integration evidence for actual results.

## Received composition — source custody and capacity repair

The #77 composition, including the numeric affine-challenge capacity repair tracked with #81, passed **320 native checks**. Actual direct Chrome receiving passed **13 Demonstration Sources groups** and **13 affine-challenge groups**, with namespace and seccomp sandbox checks. The demonstration course inspected original authored pixels, rejected wrong-image replacement, received the numeric export in the maintained Response Lab, downloaded and reopened complete raw accounts, checked late file/image cancellation, and exercised a visible Remove action in the 390px labeled-card layout.

Both complete annotation accounts and derived numeric response studies are checked against the 2,000,000-byte compact JSON limit. Repeated original-source references can enlarge the numeric representation even when the raw annotation account is smaller; that expansion is checked before acceptance. Downloads use compact JSON, so indentation cannot silently push an admitted account beyond its importer limit. Exact-boundary reopening and oversized-expansion refusal are covered by native controls.

These are authored geometry and image controls, not real expert demonstrations or evidence of physical skill efficacy. Reattached pixels verify file identity, not calibration, mark correspondence, measurement bounds or physical accuracy. The additional raw-source prospective challenge remains a separate #81 consumer; these receiving counts do not claim that its page or browser course has been executed.

[Exact received source and commands](receipts/response-demonstrations-20261024/verification.json) · [Demonstration browser receipt](receipts/response-demonstrations-20261024/demonstrations-browser.json) · [Affine capacity browser receipt](receipts/response-demonstrations-20261024/affine-capacity-browser.json).
