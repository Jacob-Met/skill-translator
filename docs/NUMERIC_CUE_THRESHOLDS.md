# Numeric cues from original demonstrations

The maintained decision comparison can now open **Numeric cue thresholds**. Its complete original comparison supplies two to six retained demonstrated steps, original PNGs and source accounts. The new workbench accepts attributed decision labels and numeric closed ranges, using one explicitly declared quantity, unit and comparison basis. Each reading names an original before or after frame. No numeric measurement, physical contact or intent is inferred from the image.

## Mechanism and convention

The model has two labels and one threshold: `x < t` receives the lower-side label; `x >= t` receives the upper-side label. Both label orientations are considered. A retained rule must agree for **every value in every known source range**, not merely one favorable value from each range.

For a proposed orientation, let `L` be the largest upper endpoint among lower-side rows and `U` the smallest lower endpoint among upper-side rows. The complete robust family is `L < t <= U`, present only when `L < U`. Original row indexes attaining each endpoint remain witnesses. No midpoint, fitted cutoff or automatic categorical bin is chosen. Equal or overlapping opposing ranges can eliminate the robust family; this does not prove that no threshold could explain some realization within those uncertain ranges.

For a separate target range `[a,b]`, every retained threshold and every target value give the lower-side label exactly when `b <= L`; they give the upper-side label when `a >= U`. Otherwise the target remains unresolved. A range extending outside the minimum/maximum observed source range is explicitly marked as extrapolation, even if the model agrees. These are conditional labels, not correct-action recommendations.

Missing decisions/readings remain explicit and unvalidated. More than two known labels is outside this model. One known label supplies insufficient contrast. Whole original clip digests are withheld together for the retrospective report, including renamed or overlapping steps. This is not independent validation or a prediction-accuracy score.

## Measured baseline gap

The maintained categorical mechanism treats distinct readings `1,2,5,6` as different supplied categories. It reports finite-example discrimination for both labels `A,A,B,B` and `A,B,A,B`. It does not infer an ordered numeric threshold or transfer to a new reading. The source-backed probe in `test/numeric-cue-gap-probe.mjs` reproduces that baseline.

The numeric mechanism retains `(2,5]` for the first course and no family for the alternating course. With declared ranges of ±0.1, the robust interval is `(2.1,4.9]`; separate ranges `[1.4,1.6]` and `[5.2,5.4]` have unanimous conditional labels while `[3.3,3.5]` remains unresolved. These authored controls demonstrate the algorithm, not observed skill or physical measurement accuracy.

## Complete maintained journey

1. Save a complete original comparison from **Compare demonstrated decisions** and follow its numeric-cue link, also listed in the workbench directory.
2. Open the comparison and inspect its original before/after PNGs. Declare the common quantity/unit, comparability/range basis, decision labels and attributed numeric ranges.
3. Inspect all robust threshold families, endpoint witnesses, missing evidence and whole-clip withheld comparisons.
4. Optionally open a separate original sequence, select a retained step and attribute a target range to its original before/after frame. Inspect unanimous conditional agreement, unresolved values and extrapolation.
5. Save the complete source-only study and reopen it. Original PNG identities are rechecked and all findings recompute. No saved verdict or target label is trusted.

The bundle uses `skill-translator.numeric-cue-bundle/v1`; its raw account uses `skill-translator.numeric-cue-thresholds/v1`. It retains the unchanged complete original comparison and optional complete target sequence. Older categorical readers refuse the separately named format rather than silently discarding numeric ranges. All references and target share the existing 32 MB / 32 megapixel source budget and 48 MB serialized bundle limit. Edits retire findings; late imports cannot replace newer drafts. A refused import preserves accepted inputs.

## Verification scope

Six focused native groups include all 1,000 small three-row interval/label courses against an independent finite threshold-cell oracle, reversed labels, exact open/closed endpoint equality, overlap, unknown data, extra labels, whole-clip omission, target source identity and forged derived findings. Existing complete-task feedback receiving remains unchanged. The actual sandboxed Chrome course uses generated original PNG controls, real file inputs, real downloads and fresh reopening, incorrect-image and late-read controls, and desktop/390 px visual inspection. This is bounded affected-source verification, not a claim that the entire repository suite or a physical learner study ran.
