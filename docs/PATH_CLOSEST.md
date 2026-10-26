# Find the closest original spans without guessing a bound

In the original two-path comparison, **Find closest spans without a bound**
uses the complete first sampled path as a pattern. It searches every complete,
contiguous second-path interval containing at least two selected samples.
For each interval it computes the smallest possible largest paired separation,
then presents every interval tied for the closest computed value. All candidate
scores remain inspectable; no endpoint choice or numerical acceptance bound is
required to run this inquiry.

The source-derived discrepancy is **not a physical tolerance or a success
criterion**. Even unrelated or reversed paths have a nearest span when complete
candidates exist. The interface calls these findings *nearest-only* and keeps
the separate explicit-bound query, its entered bound and its result unchanged.
A failed bound query remains failed after the closest-span comparison. No
inferred criterion silently replaces it.

Select a span to inspect a complete minimizing pairing against both original
frame sets, with unchanged point overlays, original sample identities and
presented timestamps. Repeated pairings are allowed; every pattern sample and
every target sample inside the interval is visited. Missing target observations
split coverage, and any missing pattern observation prevents a complete
comparison. Unselected frames remain part of the retained source but do not
supply inferred point observations.

## A bounded mechanism using the existing matcher

For a finite pair-distance grid, every complete monotone pairing has a largest
distance equal to one of the actual grid entries. Its minimum is therefore
also one of those finite entries. The existing `countMonotoneCouplings` kernel
answers whether a proposed bound admits any complete pairing. Binary search
over sorted distinct entries locates the first admitted value; the same kernel
counts all pairings at that value and supplies a complete witness.

This reuses the maintained matcher, calibration, source validation and
interval enumeration. It introduces no registration solver or fitted spatial
transform. At the inherited twelve-sample limit there are at most 66 target
intervals and 144 distances in any grid. Counts are exact integers for the
computed nominal grid; they are not probabilities. Exact equality of computed
distances defines ties. Small calibration arithmetic differences can change
ties, and no undocumented numerical or physical tolerance is applied.

An authored example embeds a three-point pattern after an approach and before
a withdrawal, with a repeated middle sample and a (+0.5,+0.5) mm displacement.
A 0.001 mm explicit-bound query correctly finds no occurrence. The separate
nearest-only inquiry locates the original four-sample span at approximately
0.707107 mm minimum largest separation, while retaining that failed criterion.
This demonstrates a geometric comparison and reduced numerical input, not
an action-recognition or physical-learning result.

## Save and reopen

**Save nearest-only query with original sources** retains both complete original
PNG bundles and a distinct `skill-translator.path-closest/v1` raw query. It
stores neither an acceptance bound nor an authoritative derived result.
Reopening validates source identity and the declared common point/frame,
then recomputes every candidate. The explicit-bound query can still be saved
separately through its existing button. Changing either original source or its
correspondence declaration retires both views and any delayed import/export.

Native receiving: `node --test test/path-closest.test.mjs test/path-occurrences.test.mjs`.
The maintained `tools/browser-path-comparison.mjs` course includes original
source intake, preserved failed-bound comparison, complete PNG save/reopen,
unrelated-source controls, delayed import retirement and narrow keyboard
inspection. Actual executed receiving is recorded separately from these
reproduction commands.
