# Partial cue acquisition within a question budget

When two questions are needed to distinguish four declared decisions but only
one observation is available, the complete-plan inspector cannot offer a
complete distinction. The partial-budget inspector can still show a first
question that guarantees at most two remaining labels over the retained table.
It shows the compatible original example indexes for every answer branch.

This first consumer is a local CLI over the maintained cue-study declarations:

```sh
node tools/inspect-cue-budget.mjs cue-study.json 1 > budget-report.json
node tools/inspect-cue-budget.mjs budget-report.json > reopened-report.json
node tools/inspect-cue-budget.mjs budget-report.json 2 cue-study.json
node tools/inspect-cue-budget.mjs budget-report.json --read cue0 observed-category > continued-report.json
```

The input may be a source-only cue study or the existing cue-bundle download.
The CLI analyzes validated demonstration metadata, cue categories and declared
decisions; it does not decode or authenticate the bundle's PNG bytes. Keep the
original complete bundle for visual inspection in the maintained browser.
The report retains a source-only input plan, never copies derived findings back
into observations, and recomputes findings on reopen. The optional third
argument checks the entire normalized source study against the retained plan;
changed frames, accounts, cue definitions or decisions refuse. A new budget
changes the plan's declared resource limit without changing its readings.
After actually inspecting a category, `--read` retains it and subtracts one
question from the remaining budget. Duplicate or unavailable cue identifiers,
empty categories and an exhausted budget refuse without emitting a result.
A novel category can leave no compatible examples; this stays outside evidence.
Use a new output filename to keep the earlier accepted plan. This record does
not authenticate when or how an observation was made.

## Meaning and limits

Budget is 0–8 remaining categorical questions. Each question costs one unit;
this is explicitly a unit-cost baseline, separate from the availability/effort
planner owned in issue #257. It is not an estimate of physical effort or time.

The optimizer minimizes the maximum number of distinct declared decision labels
remaining after the allowed questions, then minimizes worst-case questions
used. It may stop early. Questions without a guaranteed improvement are not
chosen merely to spend the budget. A tie retains all best first choices and
each first-choice report includes answer branches and their possible next cues.
Branch continuations satisfy the parent's guaranteed label bound. They do not
spend extra questions reducing an easy branch below the bound fixed by a harder
branch. Thus an unchanged worst-label result cannot require more questions just
because the supplied budget increased.

Unknown cue categories remain compatible with every applicable answer branch,
including an unrecorded category, through the unchanged maintained question
inspector. Unknown *decision labels* refuse a bounded label-count result;
outside-evidence readings remain outside evidence. Neither is zero ambiguity.
One remaining label means agreement among these supplied examples, not a
prediction, physical-action recommendation, causal rule or learning result.

The calculation explores at most eight cues over at most six original examples.
Memoization keys retain the compatible examples, previously asked cues and
remaining budget. No probabilities, average-case gain, answer likelihood,
physical measurements or provider qualification are inferred.

## Verification

`node --test test/cue-budget.test.mjs test/cue-questions.test.mjs` compares the
optimizer with an independent exhaustive policy-frontier enumerator on 90 seeded tables
with held-back categorical arrangements and every budget from zero to three.
It also checks unknown compatibility, changed declarations, refusal, stopping,
budget monotonicity and unchanged original input. Independent review exposed a
six-example plateau where branch-local tie breaking used two questions even
though one already guaranteed the same three-label bound. Threshold-conditioned
reconstruction fixes it, and the explicit counterexample remains tested.
These are authored software
controls, not a learner study. CLI tests exercise actual file output/reopen,
forged derived results and mismatched-source refusal.

## Declared effort and unavailable cues

The CLI also receives the maintained `skill-translator.cue-bundle/v2` download
from the cue-combination workspace, including its
`skill-translator.cue-question-plan/v1` declaration. It delegates all availability,
integer effort (1–1000), identity and basis admission to the maintained question
planner. No parallel declaration schema or inferred ability model is introduced.

For this input, the budget is remaining declared effort (0–8000). The saved
source-only partial plan uses `skill-translator.cue-budget/v2`, retaining the exact
normalized question plan. The output distinguishes `worstEffort` for the partial
policy from `completePlanEffort` for complete discrimination. An unavailable cue
is never a new question; previously retained readings remain evidence. `--read`
charges that cue's declared effort and refuses unavailable or unaffordable new
readings. A source v1 bundle carrying cost assumptions, an unsupported future
version, or a v2 plan missing its conditions is refused instead of silently
becoming unit cost. Passing a matching v2 source bundle also checks its exact
normalized effort/availability declarations.

For two binary cues costing2 and3, budget4 can guarantee at most two labels
using effort2 even though the complete plan requires5. After the first supplied
reading costs2, the remaining budget2 cannot afford the other cue; the report
preserves two possible labels and proposes no unaffordable question. Explicitly
raising the budget can allow further investigation without rewriting readings.

Reconstruction examines attainable sums of the remaining cue efforts, at most
256 values for eight cues. It does not loop over every numeric budget value.
Threshold-conditioned reconstruction preserves the parent's ambiguity guarantee
when choosing a branch continuation, including weighted plateau cases.

`node test/cue-budget-effort.test.mjs` adds350 independent weighted policy-frontier
comparisons, unavailable/changed-cost controls, unit-cost parity, maximum-cost
sparse-threshold checks, portable v2 replay and actual CLI continuation/refusals.
These remain authored software evidence, not measurements of human effort or
physical skill. The CLI continues to analyze source metadata; original PNG
admission belongs to the browser's existing complete-bundle reader.
