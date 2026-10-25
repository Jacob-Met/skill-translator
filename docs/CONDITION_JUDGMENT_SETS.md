# Compare explicit sets of retained unjudged rounds

Open `/condition-judgment-sets` from the complete-family receiver. Import the original outcome study or a saved set-comparison account. Select one to six retained unjudged rounds, supply a name, and explicitly add a set. Compare up to eight distinct sets. The receiver never searches for or selects a recommended set and never adopts a hypothetical outcome as evidence.

For each declared set, the receiver enumerates every acceptable/unacceptable assignment to its members, preserving every uncontradicted conjunction from the maintained condition-family evaluator. It reports the largest remaining family and the number of branches that contradict the entire current family. Counts describe alternatives, not probabilities, equal acquisition costs or measured teaching benefit. A pair of rounds may distinguish more than either singleton; repeated condition evidence may add no distinction.

Select a named set, then explicitly select one complete hypothetical branch. The branch shows the supplied-if judgments, survivors and eliminated count. Select an original conjunction to inspect its retained condition statuses, original outcome judgments and bases. An unresolved geometric prediction survives either hypothetical label. Unknown training evidence stays in the family. Without opposing known training judgments the result remains insufficient-contrast. An empty initial family remains no-compatible-conjunction; zero survivors are not presented as successful discrimination. An empty hypothetical branch means those judgments contradict the current conjunction family, not that the physical outcomes are impossible.

## Mechanism and bounds

The implementation imports `inspectUnjudgedFamily` directly. For each conjunction and selected set, it constructs two bit masks: positions with a known prediction, and positions that hold. A hypothetical acceptable bit vector survives exactly when its known positions equal the holds mask. Unknown positions impose no requirement. This is the intersection of maintained per-round survivor sets, including redundant conjunctions and unresolved training hypotheses. No minimal-only reduction, cue set-cover algorithm or affine workpiece planner is substituted.

An account permits one to eight named sets with one to six distinct retained unjudged safe-integer round identifiers each. Equivalent sets, duplicate IDs, sparse arrays, already judged rounds, absent rounds and oversized names refuse. Identifiers and labels remain source declarations; labels render as plain text. Round IDs are canonicalized to increasing order and each branch states its exact associated judgments.

The complete capacity is8191 conjunctions and512 branches across eight six-round sets. Branch counts and compact per-conjunction prediction patterns are retained; lists of surviving masks are produced only for the explicitly inspected branch. This avoids retaining up to4,193,792 survivor entries. A local Node24 authored capacity run completed in about92ms and serialized the derived result to4.63MB. Timing is environment-specific. A dedicated module worker keeps the calculation off the interaction thread. Edits terminate pending workers and fence callbacks; worker absence or failure yields an unavailable comparison, never an invented result. The receiver renders selected witnesses rather than a full Cartesian product of branches and conjunctions.

## Original evidence and replay

`skill-translator.condition-judgment-sets/v1` contains `original` (the maintained normalized outcome study) and `sets` (each with `id`, `label`, `rounds`). All findings are recomputed; supplied extra derived claims are discarded. Raw files above4MiB refuse before parsing, and the maintained original study's3MiB admission remains active.

Save source-only comparison account retains these declarations without any hypothetical branch or derived finding. Save unchanged original study emits the original outcome-study format with every original judgment unchanged. Import refusal preserves the accepted source and declarations. Checkbox/name/remove edits clear derived results; later edits fence delayed file reads. Set and branch changes clear the previous witness. A fully judged source shows no selectable unjudged rounds.

## Verification

`node test/condition-judgment-sets.test.mjs` runs seven native groups: complementarity/repeated evidence/missing geometry;144 independent full outcome-evaluator branch recomputations; maintained singleton parity; insufficient contrast and empty-family distinction; source-only round trip; malformed/bounded admission; and full8191-family512-branch capacity. Run `node test/condition-family.test.mjs` for the six maintained groups.

The authored actual browser course is `tools/browser-condition-judgment-sets.mjs`. It covers nine groups including actual worker comparisons, explicit branch choice, source witnesses, genuine account/original download and reopen,390px controls, authoring/duplicate refusal, unknown and empty cases, invalid import preservation, delayed reads and worker cancellation/refusal. It requires sandboxed Chrome and a fresh QA_OUTPUT. Authored course presence is not a claim it ran; actual execution, screenshots and independent review are recorded separately.

These are authored software controls. Physical skill, causal necessity, acquisition quality, or teaching benefit has not been established.
