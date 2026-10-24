# Reason about the next demonstrated step

The task-readiness consumer turns an expert's declared prerequisites into an
inspectable reasoning exercise over a retained demonstration. It does not infer
the dependency graph from video. A step's timestamp order is not proof that one
step physically requires another.

Open a demonstration bundle from the existing sequence studio. The original
frame admission and image hash verification are reused. Inspect each step's
before/after frames and authored intent, select prerequisite steps, and write an
observable completion check with its expert rationale. Freeze the declarations
to begin an empty journal. Cyclic declarations are refused.

Read the observation ledger and choose a demonstrated step. Commit a judgment
that its prerequisites are satisfied, are not established, or remain uncertain,
with your reasoning. The resulting explanation identifies the exact uncompleted
prerequisites and exposes their retained after frames beside the chosen step's
before/after evidence. The comparison is with the declared dependency model, not
an automatic grade of physical judgment.

Report each check as pass, fail or unknown, with an observation note and explicit
authored-example or reported-observation classification. A step has reported
completion only when every declared prerequisite has reported completion and all
its own checks have passing observations. An observation can be recorded while a
step is blocked; it does not override the missing prerequisites.

Changing an upstream observation clears the current observation credit of every
dependent step, transitively. This includes a pass-to-pass revision: new evidence
about an earlier state does not establish that later outcomes stayed unchanged.
Independent branches retain their observations. The original journal entries and
earlier judgments remain intact, so the learner can inspect what was known when
they made a choice and which later revision required reassessment.

Saving retains the complete demonstration bundle, frozen declarations, and raw
events. Reopening verifies source images through the maintained sequence reader,
validates source equality and reconstructs readiness and invalidations. Saved
derived verdicts are never trusted. Rejected imports preserve accepted work;
editing or a newer import supersedes an outstanding read.

## Deliberate limits

This exercise teaches inspection of declared dependencies and reported evidence.
It does not establish causal necessity, actual physical completion, safe actions,
independent measurement or skill acquisition. A report's evidence classification
and rationale are declarations. Source-frame pixels illustrate the original
demonstration; they do not photograph the learner's newly reported outcome.

The first consumer supports one authored check per step; the replay format allows
up to eight checks per step for imported studies. A graph is bounded by the
maintained demonstration's 24 steps, and a journal retains at most 500 events.
Changing frozen declarations requires a fresh study; old attempts are not
regraded under revised criteria.

## Receiving

Native controls: `node --test test/task-readiness.test.mjs`. The controls exercise
changed next-step judgments, branching and transitive invalidation, unknown and
failed observations, blocked-step observations, exact replay, cycle refusal and
source mismatch. A passing native test does not stand in for browser receiving or
a learning study. Browser evidence must be recorded separately after execution.
