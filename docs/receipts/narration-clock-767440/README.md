# Original-source narration clock receiving

The original-receiving archive retains the five-second authored WebM, literal VTT, saved clock navigation, actual captured sequence with original PNG frames, source hashes, sandbox admission, desktop and narrow screenshots, source manifest, receiver and native test log. SHA-256: `b5ca044658a6b0f14e193f311494afef1ab99276b9c2dbf11c332ef16855d4e1`.

## Reproduce

Run the native command in `verification.json`. Set `PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`, `CHROMIUM_SANDBOX_MODULE` to the Workshop helper `tests/support/chromium-sandbox.mjs` at commit `3b0a64a3783aa106ccedf537d8b2ef995c9e1f06` (Git blob `74448e8878dcf285267467b74984121dd897c25c`, SHA-256 `4607c67b360596ee06b36e41a6b5d3a8a6da70defb04292d955f609dcef05ead`), and `BROWSER_OUTPUT` to a new directory. Set `CLOCK_VIDEO` to the archived original `clock-control.webm`. Optionally set `CHROME` to the Linux Chromium executable, then run:

```sh
node tools/browser-narration-clock.mjs
```

The receiver starts the maintained server on an ephemeral loopback port and requires actual Chromium sandbox admission. Its seven groups exercise offset compatibility, the changed affine request, original-pixel capture/export, failed separate-check refusal even under an empty search, saved navigation and invalid replacement, narrow keyboard use, and stale asynchronous reads after a new clip session.

To generate a fresh authored finite-duration control with FFmpeg:

```sh
ffmpeg -nostdin -v error -f lavfi -i 'testsrc2=size=160x120:rate=30:duration=5' -c:v libvpx -an /new/path/clock-control.webm
```

Recreating a video with a different encoder build need not reproduce the archived bytes. Use the archived original for exact source replay. The video is an authored software pattern, not a demonstrated physical task. The retained requested and decoder-presented timestamps remain separate evidence.
