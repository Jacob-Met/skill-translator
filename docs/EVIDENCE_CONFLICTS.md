# Investigate incompatible transfer observations

The task-space evidence panel now explains when no member of the existing five-rule
family agrees with the supplied observations for the selected mark. It retains the
original fractional, left, right, top and bottom interpretations and their original
measurement-radius checks.

The explanation answers a narrow useful question: what is the smallest number of
these records sufficient to contradict every retained interpretation? It reports
that size, the number of equally small groups, one deterministic complete example,
and how many of those groups contain each record. Expanding the explanation shows
the original residuals (or the original cannot-fit reason) that reject every rule.
Selecting an example observation opens its existing sheet/measurement diagram.

For example, on a doubled sheet, an observation consistent only with fixed-left
clearance and another consistent only with a fractional position form a two-record
conflict. Neither individually contradicts the whole family. Repeating the fixed-left
record creates two equally small conflicting pairs; the fraction record participates
in both. This identifies a shared witness, not a faulty measurement or a preferred
record to delete.

## Custody and limits

The mechanism calls the maintained `analyzeEvidence` function. It never changes
source calibration, marks, observations, declared radii, scores, or adopted rules.
Existing source matching and capacity limits remain authoritative. Export still
contains only the original observation inputs; reopening recomputes the explanation.
Changing the selected mark or evidence rebuilds the result. When a rule remains
compatible, the contradiction panel disappears.

“Smallest” means minimum cardinality. There can be larger inclusion-minimal groups
that this view does not enumerate. Group counts count distinct retained records,
including repeated measurements; they are not probabilities, independent evidence
counts, or confidence. A one-record conflict may indicate that none of these five
interpretations describes the observation. It does not establish measurement error,
physical necessity, force, causation, or a reason to remove data. A different
relationship outside the family can remain possible.

## Mechanism and verification

Each record supplies a five-bit mask from the maintained rule rejections. A dynamic
program over 32 masks tracks the minimum number of records and the exact integer
count of subsets attaining each mask. A second bounded pass omitting each record
computes participation in all globally smallest groups. The complete 60-record
contract is supported; no group family is silently truncated. IDs establish a stable
witness independent of input order; original labels and residuals remain attached.

`node test/evidence-conflicts.test.mjs` includes 120 independently exhaustive
small-input subset comparisons, singleton and joint conflicts, repetitions,
source refusal, no-evidence controls, input immutability, export/reopen, order
invariance, and a 60-record family containing 900 equally small pairs.

`tools/browser-evidence-conflicts.mjs` exercises actual forms, keyboard inspection,
original observation download, fresh narrow reopening, wrong-source preservation,
and clearing after an ordinary edit. Execute it with a supported sandboxed browser,
`PUPPETEER_PATH`, `CHROME_BINARY` and a fresh `QA_OUTPUT` directory. A script's
presence alone is not a passing browser receipt.
