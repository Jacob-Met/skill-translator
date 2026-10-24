# Inspect declared cue combinations

Open `/cue-sufficiency` from Decision Comparison and load its complete saved comparison. The maintained reader checks each original source and retained PNG. The page shows the same selected before/after frames and supplied intent, change, sensory and recovery accounts.

Declare up to eight categorical cues, with a name and basis for each. For every example, supply an explicit decision label and its basis, then a category for each cue. Blank decision/category cells mean unknown. Exact text categories, after trimming surrounding spaces, are compared; the application does not interpret synonyms or derive categories from images or prose.

Choose **Inspect combinations**. For every pair of differently labeled decisions, the mechanism computes which cues have known, unequal categories. A cue subset distinguishes this finite table only when it contains at least one such cue for every contrasting pair. It enumerates all inclusion-minimal subsets of the declared cues, not merely minimum-size subsets. No arbitrary preference or automatic decision follows. A constant decision column supplies no contrast. Unknown decisions block a complete distinction claim. Unknown cue cells never count as differences; a separate known differing cue may still distinguish that pair.

The results retain exact example-pair witnesses. For each reported minimal combination, every included cue has a witness pair that would lose its known distinction if that cue were removed; this explains why the cue belongs to that particular combination. A pair with identical complete cue rows and different decisions is conflicting under these declarations. A pair with no known difference and some missing categories is unresolved. Neither finding identifies a mistaken expert, a causal mechanism or a safe physical action. A distinguishing table can still overfit all supplied examples and says nothing about an unseen situation.

**Save complete cue study** retains the raw cue table, comparison and original source bundles. Reopening checks all original pixels and comparison identities and recomputes findings when requested. Saved conclusions are not authoritative. Input edits clear findings; delayed imports and exports cannot replace newer edits. A refused import preserves the accepted study. The complete bundle shares the existing 48 MiB limit.

## Verification scope

`node --test test/cue-sufficiency.test.mjs test/decision-comparison.test.mjs` exercises the mechanism and maintained comparison. Controls include complementary two-cue XOR labels, redundant alternatives, contradictory identical cue rows, unknown readings/decisions, constant decisions, full raw JSON replay and 200 deterministic tables compared with an independent subset oracle. These are authored categorical controls. Actual browser receiving and normal reviewed integration must be recorded separately; neither physical skill nor teaching efficacy has been tested by these controls.
