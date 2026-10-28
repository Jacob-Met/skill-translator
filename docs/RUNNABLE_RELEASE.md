# Private runnable application distributions

The runtime distribution makes the accepted Task Space Lab application available
without cloning its development repository or installing npm dependencies. It
contains the maintained local server, browser modules and assets, original pinned
vendor modules and notices, four native helper tools, user documentation, launch
entrypoints and a content manifest. It does not bundle Node.js, Python, FFmpeg,
OpenCV, NumPy, developer tests, source media or receiving evidence archives.

Keep distribution within this repository's existing private visibility and source
rights. Packaging does not authorize a public release, changing vendor licenses,
redistributing demonstration media or making physical-skill claims. Review the
selected source inventory before publication, preserving all vendor notices.

## Build from an exact source version

The builder needs Python 3 with its standard library and Git. It reads exact Git
objects with replacement objects disabled; dirty and untracked working files are
not inputs. Supply a full lowercase 40-character **commit** SHA, not a branch or
tag. The output path must not already exist, and its parent directory must exist.

```sh
python3 tools/package-runtime.py --repo /path/to/skill-translator \
  --commit EXACT_40_CHARACTER_COMMIT_SHA \
  --output /path/to/output/skill-translator-runtime.zip
```

Replace the uppercase placeholder with the actual commit. The build reports its
archive SHA-256, source commit, file count and served browser asset count. It
rejects missing required inputs, links and nonportable paths rather than silently
omitting them. It rereads the completed ZIP to check CRCs, entry inventory and
exact bytes. A failed build may leave an incomplete output; retain it for diagnosis
and choose a new output path for another attempt.

The archive has one enclosing directory. Extract it completely. `MANIFEST.json`
records the source commit, builder script SHA-256, Python and zlib versions, and
every other packaged file's byte length and SHA-256. The printed archive hash
identifies the complete ZIP, including the manifest. Retain the builder version,
exact source, hashes and receiving results with the private Release. Stable entry
order, modes and timestamps do not establish identical compression across all
Python/zlib versions.

## Run and inspect

Node.js 20 or later is the only prerequisite for the browser workbenches. From
the extracted directory, run `node launch.mjs`, `sh start.sh` on macOS/Linux, or
`start.cmd` on Windows. Open `http://127.0.0.1:8787`; Ctrl+C stops the server.
The server binds only loopback. Set `PORT` to an available port if necessary.
`npm install` is unnecessary. Development commands such as `npm test` in the
included README require the source checkout; tests are not part of this runtime.

Follow `START_HERE.txt` for an authored synthetic placement example. Save source
annotations and their original media separately. A geometry/attempt receipt is
not source annotation JSON. Browser session state is not durable project storage.

Optional original-audio preparation requires `ffmpeg` and `ffprobe` on PATH.
Native sequence-edge and stationary calibration translation require Python 3 and
the pinned OpenCV/NumPy packages in `requirements-native-edge.txt`. Use a separate
Python environment; set `SKILL_EDGE_PYTHON` and `SKILL_CALIBRATION_PYTHON` to its
interpreter, or provide `python3` on PATH. These prerequisites are not installed
by the launcher. Including helpers does not verify those optional features on a
particular machine or establish physical measurement accuracy.

## Receive the extracted application

Keep receiving scripts outside the extracted directory so exact inventory checks
remain meaningful. Run the static/runtime receiver against the expected source:

```sh
node tools/receive-runtime.mjs /path/to/extracted/skill-translator-COMMIT_PREFIX \
  EXACT_40_CHARACTER_COMMIT_SHA
```

This checks the manifest and extracted inventory, launches the application and
requests maintained browser routes. It is not a browser interaction or optional
native-feature test. Use the separately maintained browser receiver for actual
placement, source export and fresh reopen, retaining its screenshots and result.
Consult that receiver's documented CLI for evidence destination and browser setup.

### Receive a separately launched application

To exercise the maintained Unix launcher, extract into a fresh directory whose
path contains spaces. From a different working directory, start the application
in one terminal, choosing an available port:

```sh
PORT=18787 sh "/path with spaces/skill-translator-COMMIT_PREFIX/start.sh"
```

In another terminal, point the receivers at that exact loopback origin. Keep the
receiving tools and new evidence directory outside the extraction:

```sh
SKILL_RECEIVE_BASE_URL=http://127.0.0.1:18787 \
node tools/receive-runtime.mjs "/path with spaces/skill-translator-COMMIT_PREFIX" \
  EXACT_40_CHARACTER_COMMIT_SHA

SKILL_RECEIVE_BASE_URL=http://127.0.0.1:18787 \
PUPPETEER_PATH=/absolute/path/to/an/existing/puppeteer/installation \
node tools/receive-runtime-browser.mjs \
  "/path with spaces/skill-translator-COMMIT_PREFIX" \
  /path/to/new-receiving-evidence EXACT_40_CHARACTER_COMMIT_SHA
```

Set `CHROME_BINARY` if Chrome is not at the receiver's default macOS location.
The external URL must be an HTTP origin using literal `127.0.0.1`, with an
optional port and trailing slash. Credentials, other hosts, paths, queries and
fragments are rejected. Static verification rejects redirects and checks the
complete extracted inventory and exact maintained route bytes. The external
browser course requires that verification on the same origin before opening
Chrome, then checks placement, the downloaded accepted-placement receipt and
source export/reopen. Its evidence includes `external-static-receipt.json`. Both receipts record the
executing receiver's `receiver_sha256` separately from the application's
`source_commit`; the receiving tools can be newer than the frozen package.

An external-server failure cannot fall back to a server started by the receiver.
The receivers do not stop the external application; stop the terminal that
launched it with Ctrl+C after receiving. With `SKILL_RECEIVE_BASE_URL` unset,
the existing self-hosted modes remain available.

Retain the launch command, working directory, extracted path, process receipt,
archive digest and actual platform with the results. Route-byte checks identify
what was served at verification time; the URL alone does not identify the
launching process. A Unix launcher result does not establish Windows support.


### Receive complete-task practice

The maintained practice browser course exercises saved whole-task rounds,
standard and mirrored pointer placement, the four SVG margins and inclusive
sheet edges, retained photo-annotation lineage, keyboard adjustment and a
390 px viewport. Its inputs are authored software controls.

To run this course against the same separately launched package:

```sh
SKILL_RECEIVE_BASE_URL=http://127.0.0.1:18787 \
SKILL_RECEIVE_ROOT="/path with spaces/skill-translator-COMMIT_PREFIX" \
SKILL_RECEIVE_COMMIT=EXACT_40_CHARACTER_COMMIT_SHA \
QA_OUTPUT=/path/to/new-practice-evidence \
PUPPETEER_PATH=/absolute/path/to/an/existing/puppeteer/installation \
CHROME_BINARY=/absolute/path/to/chrome \
node tools/browser-practice.mjs
```

The course first runs the maintained manifest and route-byte receiver on that
exact origin. It neither starts a fallback application nor stops the external
launcher. With the external URL unset, it starts its usual isolated source
server. Keep the receiver source and evidence outside the extracted package.

Before publishing a versioned private GitHub Release, record actual checks and
their platform/runtime versions, including failures and untested optional paths.
After upload, download the asset through the intended account, verify its SHA-256,
extract it anew and repeat the relevant receiving against that downloaded build.
Verify Jacob can access the private Release. Launcher availability alone does not
establish Windows, macOS or Linux compatibility; list only exercised platforms as
verified. This document defines the procedure and does not claim it has passed.
