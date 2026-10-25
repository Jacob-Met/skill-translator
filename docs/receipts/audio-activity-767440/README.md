# Original audio-activity receiving

Issue [#254](https://github.com/Jacob-Met/skill-translator/issues/254), independently reviewed source head `5e038f5641a1f5a9aabc3e41a26b39a202adfed6`, base `5ab4fb2084fa00cc71eb2cb94f82c6885e259b28`.

## User outcome and evidence boundary

The studio receives native audio evidence from the exact original clip, requires an explicit container-to-media clock origin, and offers complete audible-activity intervals for original playback or original-frame preview. Retaining frames and authoring a step remain explicit existing actions. Saved navigation preserves source identity, raw native evidence and the declared clock; importing recomputes all native windows/events.

The producer retains original PTS/timebase, sample rate, channels, original layout knowledge, positive gaps and decoded sample custody. Fixed 20ms windows use per-channel energy, entry RMS 0.05, exit RMS 0.025 and a two-window minimum. Opposite-phase stereo is not cancelled by downmixing. No resampling, gain normalization or gap filling is requested. Native content integrity does not authenticate a truthful external decoder, and the clock origin remains a user declaration.

## Complete authored controls

Seven WAV courses and six separately hashed MP4 originals were actually prepared with FFmpeg/ffprobe6.1.1. The MP4s include moving sound, moving silence, a delayed stream, a real timestamp gap, a stationary image with sound and continuous sound for interruption receiving.

Compared with four uniform inspection times, activity retains both development and shifted events where uniform inspection hits one. The opposite-phase event is also retained. The quiet signal is missed by the declared entry threshold, and the 20ms signal is missed by the minimum-run policy. Silence remains empty. All misses, windows and unmatched-candidate counts remain in the evidence; no physical event or speech meaning is inferred.

The actual gap is 304/375 to 128/125 seconds. No candidate crosses it. An adverse declared origin makes the complete requested interval unavailable; it is never silently clipped.

## Actual execution and repaired interruption

- Four native groups passed in 63.335012ms, zero failures/skips.
- All 7 WAV and 6 original MP4 receiving courses passed in 3.26s.
- Seven actual Chrome 156 browser groups passed in 18.53s, plus 7 existing narration-clock groups in 5.63s; zero page/asset errors.
- Actual browser Web Audio callbacks measured original energy against `media.currentTime` for moving sound, silence and the delayed source. The predeclared first-onset observation bound is 150ms; this is neither human listening nor sample-exact timing.
- Original activity preview reached the maintained studio capture path, producing distinct original PNGs, requested/presented times and an explicit authored step. Reopening at 390px retained exact evidence and keyboard controls.
- Independent review found that another studio seek could leave audio callbacks active. The reviewed repair retires the controller before narration preview or Use current playhead. Actual receiving checks timeout retirement and unrelated playback beyond the old endpoint, plus byte-identical saved navigation.
- Superseded imports, wrong source, corrupted PCM, draft clock origins and new same-byte source sessions were exercised.
- Required namespace/seccomp browser sandbox admission remained active.

All 75 executed source blobs match the proposed Git tree. Independent Microverse review is source-only and records the original blocker and repair separately from lead runtime evidence.

## Reproduce

Extract `receiving.tar.gz` into an owned directory. Its `original-native-receiving/` includes all exact source WAVs/MP4s, native reports, decoded evidence and commands. From `source/`:

```sh
node --test test/audio-activity.test.mjs
node tools/receive-audio-activity.mjs /absolute/new-native-receiving
AUDIO_SOURCE=/absolute/new-native-receiving node test/audio-activity-browser.mjs
CLOCK_VIDEO=/absolute/clock-regression-original.webm node tools/browser-narration-clock.mjs
```

The native receiver requires FFmpeg and ffprobe on PATH. Each browser command also requires external `PLAYWRIGHT_MODULE`, `CHROMIUM_SANDBOX_MODULE` pointing to the included helper, available Chrome, and its own fresh `BROWSER_OUTPUT`. Reuse the archived exact originals for comparison rather than claiming new encoding bytes are identical across tool versions.

Archive: **4,679,170bytes**, SHA-256 `1404f5b3c22a2e25cfb445c94681c1fd2d3a236fd219dc9e76be3a1425926563`, Git blob `a2b103c39eb8e8c2e61fb0fe84f26d2cfa6e2780`, 151 files. Full control results and source identities are in `verification.json`; actual browser result is `receiving.json`.
