# Inspect support with each example withheld

In the cue-combination workspace, open the complete original comparison or saved
cue study and declare categorical readings as usual. Choose **Inspect each
example withheld**. The original study stays unchanged. For each example, the
receiver recomputes all inclusion-minimal separating cue combinations using only
the other original evidence, then compares the withheld readings with those retained rows.
Copies sharing the original clip digest, ordered before/after PNG digests and
presented times are withheld together, even when their step or moment names differ.
The panel lists every withheld row. It does not treat merely sharing a clip or
category as duplicate evidence; different evidence may still be correlated.

Each combination shows three disjoint groups with their original example numbers:

- **Exact categorical witnesses:** all selected categories are known and equal.
- **Unknown-compatible:** no known selected category differs, but at least one
  selected reading is unknown. These rows are not exact support.
- **Known categorical differences:** at least one known selected category differs.

The withheld declared decision is displayed separately. If an exact witness exists,
the panel states whether its declared label matches or opposes the withheld label.
It never fills a missing decision or chooses an action. A remaining table with no
decision contrast, unknown labels or no separating combination remains unavailable.
With only two original examples, withholding one leaves too few examples for the
maintained comparison; this is explicitly reported.

For an authored four-row XOR table, the complete table separates with two cues,
yet every omitted cue pattern has no exact witness among the other three rows.
By contrast, repeated 0/A and 1/B categories on different retained evidence can
have same-label exact witnesses. Renamed copies of the same original evidence
cannot support one another. Neither case establishes independent measurements.

Edits retire the panel. Saving retains the same original input study; reopen it
and request the inspection again to recompute. No derived omission result becomes
authoritative saved evidence. This retrospective comparison supplies neither an
action rule, generalization guarantee, calibrated confidence, learning estimate
nor a physical-skill score.

Verification: `node test/cue-support.test.mjs`; actual browser receiving uses
`tools/browser-cue-support.mjs` with the existing Puppeteer/Chrome environment.
Native controls cover XOR, replicated and opposing labels, unknown readings,
unavailable cases, raw replay, immutable sources and independent row partitions.

