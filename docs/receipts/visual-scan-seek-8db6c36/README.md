# Original-video seek readiness

Outcome: #202, continuing the acquisition path delivered by #198.
Base: `fc39b9bcbe417891301ad0d160486870df266d0d`.

## Actual source and observed failure

The internal experiment uses Aerra Carnicom / Aerrapc's *Aerra's Films of the
Ordinary IV — Scissors Cutting Card Stock*, published on
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm)
under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Original SHA256:
`06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe`.
The original video and derived source PNGs remain internal experiment inputs;
they are not distributed with this code or receipt. Notes in the saved experiment
are observer-supplied inspection goals, not the demonstrator's expert account.

The first two runs completed the 32-sample scan but did not retain the selected
candidate. The diagnostic run recorded the actual application message:
“Wait for the current video seek to finish before capturing.” Selecting a
candidate had started an original-video seek while Retain was still enabled.
The existing source guard correctly refused capture; no wrong image was saved.
Both failed receipts remain here. The smaller authored fixture had not exposed
this timing during its ordinary interaction sequence.

## Change and verification

Capture and playhead controls now follow the accepted video's current seeking
state. Candidate selection synchronizes them immediately, before the browser
queues its seeking event. Seek completion restores the controls; video release
detaches the same listeners. Busy work still dominates, while editing notes on
an already retained image remains independent of seeking. The original
presented-frame capture implementation and its refusal guards are unchanged.

- The actual source course passes all three groups: 32 presented samples and
  31 explicit adjacent intervals; full-resolution capture, exact PNG/source
  hashes and fresh sequence reopen; no page exceptions or offsite requests.
- The successful run retained original 1920×1080 PNGs at reported presentation
  times 3.012 and 3.312 seconds. Each new capture records its actual decoder
  callback; requested/sample times never substitute for that evidence.
- The authored scan course passes 11 groups, including an immediate native
  seek-state assertion during candidate selection.
- All 14 maintained sequence browser groups pass, including source replacement,
  cancellation, delayed capture/reopen, exact PNG binding, narrow layout and CSP.
- Independent optimizer-worker lifecycle review found no concrete issue in
  listener ownership, current-clip calculation or preserved capture guards.

Receiving used Node 22.23.4 and Chrome 156.0.8078.47 with observed active
namespace/seccomp sandbox. The nine previous runtime/course source hashes were
qualified before the initial scan merge; this receipt's `source.json` binds the
changed sequence/controller and both current browser courses to this execution.

Run `tools/browser-visual-scan-field.mjs` with the documented original file in
`SCAN_VIDEO`, an installed Playwright/Core path in `PLAYWRIGHT_PATH`, a suitable
Chrome binary in `CHROME_BINARY`, and a private `RECEIPT_DIR`. The authored scan
and maintained sequence courses use the same environment variables except
`SCAN_VIDEO`. These experiments qualify acquisition behavior, not action
recognition, physical contact, force, scale, technique quality or learning.
