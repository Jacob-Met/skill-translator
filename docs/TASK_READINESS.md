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

## Source-bound placement evidence (#80)

When a demonstrated step's after-moment already has calibrated task annotations, the author can explicitly bind its completion check to **all of that task's placement tolerances** at supplied target width/height. The existing moment-task and practice modules own the source/rule/dimension binding and geometric evaluation. This consumer does not add a scorer, infer correspondence, or establish physical task completion.

The learner opens the actual maintained practice page in another tab, enters placements, and exports its ordinary raw session. Back in readiness, importing that session shows each missing mark or positional error against its tolerance, manual versus retained photo-annotation provenance, and the declared target dimensions. Retaining the evidence is a separate action requiring a note. Known out-of-tolerance placements produce `fail`; no known failures but missing marks produce `unknown`; a complete set within tolerance produces `pass`. Previous rounds do not fill gaps in the current round. Hypothetical practice corrections never replace actual retained attempts.

A bound check cannot accept a manually selected result. Photo annotation classes and source identities remain visible; this receiver retains the annotation record but does not independently reattach its image bytes. Manual detachment remains manual. These distinctions are not authentication or measurements of physical mastery. Other physical conditions still require separately declared reported checks.

Studies containing geometric bindings use `skill-translator.task-readiness/v2`. Existing v1 studies retain their original event/replay behavior. New practice events retain normalized raw sessions, not a trusted verdict; every reopening reimports and recomputes with the exact after-state, rules and target dimensions. Revisions use the same downstream credit invalidation as reported observations. Each session is bounded to 1 MB; combined retained practice event input is bounded to 4 MB.

Focused native controls:

```sh
node --test --test-isolation=none test/readiness-practice.test.mjs test/task-readiness.test.mjs test/readiness-explanation.test.mjs
```

Actual receiving course (requires Puppeteer and an admitted Chrome executable):

```sh
CHROME_BINARY=/opt/google/chrome/chrome PUPPETEER_PATH=/path/to/puppeteer QA_OUTPUT=/path/to/receipt node tools/browser-readiness-practice.mjs
```

The course authors original PNG/calibration controls, uses actual practice handoff, form placements and downloads, then imports empty/failed/passing sessions into readiness. It exercises upstream revision, source-dimension refusal, delayed file reads, context draft clearing and fresh desktop/mobile reopen. Runtime/browser identity, the complete 31-file module closure (including actual practice), exported raw sessions, the reopened readiness bundle and screenshots are retained separately from earlier receipts. Native checks are executed locally; actual browser receiving must be recorded before claiming the consumer has passed.

## Rehearse reassessment after revised evidence (#147)

From task readiness, open **Rehearse which evidence needs reassessment after a revision** and load a saved readiness study. The maintained bundle reader verifies the original PNGs; the readiness reducer replays its complete original journal. This separate rehearsal does not change that journal, its declarations, or its observation classifications.

Propose one hypothetical revised observation. Reported checks allow a hypothetical pass, fail or unknown with a reason. Geometric checks require an actual matching raw practice session, admitted by the maintained placement contract; a manually selected pass cannot replace it. The proposed event is explicitly hypothetical even when its input came from a retained observation. It is not evidence that a correction or new observation occurred.

Before revealing the consequences, select the steps whose currently retained downstream observations you expect to lose credit. Retain a reason and optional uncertainty. The first response cannot be replaced. Revealing before a response remains recorded as assistance, including when an unsent draft was already present. Declared prior familiarity is preserved, not authenticated.

The explanation uses a hypothetical append through the maintained readiness reducer. An upstream pass-to-pass revision can clear downstream evidence, while independent branches retain theirs. A descendant with no current observation is not counted as lost evidence. The view identifies omitted and unnecessary selections relative to this declared model and displays the exact original check reports, event indexes, prerequisite reasons and original before/after frame witnesses. The frames illustrate the expert's demonstration; they do not show the proposed revision or establish causal necessity.

Saving produces only `skill-translator.reassessment-bundle/v1`, containing original PNG evidence and a `skill-translator.reassessment-rehearsal/v1` record. That record retains the unchanged original readiness study, proposed event, declared familiarity and at most one prediction plus one reveal. Reopening recomputes all consequences. There is deliberately no ordinary-readiness export of the hypothetical continuation: that would erase its hypothetical status. Starting another rehearsal replaces the displayed rehearsal explicitly; save first to keep a separate copy.

Changing a proposal or prediction draft blocks stale export until the draft is retained in a new rehearsal or first response. A newer edit or import supersedes a delayed bundle/practice read. Rejected source or pixel imports retain accepted work. Existing readiness v1/v2 and geometric practice formats remain unchanged. A full 500-event original journal cannot append another hypothetical event and is refused by the maintained bound.

Native controls: `node --test test/reassessment-rehearsal.test.mjs`. Actual receiving course: `PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/reassessment-qa node tools/browser-reassessment-rehearsal.mjs`. It receives the maintained readiness consumer's real download, predicts through keyboard controls, checks transitive and independent branches, inspects original PNGs, completes and reopens downloads at desktop and 390px, rejects altered accounts/pixels, checks a delayed draft race, and admits geometric raw practice. Receipts report execution separately; these authored controls do not establish physical recovery or learning benefit.

### Executed reassessment receiving

The exact merged baseline `112dfa808217cf7e54fd4b0d036ed50953510ea4` plus this candidate passed **512 native tests** and **all six actual Chrome receiving groups**. The [actual browser receipt](receipts/reassessment-e898/actual-browser.json) retains the 27-file source closure, Chrome 156.0.8078.47 and Node 22.23.4 identities, launch arguments, and zero browser errors or off-site requests. The browser sandbox remained enabled.

Executed groups cover actual upstream readiness download and keyboard prediction with four original frame witnesses; 390px reopening and completed download equality; retained reveal-first draft/assistance; authored-account and PNG mismatch refusal with accepted export preserved; a delayed read that cannot replace a newer proposal; and calibrated v2 raw geometric practice. These are authored controls. They do not establish physical correction effects or learning outcomes.
