# Inspect supplied scalar readings beside a demonstration

A camera may not reveal the cue an expert is responding to. This local consumer
pairs an explicitly supplied scalar instrument trace with an original
demonstration. It exposes consecutive samples satisfying a declared threshold,
then lets the viewer inspect the corresponding original video interval.
It does not infer force or contact from pictures.

Open `/instrument-trace`, load the original demonstration bundle from the studio,
then load a source-bound instrument trace. The existing sequence reader checks
the original PNG bytes. Optionally pair the exact original MP4/WebM; the existing
video loader checks its complete digest, size, duration and identity before any
interval can play. Original audio starts muted and requires explicit enablement.

Every sample remains available in the table and downloaded trace. The plot draws
points without interpolated lines; intervals above the declared sample-gap limit
are shaded. Select a run to inspect original sample indexes, supplied scalar
extrema and mapped clip times. Playback reports actual first/last presented video
timestamps independently of the requested interval. These are not instrument
sample times or authenticated synchronization.

## Pair a source and an instrument declaration

The included CLI creates a source-bound trace from an existing demonstration
export and supplied readings:

```sh
node tools/pair-instrument-trace.mjs demonstration.json readings.json > instrument-trace.json
```

The CLI admits the source metadata. It does not decode or authenticate PNG bytes;
the browser's original-bundle receiver performs that check. Keep the original
bundle and video separately. Choose a new output filename to preserve the prior
accepted source-bound trace. No remote service, instrument hardware or acquisition
operation is invoked.

A readings declaration has this structure (all values below are **authored
software examples**, not measured force):

```json
{
  "format": "skill-translator.instrument-readings/v1",
  "evidenceClass": "authored-example",
  "instrument": {
    "name": "Authored scalar instrument",
    "quantity": "supplied force",
    "unit": "N",
    "calibrationBasis": "Authored test values; no physical measurement"
  },
  "samples": [
    {"timeSeconds": 100, "value": 0},
    {"timeSeconds": 100.5, "value": 6},
    {"timeSeconds": 101, "value": 7},
    {"timeSeconds": 101.5, "value": 0}
  ],
  "clock": {
    "anchors": [
      {"instrumentSeconds": 100, "clipSeconds": 1},
      {"instrumentSeconds": 104, "clipSeconds": 9}
    ],
    "verification": {"instrumentSeconds": 102, "clipSeconds": 5},
    "toleranceSeconds": 0.01,
    "basis": "Authored corresponding landmarks and an independent check"
  },
  "settings": {
    "threshold": 5,
    "direction": "at-or-above",
    "maximumGapSeconds": 1,
    "minimumSamples": 2
  }
}
```

The clock adapter reuses the maintained narration-clock implementation. Two
increasing landmarks define offset and scale; a third, distinct landmark checks
them against an explicit tolerance. The example maps instrument100.5–101seconds
to original clip2–3seconds. A failed check leaves the raw trace and candidate
runs inspectable but disables their navigation. A run outside the fitting-anchor
interval or outside the original clip remains unavailable; it is not clipped.

## Meaning, bounds and corrections

Samples must strictly increase in original instrument time; duplicate or unordered
times are refused, not sorted or dropped. Values and timestamps must be finite.
The profile retains2–4096samples, times within6hours, supplied values within±1e12,
and complete source-bound JSON within2MiB. The declared adjacent-sample gap is
positive and at most3600seconds. A run requires2–4096consecutive qualifying
samples. Equality meets the declared at-or-above/at-or-below threshold.

Sample runs are not measured crossing times or proof of continuity between
samples. No missing coverage is interpolated. Units and calibration are text
supplied by the author; changing N to mN does not convert values or establish
calibration. `reported-measurement` records a supplied provenance declaration,
not authenticated hardware, metrology, task purpose or physical success.

Changing threshold, direction, gap or minimum samples creates a draft and retires
selection, playback and saving until inspected. Selecting a run binds its entire
normalized trace, source, units, clock and settings. A changed declaration cannot
reuse a stale ordinal run identifier. Invalid replacement input preserves
accepted work. Late file/clip reads are discarded; stale decodes are released.
Saving retains raw inputs and recomputes all findings on reopen.

## Verification

`node test/instrument-trace.test.mjs` exercises offset/scale, separate-check
failure, unsupported extrapolation, full-interval refusal, strict sample admission,
source and stale-selection binding, and100 independently enumerated irregular
sample/gap controls. Software examples do not establish instrument accuracy,
physical contact, learner benefit or cloud/model qualification.

The original-video browser receiving course must additionally qualify actual
source import, playback timestamps, save/fresh reopen, desktop/narrow keyboard
operation, malformed replacement, changed declarations and late input. Those
checks are separate from these native arithmetic and replay controls.

```sh
PUPPETEER_PATH=/absolute/path/to/puppeteer \
CHROME_BINARY=/absolute/path/to/chrome \
QA_OUTPUT=/tmp/new-instrument-course \
node tools/browser-instrument-trace.mjs
```

The course requires FFmpeg (or `FFMPEG_BINARY`) and a fresh output directory.
It encodes an authored moving test pattern, captures its actual presented frames
through the maintained browser helper, creates the original bundle and pairs
authored scalar readings through the CLI. It then exercises original playback,
downloads, fresh390px reopen, changed-source/clip/check refusal and late-reading
retirement. The receiver admits Chromium's existing sandbox; it does not disable
it. An emitted PASS receipt is required before calling that course received.
