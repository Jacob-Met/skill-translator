# Compare declared context changes

Open `/context-order` from Prerequisite rehearsal. Import a maintained saved prerequisite rehearsal or an existing context study containing its exact retained source frames. The imported first learner proposal remains visible and unchanged.

Declare one context label and an authored basis for every step. Use the same label only when you mean the same context for this comparison. Labels are case-sensitive after trimming; their meaning is supplied by the author, not inferred from tool names, pixels or a learner's body. Unfinished drafts can be saved, but comparison requires a nonblank label and basis for every step.

## What the comparison means

Each retained step occurs exactly once in a sequential order satisfying the imported prerequisite graph. The objective counts one change whenever adjacent context labels differ. The first context is uncharged. This model does not count initial setup, a mid-step change, elapsed time, movement, effort or risk.

The result is one deterministic representative among the reported number of optimal orders. Inspect any result step against its original before/after frames and supplied intent, visible-change account, sensory cue and recovery cue. A computed order is not a recommendation to execute physical work.

The baseline is the source-listed step order, not a measured action sequence: retained frame intervals can overlap. If that list conflicts with the prerequisites, its conflicts remain visible and no reduction is reported against it. Fewer declared context changes do not establish physical feasibility, safety, readiness, completion or learning.

## Source, proposal and draft custody

Save the complete context study to retain exact source frames, original prerequisites and first proposal, and all context drafts. Reopening validates the source and clears cached comparison output; use Compare to recompute. Saved derived results are never authoritative.

Export original rehearsal returns the imported prerequisite record, including its first proposal. The solver's order never replaces a learner attempt or becomes a completion observation. Completion evidence, readiness journals and invalidation remain owned by the maintained task-readiness consumer and are neither consumed nor modified here.

Context drafts retain their bounded typed text, including spaces, while solver admission produces trimmed labels and bases. Whole-source replacement clears the previous context assignments rather than silently carrying assumptions to another prerequisite record. Rejected imports leave accepted source, drafts and comparison intact.

Complete import/adoption/cleanup operations are serialized. New requests and edits invalidate immediately; obsolete incoming assets are released. Saves must still match both the source epoch and accepted state identity before downloading. Source media admission reuses the maintained 32 MB PNG, 32 megapixel and 48 MB serialized-bundle limits; these are media/input limits, not browser-heap guarantees.

## Exact bounded mechanism

The solver supports 1–16 authored steps without dropping steps. Maintained prerequisite admission guarantees a nonempty acyclic graph; the context model enforces its upper bound before allocation.

Subset dynamic programming uses state `(completed steps,last step)`. A transition adds an unvisited step only after all declared predecessors. Its cost depends solely on whether adjacent context labels differ. Increasing subsets ensure every predecessor state is processed before its extensions, and all valid permutations are represented. Counts accumulate across equal-minimum transitions.

At 16 steps, 16! is below the safe-integer bound, so the complete optimum count remains exact. Typed-array storage is 10*n*2^n bytes, at most 10 MiB. This is an integer-model optimum, not a general physical-task optimum.

## Verification surfaces

`test/context-order.test.mjs` includes changed-context and changed-dependency controls, preservation of a differing first learner proposal, malformed/source-bound replay, 120 deterministic shuffled-topology DAGs checked by an independent full-permutation oracle, and the 16-step count/storage boundary. The oracle does not use the production DP representation.

`tools/browser-context-order.mjs` generates an original authored clip and receives it through the maintained Studio and prerequisite workflow. It exercises partial drafts, changed conditions, source-frame inspection, actual original-rehearsal export/import, fresh 390px reopening, invalid PNG/input refusal, bounded admission and forced asynchronous replacement/save races. It records exact tested source hashes. Execution results belong in the integration receipt; source code alone is not a passing-run claim.

The authored clip and context/prerequisite assumptions are software controls, not measured expert success, physical performance or learning evidence. No cloud/provider or hardware qualification is established by this comparison.
