# Explicit supplied explanation recording — #460

These reusable browser controls record only after the user chooses Start. They produce an ordinary audio File, with preview/playback and explicit Keep or Discard. This is a separately supplied explanation, not original clip sound, authenticated speech or measured sensory evidence. No page mount or notebook schema is added here. #460 remains open for #459 attachment and complete source export/reopen.

## Integration contract

```js
import {mountExplanationRecorder} from './explanation-recorder.mjs';
const recorder = mountExplanationRecorder(host, {
  onKeep: async (file, {signal, isCurrent, metadata}) => {
    // Use the notebook's own bounded local-file admission when available.
    // Check signal/isCurrent again immediately before externally adopting it.
    // Throw on refusal; return only after successful current admission.
  }
});
// Retire a pending recording when its target source/step changes:
recorder.discard();
// Remove controls and retire their tracks/preview on unmount:
recorder.dispose();
```

The callback receives `metadata.elapsedMilliseconds` and `metadata.durationSeconds` as distinct exact observations. Its default implementation keeps the File only inside this adapter; it does not attach to a source. External admission must honor the supplied signal/isCurrent before adoption. Recorder-local accepted audio changes only after a successful still-current callback. A refused replacement leaves the previous accepted File and the new preview available. The owner remains responsible for source/step identity and complete bundle replay; no unpublished #459 API is assumed.

Default limits are 5 MiB complete encoded bytes, a 30-second capture stop target, and separately a strict 30-second decoded-audio limit. Timer scheduling does not guarantee capture duration. Actual decoded duration is checked with the browser decoder; elapsed capture and decoded durations are not substituted for each other. The UI rounds display duration while raw callback metadata remains exact. Supported codec negotiation tries WebM/Opus, Ogg/Opus and audio MP4, then browser-selected encoding; failures are explicit. Stream requests, stale chunks, decoder completion and admission completion are revision-fenced. Only owned tracks, AudioContexts and preview URLs are retired.

## Receiving and limits

`node --test test/explanation-recorder.test.mjs` contains eight authored native groups for successful/refused admission, late permission streams, byte/decoded-duration bounds, stale decode/admission, device/codec adapters, encoder/stop failures and malformed limits.

`tools/browser-explanation-recorder.mjs` exercises actual MediaRecorder encoding, decoding, preview/playback and explicit keep from an authored WebAudio oscillator. Six groups passed before the final display-copy changes: prior accepted File retained on refused replacement, track cancellation, permission-adapter refusal, real byte overflow and decoded-duration refusal. The original exact module hashes remain in its receipt; this is not microphone or notebook integration proof. The generated tone and screenshots are private QA artifacts, not source files.

`tools/browser-explanation-recorder-denied.mjs` adds one targeted final-copy test: Permissions-Policy `microphone=()` and the browser Permissions API both indicate denied before the explicit Start click. The actual default getUserMedia path then rejects with Permission denied, with no stream or accepted/pending File. A browser-authored fake device avoids absent-hardware precedence without granting permission. The first attempt with no device returned Requested device not found despite policy already denied; that result was not counted as denial receiving. No real microphone was accessed. Namespace and Seccomp sandboxing remain enabled.

The helpers accept PLAYWRIGHT_PATH, CHROME_BINARY and QA_OUTPUT, run their own loopback server, and close their own browser/server. Run them as non-root. Repository path normalization changes only imports/helper file resolution; independent source review and exact historical receipts are retained. No claim of human speech capture, physical device qualification, learning benefit, full notebook receiving or #460 closure is made.
