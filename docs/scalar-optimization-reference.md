# Independent scalar optimization references

This package supplies regression evidence and diagnostic tools for [issue #343](https://github.com/Jacob-Met/skill-translator/issues/343). It does not change production code. Numerical repair remains with `estate-0def-20261027`, with the existing `hamon-56bfaa95-20261025/root` integration ownership and #336 interface boundary preserved.

## Findings

The retained baseline is commit `3bb52f0f7147dce23c32e64c45f4e6b06e19ac73`, model blob `7ac7c9030b692bea794ee50a2b4b726ce44ef2d3`, model SHA256 `cd400e5bcf29f46ad5cf9c1cb4ca3e1a819911a4fb57635a00b45e54d51a703c`. Before handoff, main advanced to `9d379589c7bda181ce406c5ed3cc7202b51290d3`; all 16 source/package/test files used here retain identical Git blobs. The full repository was not checked out for execution; the exact selected import closure was received and verified.

A deterministic 224-case corpus covers seven lengths (6 through 65), four clock patterns, four signal patterns and two value scales. Every case passes the actual public admission as one group, retaining its original samples and indexes. The frozen screen simulator exactly matches production's step score, rho, split and means on all 224 cases. Thirteen cases have a better candidate when every split receives direct residual scoring with the **same fitted coefficients**.

Changing only the step verification condition to `if(true)` in a temporary copy reproduces all 13 exhaustive winners exactly. Every alternative-family result stays identical. At each skipped winner, the rough score fails to beat the incumbent, the direct score beats it, and the cancellation guard is false; neither SSE uses the variance floor.

| Witness | Baseline step score | Independent feasible bound | Consequence |
| --- | ---: | ---: | --- |
| Case 105: 65 samples, split 4 | -1245.109085783195 | -1254.7154789735705 | At least 9.606393190375456 score units are missed |
| Case 107: 65 samples, split 11 | -374.12352564452766 | -378.8346015879404 | Study status changes from alternative-preferred to weakly-separated in the gate-only diagnostic |

For case 107, the best-alternative-minus-step margin changes from -1.7653465337587022 to 2.9457294096540636. The latter is below log(65), so it remains weakly separated. The maintained selection API rejects the baseline result and accepts the diagnostic result, with a valid retained six-sample playback-range object. Navigation availability and selection eligibility are separate: the baseline has supported navigation timing but selection remains rejected.

The actual maintained import, inspection, selection and playback-range APIs were exercised for 21 authored fixtures against baseline and the gate-only copy. The endpoint cosine remains explicitly numerically unresolved and unselectable. The source is authored clip metadata with zero retained moments; no browser rendering, media existence, decoding, seeking or actual playback is claimed.

## Acceptance targets and controls

The ordinary acceptance tests evaluate explicit feasible candidates independently of production fitting. Residuals account for the exact stored normalized doubles using rational arithmetic; covariance and scoring then use ordinary doubles, the original timestamp gaps, existing 13-rho grid, penalties and floor. The absolute score tolerance is 1e-7 for these fixtures, not a universal error bound or a rank threshold.

Six controls pass the baseline: exact constant, linear and spike, plus three-cluster cosine under the base clock, an exact time shift, and exact clock/value unit changes. Four targets fail: the retained exact-step and endpoint-cosine cases from prior receiving, and the two new screening witnesses. The endpoint feasible residual is small but nonzero. The two new witnesses have positive SSE and do not activate the floor.

The one-sided assertion requires the reported family score to be no worse than an explicit feasible bound. A repaired solver may choose different coefficients, split, rho or frequency and may beat the witness. These are necessary objective bounds, not proof of global optimality or a complete audit of reported-score truthfulness. The public periodic result does not expose fitted coefficients for direct re-evaluation. Preserve all failing assertions as ordinary tests; do not turn baseline failure into expected behavior.

## Run against a repair

From the repository root:

```sh
node --test tools/scalar-reference/finite-objective-witness.test.mjs tools/scalar-reference/screening-feasible-witness.test.mjs
```

These tests are deliberately outside the default `test/*.test.mjs` suite until adopted with the repair. On the retained affected source the result is **6 passes and 4 failures**, with a nonzero exit code. The command has no frozen-source restriction and is intended to run against a new implementation.

The separate maintained covariance, proposal and study tests passed 13/13:

```sh
node --test test/instrument-change-covariance.test.mjs test/instrument-change-proposals.test.mjs test/instrument-change-study.test.mjs
```

## Reproduce the historical screening diagnosis

These runners are frozen to the recorded source. Their source guards must stop on a changed implementation; use the ordinary acceptance command above for a repaired solver.

```sh
node tools/scalar-reference/audit-step-screen.mjs
node tools/scalar-reference/prepare-gate-diagnostic.mjs
node tools/scalar-reference/diagnose-step-gate.mjs
node tools/scalar-reference/receive-study.mjs
```

The audit prints a fresh report. The causal and study runners consume the retained baseline audit in `docs/receipts/scalar-reference-20261027/baseline-screen-audit.json`, which preserves all 13 failure arrays and diagnostics. Preparation creates verified temporary copies under `tools/scalar-reference/interventions/step-gate-all/`; generated copies are excluded from this changeset. Preparation accepts existing identical copies and refuses mismatches.

## Evidence and limits

Receipts under [scalar-reference-20261027](receipts/scalar-reference-20261027/) retain source manifests, exact baseline failures, the full audit, gate-only results, study results, and package replay. The initial 224-case audit took about 1.27 seconds including process startup on the observed Node v22.23.4 host; this is a bounded execution observation, not a production performance claim.

Unconditional residual verification has quadratic cost in input length and is a causal diagnostic, not an endorsed production fix. This corpus demonstrates specific screening losses, not their prevalence or accurate normal-equation coefficients. No covariance/frequency grid, penalty, score floor, admission rule, schema, UI, production implementation or deployment was changed. Final repair receiving and adoption remain separate obligations.

## Independent receiving of the owner's V3 candidate

A read-only copy of the repair owner's model at SHA256 `4232ef2c3aeebe654f369372c2af5c8435b13bb1d76bba300f3c09c22e841922` was received from `estate-0def-20261027` and substituted only in our isolated copy of the verified import closure. Its source path at receipt was `/home/ubuntu/work/estate-0def-20261027/candidate/src/instrument-change-models.mjs` on hamon-coord-5.

All **23 tests passed**: the 13 maintained tests and 10 independent acceptance targets. The reusable repair receiver also passed **21/21** cases, including independently evaluated feasible bounds for all 13 retained screen misses. On the two highlighted low-offset step signals it directly evaluates the returned physical means after normalization and checks consistency with the reported score; both match at printed precision. This extra check is deliberately scoped to those two signals and is not a universal guarantee under lossy value offsets.

Case 105 scores -1254.7154862823647; case 107 scores -378.835238942233. Both beat their frozen feasible bounds. Case 107 is weakly separated and selectable with improvement 2.946366763946628. The endpoint cosine now has finite periodic score -337.87613312694305 and remains alternative-preferred and unselectable. The exact-step target reaches its feasible bound.

Run the same receiver against a repaired implementation:

```sh
node tools/scalar-reference/receive-repair.mjs
```

This runner checks feasible bounds, original samples/indexes, the maintained study status, selection and playback-range APIs, and the two returned-step objectives. It has no frozen-source guard. Against the affected baseline it reports 15 failing bounds among 21 cases and exits nonzero; against the received V3 source it reports zero failures. The reference and fixtures remain unchanged across the comparison.

The candidate source is owned and published separately by the repair team. These results qualify only the exact received model in the stated source closure. They do not establish final PR-head equivalence, a full-repository test pass, browser/media behavior, deployment, or owner integration. Retained team reviews of the mathematics, screening mechanism and consumer interpretation were based on brokered source and execution evidence, not separate worker executions.

## Bounded alternative-family screen audit

After the step receiving, the unchanged spike and decaying-family screens were checked on 238 preserved, publicly admitted single-group inputs: the original 224 cases plus 14 targeted clustered impulse/decay controls. For each family the simulated screened score, rho and index matched actual V3 in all 238 cases. The actual family result objects also matched the affected baseline. Exhaustive scoring with the same coefficients found zero strict final winner gaps in either family; the maximum gap was zero. Inputs, original indexes and the two negative controls were retained.

The targeted controls cover sign and location, weak events on larger backgrounds, clock shifts, independently rounded value offsets, and event-free constant/smooth inputs. Offset pairs are distinct stored inputs; no coefficient, score or status invariance was assumed. All 238 cases were checked through the actual public proposal admission during this audit.

The additional command is:

```sh
node tools/scalar-reference/audit-alternative-screens.mjs
```

This diagnostic accepts the two recorded model hashes and consumes the stored targeted arrays. It asks whether screening loses a better candidate among the existing fitted coefficients. The negative result does not prove coefficient accuracy, global optimality, universal screening correctness, or that no temporarily better candidate was skipped before a later winner superseded it. It supplies no basis for a production spike/decay change or further corpus expansion. The original combined audit took 4.38 seconds on the observed host; that is not a production performance guarantee.
