# Compare declared candidate workpiece sizes

Open `/affine-candidates` with a retained raw demonstration account. Declare a target size, one to six separate candidate sizes and prospective x/y discrepancy bounds. Candidate sizes must differ from the original source, training and one another. The consumer accepts1–50 combined numeric and raw demonstration-derived training observations, leaving room for the maintained prospective receiver.

The comparison asks: **How far apart can two original models' target predictions remain if both models admit the same on-sheet reading at this candidate?** Smaller remaining spread means tighter conditional distinguishability at the target. It is neither the prediction range at the candidate nor an expected information gain. Results are separate for x and y. A candidate dominates another only when its spread is no greater in both coordinates and strictly smaller in at least one. Ties and tradeoffs stay visible. No candidate is selected automatically.

## Why prediction width alone is misleading

The authored source is100×80mm with mark(50,40). Each coordinate has coefficient domain[-1,1]² and a same-size training reading. At target110×80, original target ambiguity is20mm. With prospective bounds1mm:

|Candidate|Candidate prediction width|Worst remaining target spread|
|---|---:|---:|
|100×110, height only|60mm|20mm|
|110×80, target sized|20mm|2mm|
|120×80, twice width change|40mm|1mm|

The widest envelope varies a coefficient that cannot distinguish the width-dependent alternatives at this target. The native controls independently derive these bounds and attain them with explicit model pairs. They also compare25 oblique candidates against an independent boundary-intersection oracle.

## Exact on-sheet calculation

For each coordinate, let P be the maintained exact convex polygon of affine coefficients, o the supplied source coordinate, c the candidate size change and e the declared prospective bound. A model permits some reading on a candidate axis of extent L exactly when its predicted coordinate lies in[-e,L+e]. Restrict P with those two half-planes, giving P_c.

Construct D=P_c−P_c as the convex hull of all vertex differences. Two candidate prediction intervals can share a reading when |c·d|≤2e. Each model's interval already intersects[0,L]; these three one-dimensional intervals then intersect jointly because pairwise intersection suffices for intervals. Intersect D with that strip and maximize the target-direction dot product. D and the strip are symmetric, so this maximum is the maximum absolute target separation. This is an exact worst-case value over the conditional family, not a sampled estimate or average.

If P_c is empty for either coordinate, the candidate admits no complete on-sheet reading under the assumptions. It is labeled not comparable, excluded from dominance and cannot be handed off as a selected plan. It is never scored as zero ambiguity. Point and line families, inclusive sheet boundaries and zero discrepancy bounds are supported.

The implementation reuses the maintained exact-halfplanes rational operations and clipping. A comparison shares a declared work counter across all candidates and axes, capped at200,000 counted hull/constraint operations. Pair construction has a12,544-pair capacity; clipping retains the existing244-vertex and4,096-bit rational limits. Any work, arithmetic or admission refusal returns no complete comparison. The UI worker keeps the bounded calculation away from interaction rendering. A refused or pending result is never presented as a new ranking.

## Source custody and prospective handoff

The comparison account saves the complete raw training, target, every candidate size and every prospective bound in a typed compact JSON envelope capped at2,000,000 bytes. Reopening recomputes results, ignoring supplied derived claims. Training annotations remain individually inspectable. Original pixels remain separate and must match the maintained image identity admission before reattachment.

Choose a comparable candidate explicitly, then declare that outcome readings were not used to choose it. Download the selected raw prospective plan and open it in `/raw-affine-challenge`. That file preserves unchanged raw training, the selected size and an empty outcome list. Edits invalidate the selection and declaration.

**Save the comparison account separately to retain the planning bounds.** The maintained raw challenge plan schema has no prospective-bound fields. Actual outcome bounds must be explicitly supplied in that receiver and may differ; no planning bound is silently enforced or inferred from practice tolerance. The raw challenge subsequently evaluates those actual supplied readings against unchanged training. Neither declaration is a trusted timestamp or acquisition record.

## Limits

Calibration, landmark correspondence, training, coefficient domain, target dimensions and discrepancy bounds are supplied assumptions. A farther extrapolation can appear more distinguishing under the affine model without being physically credible. Finite-list dominance is not optimality over all workpiece sizes. This consumer does not provide probabilities, expected information, physical acquisition, inferred correspondence, causal diagnosis, automatic correction or validated skill transfer. It does not consume held-out outcomes to choose a plan or refit training.

## Receiving

Eleven authored native groups pass locally, covering target-specific discrimination, independent oblique oracle, point/segment geometry, impossible and boundary on-sheet readings, Pareto tradeoffs, raw annotation custody, explicit handoff and refusal. Independent peer review and final composed receiving must be recorded separately.

Run `node test/affine-candidates.test.mjs`. The authored browser course has ten groups and is not claimed executed until the receiving host records its result. From the composed repository run:

```sh
PUPPETEER_PATH=/tmp/hamon-f1c45f6f2aec-chronos/browser-tools/node_modules/puppeteer-core CHROME_BINARY=/opt/google/chrome/chrome QA_OUTPUT=/tmp/skill-candidates-FRESH node tools/browser-affine-candidates.mjs
```

The course asserts direct namespace/seccomp sandboxing, checks actual worker comparison, raw image inspection, stale-edit invalidation, both downloads and maintained raw handoff, invalid/oversized accounts, delayed file reads,390px keyboard selection and worker-unavailable refusal. It closes the mobile page and foregrounds desktop before the final control. Use a fresh output directory. All fixtures are authored analytic controls; no physical efficacy is claimed.
