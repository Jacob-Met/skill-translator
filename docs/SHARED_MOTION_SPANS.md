# Shared motion within original time spans

Relationship Discovery now proposes **when** supplied points move together, without requiring the author to split a recording into intervals or label its moving groups.

## Maintained journey

Open the original calibrated sequence bundle from Demonstration Studio in Relationship Discovery and retain the existing common-plane and point-identity declarations. The whole-course groups remain available. **When do points move together?** automatically enumerates contiguous intervals of the original retained moments, presents overlapping maximal alternatives, and highlights the selected points on the verified original PNGs.

The timeline retains every original moment, including uncalibrated gaps. Selecting a span exposes its source-pair fits and a concrete reason it cannot extend to either neighboring retained moment. Save original inputs through the existing control: every original PNG, annotation and declaration is retained, and reopening recomputes the spans. No derived verdict or new authored task step is saved.

An ordinary comparison of separate demonstrations has no supplied temporal ordering, so it does not receive a span interpretation.

## Mechanism and contract

`inspectSharedMotionSpans(sequenceDiscoveryAccount)` consumes the existing `skill-translator.sequence-discovery/v1` account. It reuses `sequenceDiscoveryInputs`, the shared calibrated point admission in `sharedMotionInputs`, and the maintained `fitProperPointPattern`. The point population is the first calibrated retained moment's reference IDs, at most 12. The sequence already admits at most 12 retained moments.

For every point set of at least two members, the mechanism fits every original source pair once. A fit must have a resolved proper rotation and translation, and every point residual must be within the declared exploratory threshold plus 1e-9 mm numerical slack. Missing points or uncalibrated original moments cannot support that pair.

Every contiguous interval of at least two original retained moments is then checked. For a fixed point set, an interval passes exactly when every source pair inside it passes. Extending a failed interval cannot repair its failed pair, so temporal early termination is valid. There is no pruning based on smaller point sets: the maximum residual of a least-squares fit is not hereditary in point membership.

The returned alternatives are jointly maximal in point inclusion and temporal containment. A supported set is omitted at an interval if any strictly larger supported set covers that interval, or if the same set extends one retained moment in either direction. This is the complete frontier for the stated fitted-model test; point and time overlaps remain alternatives, not a forced partition.

`inspectMotionSpan(account, {ids,startMomentId,endMomentId})` recomputes all selected-span fits and neighboring-extension witnesses from original inputs. It never accepts a saved verdict.

At the maximum 12-point/12-moment input, the core evaluates 4083 point sets, 66 intervals and at most 269478 proper fits (1621224 point fits). It stores compact support arrays rather than rerunning the entire whole-course grouping calculation for every interval. It refuses reference populations above capacity as one calculation; original pair discovery and source custody remain available.

## Meaning and limits

The fit is a deterministic least-squares proper-motion model. Completeness refers to enumeration under that particular model, not a minimax search over every transformation that might fit a residual bound. A failed fit does not rule out every threshold-feasible transformation.

The mechanism uses supplied calibration and point identities. It establishes sampled geometric agreement. It does not establish continuous motion between retained frames, physical attachment, contact, object identity, causal intent, task-step boundaries or skill. Two-sample alternatives remain explicitly two samples; short accidental agreement is not silently promoted to physical grouping. Later new point IDs do not expand the first calibrated reference population.

The original source adapter may omit uncalibrated moments from ordinary pair comparison. Span inference deliberately keeps them in the timeline so it cannot bridge such a gap. A missing point breaks only intervals containing that point; other complete groups may continue.

## Receiving and measured change

The four-frame authored original-PNG control separates one point after the first three frames. The previous whole-course grouping retains the two remaining points and the unaffected second group, but cannot expose the earlier triple. Span inference recovers that triple over 1–3 seconds, retains the whole-course alternatives, and also exposes a two-sample overlapping stationary alternative at the end. Neither group labels nor interval boundaries are supplied.

- 45 affected native tests pass, including 11 new span tests: original-source change, all-pair contradictions, uncalibrated and point-specific gaps, reflection, collapsed geometry, reopen noninterference, ordering, capacity and invalid selections.
- The independent Python/NumPy SVD receiver enumerates 13680 point-set/interval combinations over 24 held-aside authored cases. Direct dominance filtering agrees on all 125 maximal spans, their residuals and the total supported-combination counts.
- The new sandboxed browser receiver exercises eight groups: original PNG intake, automatic earlier group, alternative selection, real download/fresh-page reopen, changed source, retained gap, wrong-image rejection, 390px keyboard inspection and refusal to invent time for unordered comparisons. The existing seven-group whole-course browser receiver remains passing.
- Desktop and narrow screenshots were inspected. They are browser viewport emulation, not physical-phone evidence.
- The pre-existing whole-project calibration test requires generated OpenCV fixtures; that unavailable host prerequisite was reproduced on untouched main during #387 and is not relabeled a full-suite pass here.

Reproduce from this maintained source:

```sh
node --test test/shared-motion-spans.test.mjs test/shared-motion-groups.test.mjs test/layout-feedback.test.mjs test/relationship-discovery.test.mjs test/sequence-discovery.test.mjs
node tools/receive-shared-motion-spans.mjs /tmp/span-cases.json
python3 tools/verify-shared-motion-spans.py /tmp/span-cases.json
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome node tools/browser-shared-motion-spans.mjs
PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/path/to/chrome node tools/browser-shared-motion-groups.mjs
```

NumPy is an independent receiving dependency; no runtime dependency was added. Chromium must provide its actual process/network/seccomp sandbox. The browser receipt records that admission. Inputs, native resource measurements, SVD output and rendered receiving are in `docs/receipts/shared-motion-spans-391/`. Exact published revision receiving is recorded on the native PR.
