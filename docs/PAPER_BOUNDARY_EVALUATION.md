# Ordinary-paper boundary evaluation

## Result and remaining gaps

Source Studio now uses the product's existing optional OpenCV runtime for colour/edge contour proposals when that runtime is installed. Its everyday scan button keeps the same explicit outline choice, image inspector, editable draft and separate calibration action. A Node-only installation retains the browser scan, with a lower-contrast pass used only after its original passes return no candidates.

The final reserved set contained 90 predetermined frames from six model003 document types across five SmartDoc backgrounds. The actual native app offered an outer-page candidate at document-reference IoU ≥ 0.90 on 54 frames; the first, area-ordered choice met that threshold on 40. The previous app met it on 23 frames. Thirty native scans still offered no outline.

**This is useful selective assistance, not automatic calibration.** Fourteen of the 54 covered pages required choosing a non-first alternative. The native method lost two previous good results completely, and displaced two other previous good results from first position. There is no measured human time saving, expert assessment, physical-accuracy or learning claim.

The independent product/method judging task is skill-translator-paper-use-judge-kestrel71b9. The author measurements below are separate from that judgment. The earlier image-first inspector and b71 downloadable runtime already have an accepted independent use judgment; that does not automatically accept this new method.

## Final reserved comparison

All 90 reference quadrilaterals were inside the image and none had the dataset's rejected flag. This does not imply an unoccluded or easy scene. We retained every scheduled image.

| Method | First choice IoU ≥ .90 | Any of up to eight choices IoU ≥ .90 | No proposal | Mean first-choice IoU, omissions zero |
| --- | ---: | ---: | ---: | ---: |
| Previous app b71 | 23 / 90 | 23 / 90 | 66 | .254 |
| Actual native app, frozen fbe8fc1 | 40 / 90 | 54 / 90 | 30 | .503 |
| Fixed grayscale Canny/contour baseline | 17 / 90 | 17 / 90 | 73 | .186 |
| Fixed colour/multilevel OpenCV comparator | 40 / 90 | 54 / 90 | 30 | .503 |

“Any choice” is oracle candidate coverage computed after inference. It is not automatic-selection success. The comparator and the native app use the same conventional procedure; this is evidence for choosing an existing stronger method, not an algorithm-novelty or superiority claim.

Paired outcomes explain the tradeoff: of the previous 23 good first choices, 19 stayed good first choices and 21 remained somewhere among the native alternatives. The native method added 21 good first choices on other frames. Of 66 previous omissions, 38 gained a proposal and 33 gained a good outer-page alternative. Two prior successes were lost: background02-magazine003-frame-0048.png and background02-magazine003-frame-0140.png. The retained evidence lists all 14 frames requiring a non-first choice.

On the same fleet host, measured click-to-result time had a median of 232 ms and 95th percentile 247 ms for b71, versus 901 ms and 1463 ms for the native app. These are actual UI courses including image preparation, native process startup and response handling; they are host observations, not a controlled hardware benchmark. The installed existing OpenCV environment occupied about 246.6 MB including its packaging tools and dependencies. The Node runtime download does not bundle that environment.

Median original-pixel corner RMS among each method's good first choices was 2.13 px for b71 and 3.83 px for native. These are different selected subsets and cannot establish that one method is more precise on a common set. Inspection and correction remain necessary.

## Development decisions and retained failures

The 27 development images were nine fixed evenly spaced frames from each original SmartDoc sample clip. Coordinates were used only by the separate scorer after proposals had been produced.

| Experiment | Development good first / any | Development omissions | Decision |
| --- | ---: | ---: | --- |
| Previous global + local16 browser scan | 21 / 27 | 6 | Baseline |
| Add RGB global Otsu passes | 21 / 27 | 6 | Rejected: no recovery, substantially slower |
| Add unrestricted local8 passes | 26 / 27 | 1 | Rejected for release: exterior halos and capacity regression |
| Local8 only when original passes return no candidates | 26 / 27 | 1 | Retained as dependency-free fallback |

The unrestricted local8 method created an approximately 20–26 original-pixel exterior halo above an accurate outline in the authored bright/dark controls. It also exceeded the existing 4096-component capacity on a test image for which the previous method offered candidates. The original choice-count and accurate-corner assertions were not relaxed. Omission-only fallback preserves every original nonempty set exactly and cannot rescue a weak second object when another outline is already present.

The first reserved model001 course gave b71 19 good first choices / 62 omissions, unrestricted local8 27 / 54, grayscale OpenCV 14 / 76, and colour OpenCV 44 good first / 52 candidate coverage / 25 omissions. This prompted selection of the stronger conventional method.

A separately declared model002 course gave b71 15 / 69, omission-only fallback 23 / 60, grayscale OpenCV 13 / 69, and colour OpenCV 46 first / 56 candidate coverage / 23 omissions. The fallback produced 11 explicit component-capacity refusals, all in its already empty baseline cases. These are refusals, not successful geometric absence decisions.

Models001 and002 are method-selection and regression evidence for the final native method, not its held-out test. Model003 was reserved and its schedule declared before extraction. Each set uses a different printed document model, but shares the same five backgrounds and acquisition protocol; this is not cross-site generalization.

## Method and provenance

The native procedure follows OpenCV's squares.cpp colour/multilevel example: pyrDown/pyrUp smoothing, each BGR channel, Canny 0/50 with aperture5 and one dilation at level0, plus ten fixed threshold levels. It finds RETR_LIST contours, approximates at 2% of perimeter, keeps convex four-point contours of at least 1% image area, and omits image-boundary-touching candidates. The sample's right-angle gate is removed for perspective photographs.

The app uses at most 2048 pixels per side and 2,097,152 analysis pixels. It sends an explicitly browser-oriented PNG raster, verifies its dimensions and SHA-256 in the native worker, and maps the chosen corners to the unchanged original image. The exact raster hash, OpenCV/NumPy versions, method settings and original proposed corners are retained separately from the user's accepted coordinates.

The native alternative deduplication distance uses the browser policy's five pixels at a 1024-pixel analysis side, scaled to the native raster (minimum five). The initial port showed duplicate Canny/threshold boundaries on authored controls. A later small-raster control identified the exact five-pixel equality case; the final integration treats distance equal to the limit as duplicate. The 1920×1080 reserved course used a 9.375-pixel limit; integer-pixel corner distances cannot equal that value, so this equality fix cannot change those retained outputs. The unchanged frozen worker used in the course is included in the evidence.

No image label, document model, target corner, A4 dimension or ground-truth file enters either detector. The browser driver reads image files and inspects the app's normal UI. The separate scorer uses the reference homography only afterward. It computes convex polygon intersection/union in reference document coordinates, counts omissions as zero, and records original-pixel corner RMS under the best cyclic/reversed correspondence.

The original kit describes a 2100×2970 object using a misleading unit label; the author's reformatted metadata specifies 0.1 mm units. This evaluation uses the aspect ratio and image pixels. Nominal A4 printing does not establish physical metrology in the application's calibration. The 305×198 mm values in workflow tests are deliberately supplied test inputs, not measured truth for those photographs.

## Dataset, exact inputs and repeatability

Dataset: SmartDoc2015 Challenge1, CC BY4.0. Cite Burie et al., ICDAR2015, DOI10.1109/ICDAR.2015.7333943; dataset DOI10.5281/zenodo.1230218. Author description: https://github.com/jchazalon/smartdoc15-ch1-dataset .

- Development archive: https://zenodo.org/records/1230218/files/sampleDataset.tar.gz?download=1
- Development SHA-256: 90d1a64f476ffe290ebbddf4337e108d471b9c25420551223f447db972844a9a
- Test archive: https://zenodo.org/records/1230218/files/testDataset.tar.gz?download=1
- Test archive bytes: 1,516,923,675; MD5: 4b4c2e94fb1b8d9180d7ad07c4acffa5
- Test archive SHA-256: 31345cef623673fa6324f939e70b6f001a0d3d0539b08dbe8b222f0bccdca640

For each model001/002/003 course, select datasheet, letter, magazine, paper, patent and tax in all five backgrounds; decode the frames at 25%, 50% and 75% of the annotated index span, rounded to 1-indexed frames. There is no outcome filtering. The source clips and extracted PNGs have exact hashes in [the retained evidence](https://github.com/Jacob-Met/skill-translator/blob/main/docs/evidence/paper-boundaries-2026-11-10.json.gz). The gzip archive expands to a single JSON file (SHA-256 ad12c2ec29433f39c569eb9b378d86026a37a9f5bad9b13fdceba2b1f910bf12). That JSON includes labels, raw predictions, per-frame metrics, the paired regression list and the frozen experimental source text. Original dataset media are obtained from the credited dataset rather than copied into the runtime.

~~~sh
python tools/photo-boundary-samples.py /path/to/sampleDataset /absolute/development-frames
python tools/photo-boundary-heldout-samples.py /path/to/testDataset /absolute/model003-frames --model-index 3
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome node tools/photo-boundary-proposals.mjs /absolute/model003-frames /absolute/results
python tools/score-photo-boundaries.py /absolute/model003-frames/ground-truth.json /absolute/results/proposals.json /absolute/scores.json
~~~

The native course uses the pinned requirements-native-edge.txt environment. The same driver run against source b71 provides the prior-app comparison. The grayscale comparator accepts image paths after --output; the colour comparator accepts an image directory and output path. The retained exact code and outputs make those choices reviewable.

## Installation and actual-use checks

The ordinary Node-only launch remains usable without Python. For the stronger page scan, run the included setup once from the extracted application:

~~~sh
python3 tools/setup-native.py
node launch.mjs
~~~

The setup creates .venv-native beside the application from the existing pinned OpenCV/NumPy requirements. The normal launcher and scan discover that environment, an explicitly configured existing native interpreter, or an installed Python/OpenCV on PATH. On Windows the Python command is commonly python rather than python3. Linux Python3.12 is the qualified installation target; supplied launch/setup code does not itself establish Windows/macOS validation.

The author ran the original authored browser course in three configurations: qualified native interpreter, unconfigured Node-only app, and explicitly missing optional interpreter. All kept the original one/two/zero choice counts and accurate-boundary expectations, as well as explicit correction, apply, package save/reopen and practice. The real letter001 frame154 course passed at390×844, retaining original proposal evidence separately from a2px manual correction and supplied305×198 dimensions. Five additional native control groups cover oblique bright/dark boundaries, two distinct regions, uniform/triangle/circle/clipped omissions, an open three-sided shape, and raster opacity/hash refusal. The maintained capture/browser-kernel tests also passed.

The package publication and independent downloaded-runtime judgment are recorded separately with their exact final source and archive identity. Functional checks and numerical agreement do not substitute for that judgment.
