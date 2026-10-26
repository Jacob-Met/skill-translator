# Original instrument exports in numeric cue comparison

The numeric cue workbench receives the existing source-bound `instrument-trace.json` exported by **Scalar instrument trace** or produced by the maintained `tools/pair-instrument-trace.mjs` CLI. It does not introduce another measurement producer, sample-window solver or workbench.

## Ordinary use

Open the complete original decision comparison in Numeric cue thresholds. For a reference row, choose **Attach exported instrument trace**. The original source must match that exact comparison example. The first admitted trace fills an empty common quantity or unit from its retained metadata; an existing conflicting declaration refuses rather than being overwritten or converted. Existing manual bounds are replaced only after complete trace admission.

The trace keeps every original sample, its ordering, source metadata, instrument account, calibration narrative, clock anchors and independent check. Inspect these in the expandable original-trace view. The complete original PNG evidence remains in the surrounding comparison.

Choose the original before or after frame. Automatic selection succeeds only if exactly one original sample maps to **exactly the same nominal presented time**, within the declared clock anchors and with a passing independent clock check. No nearest sample, interpolation, clipping or unstated timing tolerance is used. Zero matches remain unavailable. Multiple matches remain ambiguous unless an explicit original sample number is selected; that index must still be among the exact nominal matches, and the ambiguity remains visible.

Declare measurement-error bounds below and above the recorded value, their basis, and the nominal timing correspondence basis. These fields start blank. A zero value is an explicit exact-record model, not inferred physical certainty. Clock residual, clock-check tolerance and a prose calibration account never become measurement uncertainty. Exact nominal coincidence does not authenticate synchronization or bound timing error.

The workbench derives a closed range from the original recorded value and those separate error bounds. Nonzero arithmetic expands outward by one representable value so a tiny error does not silently disappear next to a large recorded value. This is conservative numerical enclosure, not an estimate of measurement accuracy. The existing robust threshold mechanism then quantifies over that complete source range and all retained thresholds.

The same intake is available for a separate original target sequence. Failed checks or unsupported matches retain their raw trace but supply no numeric reading. Reference inference consequently reports the missing row; an unsupported target remains unassessed.

## Portable provenance

The existing numeric account gains `skill-translator.numeric-cue-thresholds/v2`, packaged as `skill-translator.numeric-cue-bundle/v2`. This is the same workbench and retained complete original comparison, with trace-backed rows alongside optional manual rows. Each trace-backed row retains `traceReading` with the complete normalized original trace, original moment, explicit sample index or automatic mode, separate uncertainty and timing basis. It retains no authoritative copied numeric value or derived verdict.

Reopening recomputes the sample correspondence, value range and complete threshold report. A forged copied value cannot replace the retained sample. Changing original sample data or declared bounds changes the recomputed comparison. Old v1 manual files remain supported; old readers refuse the separately versioned provenance-bearing format rather than stripping its trace record.

Existing shared PNG budgets and complete48 MB bundle limit remain in force; each newly selected trace file is limited to2 MiB, matching its maintained producer. Newer edits retire pending source reads. A refused trace or complete-study import preserves accepted work. Changing the target step retires its prior timing attribution and sample selection rather than carrying them silently to different endpoints.

## Receiving and boundaries

`test/instrument-cue-producer-probe.mjs` executes five actual maintained CLI producer invocations and receives their unchanged exports through the maintained source/clock APIs. Authored values1,2,5,6 and separate target5.3 produce the expected robust family and conditional target comparison under separately supplied0.1mm bounds. Wrong source, failed independent check, unit mismatch and noncoincident sample refuse. This avoids five manual value copies; it is not a physical sensor validation.

Six adapter groups cover exact source/index provenance, raw replay, missing/ambiguous timing, explicit selection, outward tiny bounds, clock/error separation, invalid source/unit/quantity and mixed manual/trace accounts. They run beside the unchanged six numeric-family groups. The actual sandboxed browser course exercises real CLI-produced exports, original PNG admission, derived inference, ambiguity and extrapolation, actual v2 download/fresh reopen, changed original values, failed clocks, source refusal, delayed-read retirement, v1 continuity and390px original-trace inspection.

Whole-step sample joins remain with their existing owner; no scalar change detector, CSV acquisition, calibration model, hardware operation or physical-action recommendation is added.
