# Source Studio → complete-task practice receiving

**Issue:** [#415](https://github.com/Jacob-Met/skill-translator/issues/415)  
**Date:** 2026-10-26  
**Status:** Pre-publication receiving record. The candidate and both current-main compositions passed. Use the closing PR's completion comment for the published revision and its receiving result.

## Outcome and scope

The candidate adds **Practice these marks in a new tab** to Source Studio. It sends an admitted snapshot of accepted annotations through the existing `skill-translator-practice-input/v1` receiver, initially using the source dimensions, a standard view, and hidden targets. Source Studio retains its original image and annotations. Image bytes and object URLs are not transported. Existing Task Space source handling and corner-inference ownership are unchanged.

The action refuses empty captures, unapplied calibration, and unfinished mark drafts. It restores the caller's prior handoff value after opening the separate practice tab. Popup or storage failures preserve accepted source work; a post-open restoration failure reports the incomplete cleanup and closes only its newly created child.

## Exact candidate received

Original source baseline: `17e649cbf6aa3e8b73b6a763be558ea8291ea192`.

| File | Received SHA-256 |
| --- | --- |
| `web/capture.mjs` | `9003c5633eab2a37f20bba1aef6e7751928a2e9e87b49df713a650ebbdd6d4d7` |
| `web/capture.html` | `80a6ebbff726e17f914f9245fb86c92f8bc23c8286e4cbd46f08e10b10031eff` |
| `tools/browser-capture-practice.mjs` | `41cf560d394d0157fcd485faccebfcf2f1422901af49316afc1fddb532b61eff` |

The lead ran literal `npm start`, then the course against that server using `BASE_URL`. Receiving used Node **22.23.4**, stock `/usr/bin/google-chrome` **156.0.8078.47**, and separately installed **Puppeteer Core 25.16.0** as QA tooling. No production dependency was added. The owned server was stopped after receiving; the launch exited **0**.

The maintained Chromium admission helper, SHA-256 `4607c67b360596ee06b36e41a6b5d3a8a6da70defb04292d955f609dcef05ead`, observed active namespace, PID/network namespace, seccomp-BPF, and TSYNC protections at `chrome://sandbox/` before product navigation. The candidate receipt records admission at `2026-10-26T22:15:25.587Z`.

## Receiving results

Both the unchanged baseline and implementation candidate passed **28 native checks, 0 failures, 0 skips**:

```sh
node --test --test-concurrency=2 test/capture-editing.test.mjs test/capture.test.mjs test/practice.test.mjs
```

The lead retained `evidence/baseline-native.log` and `evidence/candidate-native.log`; the candidate command was `hamon-900127a2-st-candidate-native-v1`. This is a focused native result, not a full-suite claim.

The final candidate passed all **13 actual browser groups**. These cover PNG selection and calibration; two distinct accepted mark rules; empty/draft/bad-input gates; rejected image replacement; exact source and image identity in a separate practice tab; original pixels remaining decodable in Studio; prior storage and independent practice preservation; blocked-popup, quota, and post-open restoration failures; 390px keyboard receiving; last-mark removal and saved-source reopening; and no **observed** product exceptions or offsite requests. New-child telemetry begins when its browser target is received.

The geometry control independently predicts `(20,60)` for a fixed-left source point and `(100,80)` for a proportional center on a 200×160 workpiece. Actual placements offset by `(4,3)` fail. A fresh corrected round passes, retaining the failed round, and exported/reopened placements recompute identically. Full source exports preserve the admitted source; practice exports bind the source image digest and setup.

These are authored PNGs, supplied measurements, and software interaction controls. They establish neither physical calibration accuracy, physical skill, nor a learning effect.

## Earlier attempts retained

| Attempt | Observed result and interpretation |
| --- | --- |
| `/usr/local/bin/google-chrome` convenience wrapper | Injected `--no-sandbox`; the unchanged admission guard rejected it before product receiving. Stock `/usr/bin/google-chrome` qualified. |
| Unchanged original baseline with stock Chrome | Failed the intended product assertion: `Missing accepted-source practice action #practiceCapture`. |
| Course `127f29cd67b2a3a1cf346ae5eb191e4bd1b4d5839467acc0ba2004cf7019d9d5` | Fragile parent-page popup observation timed out after opener detachment; its unhandled timeout escaped receipt writing. The lead retained the command failure. No complete receiving result was claimed. |
| Course `af1d8b72564d7ec1b6a5e0940a3207e17100855093bd6467b96671b0f24cc1cf` | New browser-target observation and handled timeout reached 10 passing groups, then Puppeteer's HTMLElement-only focus helper rejected the SVG. The final three groups remained unverified in this attempt. |
| Final course `41cf560d394d0157fcd485faccebfcf2f1422901af49316afc1fddb532b61eff` | Native SVG focus was asserted before actual keyboard input. All 13 groups passed; consumer assertions and sandbox requirements were retained. |

## Review and integration handoff

The lead executed receiving through Renpō. `route_recovery` authored the implementation and user documentation; `consumer_validation` authored the browser course; `implementation_review` independently reviewed both, including the two evidenced harness corrections. The lead retained the exact candidate launch/browser evidence as `capture-candidate-evidence.json`.

Main subsequently advanced through unrelated PR #418 to `870bc4ae7c67f8d46cf0450a061bc2b0c269fcf7`. The lead composed the 14 incoming files and verified all **1,560 non-owned published blobs** unchanged in the resulting source (1,563 published blobs, excluding the three modified tracked files from that comparison). The composed candidate then passed the same **13 browser groups** again through literal `npm start`, with active Chrome sandbox admission at `2026-10-26T22:18:50.441Z` and no observed page exceptions or offsite requests. This verifies the integrated candidate before publication.

A second incoming change, PR #419, advanced main to `0ec57fa8f1c6584ea78ae3e29361cc9e9ce681e2` (tree `2ba3e584cbf6e3150feea721947bb826be2b4a46`). Its six offline-lesson files were preserved without overlap. All 1,562 non-owned published blobs were verified from the 1,565-file base, and the complete 13-group browser course passed again. The launch additionally compared five served assets byte-for-byte, including the incoming offline-lesson module. No production code in this contribution changed during either composition.

**Final composed-main receiving:** passed on base `0ec57fa8f1c6584ea78ae3e29361cc9e9ce681e2`; exact browser, launch and source-provenance records accompany this receipt. This record covers verification before publication. The closing PR's completion comment records the merged source and post-publication receiving.
