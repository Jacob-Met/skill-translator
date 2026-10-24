# A prospective challenge with retained raw sources

Open **Raw-source challenge** from Demonstration Sources. Import a saved demonstration account, or an existing numeric response study. The former retains every additional training annotation; the latter retains its numeric observations and source bindings without inventing missing additional-source annotations.

Choose 1–6 workpiece sizes different from the reference, training and other planned sizes. Explicitly declare that their outcomes were not used to choose the plan. Freeze and save the account before receiving outcomes. This timing statement is user-reported, not a trusted acquisition timestamp.

## Receive an outcome

Select its frozen workpiece and import the annotation exported by Source Studio. The annotation retains its own planar calibration, original image metadata and workpiece dimensions. Both dimensions must equal the frozen plan exactly. Choose the corresponding mark and explicitly confirm that it represents the same reference relationship. Equal names, visual similarity or pixel location do not establish correspondence.

Supply separate x/y discrepancy bounds in millimeters and an authored-example or reported-measurement evidence basis. Bounds are not inferred from pixel resolution or practice tolerance. The maintained demonstration receiver derives coordinates from the supplied calibration; the maintained prospective affine challenge receives those coordinates against the original reference. Future outcomes never become training observations, narrow the displayed frozen ranges, or change the declared coefficient domain.

Each row shows its original frozen coordinate ranges, retained raw outcome, derived position and individual/joint verdict. Individually compatible readings can jointly exclude every original model. Missing outcomes remain untested and cannot hide an existing contradiction. Conditional compatibility does not establish causal necessity, physical skill efficacy or calibrated measurement uncertainty.

Replacing an outcome preserves only its new current reading. Removing one explicitly withdraws that evidence. Either operation can change the current verdict, while training remains unchanged. Save earlier accounts separately when their history matters.

## Inspect original pixels

Choose the training reference, any raw training demonstration, a retained outcome, or the pending annotation. Reattach its original PNG/JPEG. The maintained image receiver checks exact SHA-256, dimensions, MIME type and browser orientation before displaying pixels. The overlay marks the supplied calibration corners and selected corresponding point.

A matching image establishes byte identity, not annotation, calibration or correspondence accuracy. Image files are not embedded in the account. Switching source releases the old image; late file/decode completion cannot attach it to another source. Reopen requires reattachment of the original files.

## Save and reopen

The raw format is `skill-translator-raw-affine-challenge/v1`, containing `trainingAccount`, `plan`, `outcomesNotUsed` and current raw `results`. Derived summaries are never trusted. Reopening reconstructs training through `responseFromDemonstrations`, freezes it through `freezeAffineChallenge`, derives each separately calibrated outcome through the same demonstration API, and receives it through `receiveAffineResult`.

Both the complete raw account and the expanded numeric challenge must fit their 2,000,000-byte compact JSON limits. Admission, replacement and freeze fail before changing accepted state when either representation exceeds its bound. Download uses precisely that compact encoding, so an exact-boundary file remains reopenable. No annotation is dropped to meet capacity.

## Receiving evidence

The native controls cover raw custody, plan and correspondence refusal, different mark identifiers, full-image coordinate admission, unchanged predictions, joint contradiction, missingness, explicit replacement/removal, numeric source-binding expansion and exact whole-account capacity.

`node tools/browser-raw-affine-challenge.mjs` serves the maintained app using `createAppServer`. With `PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT` as needed, it runs direct Chrome with namespace and seccomp assertions. The course generates original authored PNGs and tests raw training inspection, prospective declaration, wrong-image retention, joint contradiction without refitting, actual compact downloads, forged-summary recomputation, wrong dimensions, corrupted image coordinates, late JSON/image cancellation and a 390px layout with visible outcome removal.

These are authored analytic controls. They do not validate real-world calibration, physical transfer, or a person's practical ability. No image data is sent to an external service by this page.

## Received composition

The raw-source prospective consumer was received on readiness-practice main `09ae668bf2194d686a0da7c81a15bb37ab124583`, preserving #77 merge `e3e70e2827b5bc6e5a78008051c2ed325bbf8b57`. The combined source passed **336 native checks, zero failures and zero skips**; nine focused controls exercise this raw consumer. Its own actual direct-Chrome course passed **13 groups** with namespace and seccomp sandbox assertions enabled. These are the raw-challenge results, separate from the prior #77 delivery's 320 native checks and its two 13-group demonstration/capacity courses.

The raw course received original authored PNG pixels, froze and downloaded complete raw training before outcomes, required explicit correspondence and bounds, and exposed a joint contradiction despite individual agreement without changing frozen ranges. It also checked exact image mismatch retention, complete raw download/reopen with derived claims ignored, frozen-dimension and image-coordinate refusal, late JSON/image cancellation, a 390px labeled removal action, keyboard new-plan reset and generated-ID collision avoidance.

The receiver closes its mobile page and brings the desktop page forward before its final desktop control, avoiding background-tab animation-frame polling. The product source and assertions are unchanged by that receiving correction. [Verification and exact received candidate hashes](receipts/raw-affine-challenge-20261024/verification.json) distinguish this evidence from the previous delivery. Screenshots are produced by the course; final visual review is tracked separately in the receipt.
