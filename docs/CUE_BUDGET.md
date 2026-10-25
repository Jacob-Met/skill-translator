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
