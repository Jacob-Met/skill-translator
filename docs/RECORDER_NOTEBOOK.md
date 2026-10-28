# Record an explanation for an original demonstrated step

The existing spoken-explanations page can now receive an explicitly recorded audio draft through the same local-file admission as an uploaded file. Keeping a recording does not attach it: the supplier must still enter attribution and choose **Attach to this step**. Complete notebook download and fresh reopening retain the original demonstrated frames, unchanged notes and actual encoded audio bytes. No automatic transcription, speaker authentication or physical skill claim is made.

## Source and lifecycle

This joins merged recorder PR471 to notebook PR477, inspected at 8335ec09a14f62db335fb08824af3881d31c27e3. It adds no notebook/audio schema. The notebook still admits 4 MiB per file, 8 MiB of distinct retained audio and 12 associations. The recorder is configured to 4 MiB, with its existing 30-second capture target and separate decoded-duration limit. Uploaded notebook audio retains its independent five-minute limit.

Source/step replacement retires recorder capture, pending Keep and recorder-origin preview/draft. A generic uploaded draft retains the notebook owner's step-change behavior. If a recorded draft is being replaced by a pending manual file read, changing steps retires only the recorded draft and permits that ordinary file intake to complete. Every recorded adoption checks recorder signal/currentness, source generation, audio generation and selected step. Browser-cache return remounts idle controls; no live capture is restored. Attached notebook entries remain separate from drafts.

## Actual duration incompatibility and narrow correction

The first ordinary run reached checked MediaRecorder preview but the notebook rejected Keep: the audio element reported nonfinite duration metadata. That failure is retained in the evidence. The recorder had already decoded the actual complete encoded File through Web Audio.

One shared `audio-decoded-duration.mjs` now implements complete-byte Web Audio decoding for both receivers. The notebook uses it only when loaded audio-element duration metadata is nonfinite. Finite zero/negative/over-limit metadata and actual media errors keep their existing refusal paths. The notebook independently checks the fallback result is finite, positive and at most 300 seconds; it does not trust the recorder callback's metadata. Fresh reopening uses exactly the same admission. Container detection, complete-byte digest, source identity and saved bytes remain unchanged.

The decoder owns a copy because decodeAudioData detaches its input buffer. Abort and a 15-second timeout retire adoption, observe late resolve/reject and request context closure. A stalled native close does not delay retirement. These controls do not promise synchronous cancellation of native decoding or a hard peak-memory bound. See https://www.w3.org/TR/webaudio-1.0/#dom-baseaudiocontext-decodeaudiodata .

## Receiving

Four focused native bodies pass: owned-copy/success closure, abort with late completion, timeout with late rejection, and retirement during a pending file read without late context creation.

Seven actual nonroot sandboxed Chrome groups pass: authored oscillator through real MediaRecorder, explicit Keep/attribution/Attach, complete download/fresh reopen/play with exact original sequence/audio identity; manual upload step parity; recorded-draft retirement; mixed recorded/manual delayed-file case; live-capture retirement and persisted hide/show remount; source replacement; and delayed real Keep read after step replacement. The persisted lifecycle control dispatches actual PageTransitionEvents; it does not claim a real browser history-cache eviction/navigation experiment. Screens at 1440 and 390 px were captured privately, with no narrow horizontal overflow. The test uses an authored WebAudio oscillator, not human speech or a physical microphone.

The first missing server-route run and a subsequently corrected one-shot delayed-file harness hook are development failures, not successful product evidence. Three explicit routes serve the recorder, its unchanged core and shared decoder. Independent SKILL source reviews cover ordinary lifecycle and the narrow decoder fallback, plus its own never-resolving native decoder/close timeout control.

Run native controls with `node --test test/audio-decoded-duration.test.mjs`. The browser harness `tools/browser-recorder-notebook.mjs` needs PLAYWRIGHT_MODULE, CHROME_BINARY, OUTPUT (private writable directory) and SOURCE (a complete original sequence bundle with at least one step). It adds a clearly authored second association target to exercise retirement. No generated audio, original private PNG payload or screenshot is published.
