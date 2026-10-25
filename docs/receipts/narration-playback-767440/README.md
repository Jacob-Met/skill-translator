# Original utterance playback receiving

Issue #251; reviewed core `bedef8e5c2fa14a25b49dd021c2e2807edb47e08`, base `cca60a08844070385c7201f13d74920a612f1f36`.

52 native checks passed with zero failures/skips. The new browser course passed 10 groups; the maintained regression course passed 14, both with zero page/asset errors. The lead executed these courses; a retained peer independently reviewed the source under the shared connector identity. See `verification.json` for exact boundaries, source hashes and complete observations.

The packet retains 67 source files, actual original inputs and exported records, full browser receipts, screenshots, native logs and the sandbox helper. Archive `receiving.tar.gz`: 4353198 bytes, SHA-256 `898e7b17321da87097b824141656e5d4fb6e18b0954dfef7d6faae88fea89cfb`. Its manifest is included once and hashes every other packet file.

## Reproduce

Use Node20+, Python3 and FFmpeg with Flite to create a new authored control if desired. The archive retains the exact original control used here; fresh WebM muxing can change container bytes. Reuse its frozen original files for exact-byte receiving.

    node --test test/narration-playback.test.mjs test/interval-playback.test.mjs test/clock-quotation.test.mjs test/narration-clock.test.mjs test/narration-moments.test.mjs test/timed-narration.test.mjs test/demonstration-sequence.test.mjs test/sequence-capture.test.mjs

Set `PLAYWRIGHT_MODULE`, `CHROMIUM_SANDBOX_MODULE` (the archived external helper), and a new `BROWSER_OUTPUT`. For the existing quotation receiver, set `CLOCK_VIDEO` to archived `silent-original.webm` and run `node tools/browser-clock-quotations.mjs`. For the playback receiver, set `PLAYBACK_SOURCE` to archived `original-speech-source`, `CLOCK_VIDEO` to that silent original, and `SILENT_SEQUENCE` to archived `quotation-regression/actual-sequence.json`; run `node tools/browser-narration-playback.mjs`. Owned Chrome launches with its namespace/seccomp sandbox and the receiver checks that it is active.

## Interpretation

Authored Flite source and intentional supplied-text mismatch; not ASR or verified expert demonstration.

Browser explicitly enabled original audio and observed presented video; no human audibility or sample-exact audio-boundary claim.

Playback never adopts a quote or changes saved source/narration records.
