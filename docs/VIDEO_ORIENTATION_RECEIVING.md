# Video orientation receiving

This opt-in course checks whether original-video capture and inspection samples preserve a container's display orientation while retaining the correct source metadata. It exercises the maintained decoder and `frameOrigin` on an isolated local test page; it does not change the application.

## Run

Use Node.js 20+, an installed Playwright module, sandbox-capable Chrome, and FFmpeg/FFprobe with `libx264` encoding and the input-side `display_rotation` option. The recorded run used Chrome 156 and FFmpeg 6.1.1.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/path/to/receiving-output \
node tools/browser-video-orientation-probe.mjs
```

`PLAYWRIGHT_MODULE` defaults to `playwright`; `FFMPEG_BINARY` and `FFPROBE_BINARY` default to their command names. `SOURCE_ROOT` optionally selects another source checkout; otherwise the runner uses its repository root. It serves six exact cached dependency modules and records their hashes alongside the runner and sandbox helper. No application server is required. Results, generated controls, reference rasters and captured PNGs go to `QA_OUTPUT` (`video-orientation-probe` by default). Generated media and machine-local receipts should remain outside source commits.

## Qualified result

Receiving on October 26, 2026 used unchanged application source `76840eee02f6fe04faed3803c9fff212f3eca13a`, decoder Git blob `a437bbd77f6dd546b70fc0752ba1c2218b5143ba`, and runner SHA-256 `e003c0c14f091dfe7444d9319b946abb475c7d731fc92c06afe9f11694e4b902`.

All three authored controls passed with Chromium sandbox admission:

| Container display rotation | Captured PNG | Callback dimensions | Inspection sample |
| --- | --- | --- | --- |
| 0° | 320 × 192 | 320 × 192 | 160 × 96 |
| 90° | 192 × 320 | 320 × 192 | 96 × 160 |
| 270° | 192 × 320 | 320 × 192 | 96 × 160 |

Independent FFmpeg references agreed with every full-image and scaled-sample marker center, with maximum error zero in this run. Original-file and PNG hashes matched independent calculations. Frame-origin validation and JSON roundtrip retained both dimension domains; an inconsistent PNG width was refused. There were no page errors, missing resources or offsite requests.

`widthPx`/`heightPx` describe the browser-oriented PNG and must match its image identity. `decodedWidthPx`/`decodedHeightPx` preserve the raw callback dimensions. Their inequality is supported behavior, not a reason to relabel metadata or reject the capture. Other browsers may report equal domains; the runner records what actually occurred.

## Retained fixture lesson and limits

The initial fixture attempt used legacy rotation metadata that produced no display matrix on the receiving FFmpeg. Its preflight failed before browser qualification. The corrected generator verifies actual matrices, both distinct quarter turns, square pixels and unchanged compressed payload; filenames alone cannot establish rotation.

These static authored pixels qualify orientation and source custody on this decoder path. They do not independently test timestamp accuracy, anamorphic or arbitrary phone videos, full calibration/sequence/practice UI, physical skill, learning benefit or competition integration. Use the maintained [video browser course](../tools/video-browser-smoke.mjs) for ordinary application receiving.
