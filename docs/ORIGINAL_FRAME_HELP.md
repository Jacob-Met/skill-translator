# Original interior-frame help during rehearsal

In `/decision-transfer`, choose **Allow cue requests and original interior frames**
when starting a new rehearsal. This retains sensory/recovery cue help and adds an
explicit request for a frame already retained strictly between the selected
original target step's endpoints, using presented media time. It does not capture,
generate, interpolate or relabel a frame.

The selector lists source times, without revealing authored frame descriptions.
Each requested image is displayed with its exact retained SHA-256 and whether it
was requested before or after the first answer. The final target image, step title
and full authored account stay hidden until ordinary reveal. A request preserves
an unsaved prediction draft; save remains unavailable until that draft is retained.
Each interior frame can be requested once, and no new request is admitted after
full reveal. Intervals without an interior retained frame explicitly have none.

Original-frame disclosures have their own assistance count, distinct from requests
for absent textual cues. An image can show useful evidence or part of an outcome;
withholding the final frame does not make a response unassisted. Prior familiarity
is declared, not verified. No action, correctness, learning gain or physical skill
is inferred from a frame request.

Version3 transfer sessions and complete source bundles preserve this event stream.
Reopening checks the unchanged original comparison, target step, exact frame hash
and strict presented-time bounds, then replays the maintained cue reducer for all
other events. Version1 ordinary and version2 cue rehearsals remain supported.
Downgrades that would lose original-frame help refuse.

## Receiving controls

`node --test test/frame-help.test.mjs test/cue-transfer.test.mjs test/decision-transfer.test.mjs`
checks source/identity refusal, endpoints, duplicate requests, before/after-answer
chronology, full reveal, portable replay and old-format refusal. The source browser
harness is `tools/browser-frame-help-source.mjs`; it uses `FRAME_SOURCE_SEQUENCE`
to receive a separately retained original producer bundle. Set `PUPPETEER_PATH`,
`CHROME_BINARY` and `QA_OUTPUT` as for the existing selective-cue browser harness.
It requires the normal Chrome sandbox and performs real downloads/fresh reopen.

The maintained scissors capture has an existing broad observer-authored target
step, with three retained interior originals. The harness preserves that target
step and all source moments. Its separate short reference interval is explicitly
observer-authored; the learner is declared previously familiar with the same
source. It does not alter the earlier selective-cue receiving evidence. Capture
presented times can differ by decoder run, so admission uses the original bundle's
actual presented times and hashes. Original video, PNGs, downloads and screenshots
remain outside the repository; attribution and acquisition are documented in
`docs/CUE_TRANSFER.md`.

Qualified receiving on Chrome 156.0.8078.47 passed all 31 native tests, the eight
maintained selective-cue browser groups, and the original interior-frame browser
course. The unchanged broad original target interval retained its exact presented
times and PNG hashes, with one requested original frame before the first answer,
missing textual cues remaining unknown, preserved draft and actual download/fresh
narrow reopen. Earth independently reviewed the wrapper and state contract; Skill
independently checked admission against the original source metadata. Root ran the
normal sandboxed original-PNG consumer and inspected the source screenshots.
These checks establish consumer behavior, not learning or physical skill.
