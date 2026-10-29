# Saving and reopening Practice Review

Practice Review retains the original task and its raw practice rounds, comparison
choices, selected marks, and up to eight separately attached focused attempts.

Use **Save review and selections** before leaving. Reopen the downloaded JSON with
**Reopen a saved review**. The original and focused sources, notes, raw sessions,
labels and selected rounds remain in the file. Existing semantic checks still
recompute and validate the review.

## File sizes and accepted work

Individual source inputs remain limited to 256 KiB and individual practice-session
inputs to 2 MiB. A complete saved review has a separate 24 MiB aggregate limit.
This is a bounded storage budget for the full collection, not a claim that each
input combination always has a particular serialized size.

Saved reviews use compact JSON. The application prepares and checks those exact
UTF-8 bytes before accepting a new review, attaching or removing a drill, or
changing comparison and focus selections. If a change would exceed the aggregate
limit, the last accepted review and its saved bytes remain available. The visible
selection returns to the accepted value. Save that collection before beginning
another one.

Reviews without attached drills keep the original practice-review format. Reviews
with drills keep the existing focused-review format. No source evidence is removed
or deduplicated, and no geometry, score, tolerance or learning claim changes.

The saved-review file is checked before reading when it exceeds 24 MiB. Malformed
or semantically inconsistent input is refused transactionally. An accepted edit
still invalidates an older pending file read.

## Developer receiving

Use the existing browser tooling and installed Chrome, with the normal browser
sandbox:

```sh
QA_OUTPUT=/absolute/evidence/path node tools/browser-practice-review-roundtrip.mjs
```

Set `PUPPETEER_PATH` and `CHROME_BINARY` to the installed browser tools. The
receiver uses actual source/session uploads, a UI-exported focused source, eight
form attachments, exact downloaded bytes, and a fresh 390-pixel browser context.
It also checks malformed and mismatched input, a ninth drill, non-ASCII exact-cap
reopening, rejected selection and attachment growth, and pre-read rejection of an
over-cap file. The unchanged core must accept the attachment boundary fixture
before its storage refusal can pass.

`QA_EXPECT_REOPEN=refuse` is the explicit old-source control. It expects the
previous 2 MiB reader to reject its own larger saved review. It is not a repaired
build pass.

For the extracted runtime, set `QA_BASE_URL` to the maintained launcher's HTTP
loopback origin and `QA_BUILD_SOURCE` to its exact source commit. Pair that course
with the maintained static receiver and manifest verification; a supplied commit
label alone is not proof of the served package.

These are authored software controls, not evidence of improved physical skill or
learning.
