# Source-native visible edge proposals

A demonstrated action may change the material boundary while its tool and workpiece move out of plane. The source need not supply physical dimensions. `/sequence-edge` receives an actual saved demonstration sequence, verifies the retained PNGs, and lets an observer inspect a selected image region without inventing a fixed plane or millimetre scale.

## Actual mechanism

The local native adapter decodes the exact selected PNG after checking its SHA-256 and raster. It requires 8-bit samples and refuses nonopaque alpha before analysis: hidden RGB must not become visible edge evidence. Opaque RGBA and grayscale sources remain supported. OpenCV Canny (50/150, aperture 3, L2 gradient) extracts every edge pixel in the bounded ROI. OpenCV probabilistic Hough (rho 1 px, angle step π/180, 40 votes, minimum segment 80 px, maximum gap 10 px) proposes segments. All candidates and all edge pixels remain in the report. No top-k truncation or interpretation by longest segment is performed. Duplicate exactly identical endpoints are collapsed deterministically; nearby blade edges remain distinct.

Each candidate identifies its exact retained edge-pixel support inside a two-pixel band and between its endpoints. Support uses integer dot/cross predicates, avoiding Python/JavaScript square-root boundary disagreements. With ROI area at most 2^20, cross magnitude is below 2^21 and its square below 2^42, so those integer operations remain exact in JavaScript binary64. The receiver recomputes support and ROI-boundary flags. It does not reproduce Canny from an imported report; imported detector output remains a producer account. The normal browser request executes OpenCV locally and then uses the same receiver.

The observer can leave a report unreviewed, reject its proposals, or select one visible feature with a basis. A newly formed boundary is an explicit observer interpretation. No persistent material identity is automatically assigned. Saved accounts preserve the original sequence/PNGs, report and separate review. A zero-candidate report is valid negative output, not proof that an edge or action is absent.

## Running the local adapter

The existing Node server retains its normal static behavior. The source-edge page additionally calls a same-origin local endpoint. Install the optional pinned dependencies in a suitable Python environment using `requirements-native-edge.txt`, then set `SKILL_EDGE_PYTHON` to that environment's Python before starting the existing server. The qualified environment used OpenCV 4.13.0.92 and NumPy 2.3.5. This is local CPU execution, not Nebius or OpenCV 5 platform qualification.

The endpoint accepts only same-origin JSON, at most 22 MiB per request, one worker at a time, and kills a worker after 15 seconds. It invokes one fixed Python script without a shell or client-supplied filesystem path. The selected source image is bounded before decoding. The ROI contains at most 1,048,576 pixels; the browser retains the complete edge field as a bounded bitmap and admits at most 256 candidates. Legacy coordinate-list reports retain their 20,000-pixel cap. Candidate overflow refuses rather than truncating. See [complete edge fields](SEQUENCE_EDGE_FIELD.md) for encoding, exact support and the crowded real-source receiving.

An equivalent file workflow is available:

```
node tools/inspect-sequence-edge.mjs sequence.json moment-id x,y,width,height new-report.json
```

It uses maintained `validateSequence`, selects the exact retained PNG and writes a new report without overwriting an existing file. The report can be opened beside its matching source sequence in the browser.

## Unfamiliar source experiment

The experiment used Aerra Carnicom / Aerrapc, *Aerra's Films of the Ordinary IV -- Scissors Cutting Card Stock*, published under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) on [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm). The original video SHA-256 is `06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe`. The source video and derived source images are not distributed with this code or receipt.

The actual maintained browser capture retained five frames at 3.978, 5.012, 6.012, 7.012 and 8.012 seconds. Observer descriptions were checked against those exact PNGs; a coarse contact sheet was insufficient to decide when separation had become visible. No original expert intent, force, scale or technique quality was supplied.

The moving/deforming card makes fixed-plane calibration unjustified. On the actual 7.012-second frame, ROI (900,150,1000,650) produced 7,300 edge pixels and 31 candidates, including visible blade-edge proposals. The actual blurred 3.978-second frame, ROI (0,0,1024,1024), produced 1,011 edge pixels and zero candidates. These observations are runtime results on this source, not detection-accuracy estimates. Original pixels, all candidates, observer review, download/reopen and 390 px receiving were exercised in the browser.

Alternative experiments were retained: Canny/Hough and OpenCV LSD both missed a faint card boundary; an endpoint-guided IntelligentScissors proposal traversed unsupported interior. None was promoted to a verified boundary. The useful advance is inspectable source-derived proposals where physical calibration is absent, with negative results and alternatives still visible.

## Existing estate components considered

The maintained CHRONOS `scripts/source-edge-cloud.py` and `app/source-edge.mjs` were inspected at commit `6e54a2bd52fc1e9b4595d67d11acc31605c9ea3e`. Its all-ROI-pixel single-line receiver refuses connected tool/card edge clouds; its actual-video extraction does not own the exact already-retained browser PNG. This adapter uses OpenCV's maintained algorithms directly and follows the same explicit Canny profile, preserving SKILL TRANSLATOR's original-image receiver. MECHANISM's optical-flow body-pose worker, AFTERIMAGE's media/component adapters and REPLAY's court-line calibration were also inspected; their assumptions do not supply this raw retained-frame proposal contract. Existing local point correspondence work remains separately owned.

Relevant primary API references: [OpenCV Canny](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html), [Hough line transforms](https://docs.opencv.org/4.x/d9/db0/tutorial_hough_lines.html), and [IntelligentScissors](https://docs.opencv.org/4.10.0/df/d6b/classcv_1_1segmentation_1_1IntelligentScissorsMB.html).

## Reproduce the unfamiliar-case receiving

Keep downloaded media and derived images in a local experiment directory. The capture script checks the documented video hash before using it; it records observer notes rather than attributing those notes to the demonstrator. The commands below start their own temporary loopback servers and close them after receiving. Set `SKILL_EDGE_PYTHON` or the Python environment as described above.

```
EDGE_VIDEO=/path/to/permitted-original.webm EDGE_RECEIPT_DIR=/tmp/skill-source-edge-real node tools/capture-edge-demonstration.mjs
EDGE_RECEIPT_DIR=/tmp/skill-source-edge-real node tools/browser-sequence-edge.mjs
EDGE_RECEIPT_DIR=/tmp/skill-source-edge-real node tools/native-sequence-edge-controls.mjs
node --test --test-isolation=none test/sequence-edge.test.mjs test/server.test.mjs
python test/sequence-edge-native.test.py
```

The scripts write original-image bundles/screenshots only to the selected experiment directory. The repository receipts contain source hashes and textual results, not the original video or source-derived images.
