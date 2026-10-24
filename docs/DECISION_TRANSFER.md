# Rehearse across explicitly matched demonstrations

From Compare decision cues, open **Rehearse across these demonstrated examples**.
Load its complete saved comparison, choose distinct reference and target examples,
and explicitly declare prior familiarity with the target. The interface cannot
establish whether a learner has previously seen an account; the comparison itself
may already have exposed it.

Starting a rehearsal preserves the exact original comparison and both selections.
It shows the reference account with its original before/after frames and the target's
before frame. Target after pixels, step title, context and authored decision account
remain undisplayed until reveal. Before-state descriptions and source titles are
still supplied context and may themselves be informative.

Record expected change, decision cue and recovery judgment, or explicit uncertainty.
The first submitted response remains locked. Reveal compares it with the actual
retained target account without an automatic score. A missing cue stays unknown.
If reveal precedes the response, that assistance remains recorded. An unsubmitted
draft survives reveal and prevents export until retained. Afterwards record a
self-comparison and reflection; this is the learner's account, not a correctness label.

Save the complete rehearsal to retain original PNG sources, exact correspondence,
first responses, interface action order and familiarity. Reopening verifies original
image bytes and recomputes reducer state. Changed comparison bindings or malformed
sources refuse while preserving accepted work. A newer learner edit invalidates a
pending import. Changing setup selections affects only a new rehearsal; it does
not change existing responses. Starting anew explicitly replaces the displayed
session, so save it first to retain a separate copy.

The source-binding string detects mismatched retained accounts; it is not a digital
signature or authenticated chronology. No physical transfer, causal knowledge,
mastery, unfamiliarity or learning benefit is established. The finite comparison
and learner-stated relationship are never promoted to an inferred invariant.

## Receiving

`node test/decision-transfer.test.mjs` verifies first-response custody, changed
reference/target refusal, explicit familiarity, reveal-first assistance and raw replay.

`COMPARISON_FIXTURE=/path/to/authored/decision-comparison.json PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/new-transfer-receiving node tools/browser-decision-transfer.mjs`
uses the actual authored comparison download from the comparison browser course.
Use a fresh output directory. The receiver checks same-browser sandbox admission,
real Chrome download, fresh narrow reopening, retained changed-cue prediction,
malformed reference refusal, draft/reveal assistance and stale-read protection.
A script's presence does not establish an executed pass; retain execution receipts.
