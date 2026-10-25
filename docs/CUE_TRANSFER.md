# Selective help across demonstrated examples

In `/decision-transfer`, open a complete original comparison, choose distinct
studied-reference and target examples, and declare target familiarity. Select
**Allow separate sensory/recovery cue requests** before starting the rehearsal.
The ordinary full-reveal mode remains available.

The studied reference stays visible. The target begins with its original before
frame. You may request its supplied sensory or recovery cue separately; only that
account field is disclosed. An omitted cue stays **Not supplied — unknown**. The
after frame, intended result and visible-change account stay hidden until full
reveal. Requests preserve any prediction draft; retain your first prediction
before exporting. No request rewrites an already retained response.

The assistance record distinguishes requests before/after the first answer,
requests for missing cues, actual supplied cue disclosures, and full reveal before
answer. Requesting a missing cue is recorded but does not count as a supplied cue
disclosure. Prior familiarity remains a declaration; the interface cannot know
what was seen elsewhere.

Selective rehearsal exports use version2 for both the session and complete source
bundle, preserving cue events and all original PNGs. Reopening recomputes the
assistance history against the exact retained comparison and target. Ordinary
version1 rehearsals remain readable, while mismatched/downgraded help formats
refuse rather than silently dropping assistance. Existing size and history bounds
come from the maintained cue-practice and source-bundle consumers.

This adapts the maintained cue-practice reducer to the existing cross-example
consumer; it does not add an automatic correctness score, prove unfamiliarity,
authenticate chronology, establish physical skill or measure a learning effect.

Native controls: `node test/cue-transfer.test.mjs`. Actual browser course:
`PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-cue-transfer.mjs`.

## Separately retained original-source receiving

The optional `tools/browser-cue-transfer-source.mjs` accepts the documented
scissors source bundle through `CUE_SOURCE_SEQUENCE`. It does not download media.
The fixed clip hash and five original retained frames must match. It creates two
explicitly observer-authored intervals within that same demonstration, with an
unresolved relationship, and tests that absent original expert cues remain
unknown. These intervals are not asserted to be equivalent operations. Original
PNG bytes and observer/demonstrator attribution stay separate; no expert intent,
sensory evidence or learning result is invented. Media and receiving captures
remain separately retained rather than distributed with code.

## Executed receiving and reproduction

The qualified receiving run passed 27 native cases and eight authored browser
groups. A separate original-source run acquired the exact 1,006,547-byte WebM,
captured five actual presented frames through the maintained `/sequence` producer,
and passed the original-source selective-cue course. The complete export and
reopen retained all original PNG bytes. Two requests occurred before the first
answer; neither disclosed a supplied cue because these source accounts contain
no expert sensory/recovery cues. This is evidence of the bounded consumer and
source-custody behavior, not evidence of successful skill transfer or learning.

The source is **Aerra Carnicom / Aerrapc**, *Aerra's Films of the Ordinary IV --
Scissors Cutting Card Stock*, made available under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) on its
[Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm).
The acquisition utility records that attribution and checks SHA-256
`06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe`.

Run the following from a source checkout, with an installed Puppeteer module and
a Chrome executable that supports its normal sandbox. Use a fresh capture
directory; the harness refuses to overwrite an accepted capture. The utilities
are reproducibility harnesses only and add no production dependency.

```sh
python3 tools/acquire-cue-source.py /tmp/skill-cue-original-media
PUPPETEER_PATH=/absolute/path/to/puppeteer.js CHROME_BINARY=/absolute/path/to/chrome EDGE_VIDEO=/tmp/skill-cue-original-media/scissors-original.webm EDGE_RECEIPT_DIR=/tmp/skill-cue-original-capture node tools/capture-cue-source.mjs
PUPPETEER_PATH=/absolute/path/to/puppeteer.js CHROME_BINARY=/absolute/path/to/chrome CUE_SOURCE_SEQUENCE=/tmp/skill-cue-original-capture/scissors-sequence-reviewed.json QA_OUTPUT=/tmp/skill-cue-original-receiving node tools/browser-cue-transfer-source.mjs
```

The capture requests 4, 5, 6, 7 and 8 seconds; the receipt records actual presented
frame times and hashes rather than claiming exact frame-time equality across
browser builds. Observer-authored interval accounts remain separate from the
demonstrator's recorded actions. Original media, downloaded source bundles, original PNGs and screenshots containing the original footage stay **outside the repository**. Published receiving evidence contains source identities, attribution, checks and authored control captures; it does not redistribute the source footage.

The first development capture receipt serialized an unawaited browser-version promise as `{}`. That original receipt remains retained. The harness now awaits `browser.version()`. The corrected producer and original-source consumer were received again after the current visual-span dependencies were incorporated, with a fresh capture directory and an explicit `Chrome/156.0.8078.47` version receipt. The new capture retains its own actual presented times and hashes; it does not replace or relabel the prior original frames.
