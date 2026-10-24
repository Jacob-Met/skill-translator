# Reason about the next demonstrated step

The task-readiness consumer turns an expert's declared prerequisites into an
inspectable reasoning exercise over a retained demonstration. It does not infer
the dependency graph from video. A step's timestamp order is not proof that one
step physically requires another.

Start in **Rehearse prerequisites**, the maintained prerequisite authoring and
ordering consumer. Save its rehearsal bundle, then open that file here. The
existing prerequisite validator receives its complete normalized source,
dependencies, reasons and optional first ordering attempt. Exact retained PNG
bytes are checked by the maintained sequence reader.

Dependencies remain read-only here. Inspect each step's retained before/after
frames, authored intent and prerequisite reasons, then add an observable
completion check with its rationale. Freeze these checks to begin an empty
observation journal. An upstream ordering attempt is preserved unchanged and is
never treated as a report that any physical completion check passed. Dependency
edits belong to the maintained prerequisite page and require a fresh study here;
completion-check definitions cannot override them.

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
validates the upstream prerequisite record and source equality and reconstructs readiness and invalidations. Saved
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
Within this interface, changing frozen declarations requires a fresh study; old attempts are not regraded under revised criteria. These local JSON records are not authenticated histories: manually changing both a record and its corresponding source can create a different study.

## Receiving

Native controls: `node --test test/task-readiness.test.mjs`. The controls exercise
changed next-step judgments, branching and transitive invalidation, unknown and
failed observations, blocked-step observations, exact replay, cycle refusal and
source mismatch. A passing native test does not stand in for browser receiving or
a learning study. Browser evidence must be recorded separately after execution.


The actual browser course is `node tools/browser-task-readiness.mjs`, with
`PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT` pointing to the existing local
installations and desired receiving directory. Use the direct installed Chrome
binary when it supports normal sandboxing. The course does not disable the
sandbox itself; receipts record the launched executable and sandbox-related
arguments so a wrapper's behavior stays inspectable.

A successful run retains `source-sha256.json` for the complete static module
closure used by this course, actual Node/browser versions, source and artifact
hashes, desktop/mobile images with the revealed source frames, the exact authored
prerequisite-format input bundle, and the actually exported study that was
reopened on desktop and a fresh mobile page. Source hashes are checked again at
the end to refuse a mixed-source receipt. The PNG controls are original authored
images; the upstream-format input uses the maintained prerequisite validator,
not a recording of clicks in the upstream authoring UI. These receipts do not
establish physical execution, learning, or provider qualification.

## Inspect the evidence behind a blocked step

After committing a readiness judgment, **Which evidence is still missing?** now
follows the unresolved prerequisite ancestry. It shows the earliest checks whose
reports are absent, explicitly unknown or reported unsatisfied. A prerequisite
shared by two branches appears once; the disclosure retains every dependency
reason that connects the selected step to those requests. This is a compact
representation of the declared graph, not a list of all possible paths.

Each request retains the check rationale, exact latest report and journal event,
and its original before/after source frames. These frames illustrate the expert's
account; they do not authenticate the learner's report. Reporting a previously
missing upstream check can expose separate checks farther along each branch.
Revising an upstream report clears downstream completion credit through the
existing journal, and the previous explanation disappears until another judgment
is committed. A ready prerequisite set does not establish the chosen step's own
completion.

The explanation uses the maintained prerequisite declaration and raw readiness
replay. It adds no authoring format, order score, implicit source correspondence,
physical action recommendation or inference that a reported failure is true.
Source/check/report exports remain unchanged and reopening recomputes the view.

Native course: `node test/readiness-explanation.test.mjs`. Actual browser course:
`node tools/browser-readiness-explanation.mjs`, with the same existing
`PUPPETEER_PATH`, direct `CHROME_BINARY` and separate `QA_OUTPUT` convention.
The new course retains its own exact input/reopened study, runtime/source hashes
and screenshots; it does not overwrite the original task-readiness receipt.
