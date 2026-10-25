# Partial observation plans under declared effort

The cue-study browser consumes the maintained weighted policy in `src/cue-budget.mjs`. It uses the existing availability/effort declaration and the owner's create/import/record/inspect API unchanged. No new optimizer or effort schema is introduced.

Open the complete original-PNG cue study, enable declared availability and effort, and supply an explicit basis and integer cost for each cue. Choose **Limit acquisition by remaining declared effort** and declare 0–8000 remaining effort units. Costs are supplied relative assumptions, not inferred time, ability, force, or physical effort measurements. The unit-count budget remains a separate mode.

The result distinguishes the smallest guaranteed worst retained-label count within the budget, the maximum declared effort used for that guarantee, and the effort required for complete discrimination. It shows the currently retained labels if stopping without another observation. Remaining budget is a ceiling, not an instruction to spend it. Unknown decisions and outside-reference readings remain unresolved.

Only available, affordable cues are prospective questions. The maintained reading reducer validates the entire next account before subtracting a cue's declared cost. Invalid or duplicate readings spend nothing. A previously retained reading remains evidence even if its cue is now unavailable; it is not charged again. Explicitly editing the remaining budget or cue declaration changes an assumption and does not establish learning progress.

## Original-source interchange

The maintained CLI accepts the existing complete cue-bundle/v2 declaration and produces a source-only `skill-translator.cue-budget/v2` plan. The browser accepts that plan or its `{input, report}` envelope against the exact loaded original cue study. It ignores saved derived reports. When an effort profile is active, the incoming normalized profile must match it; otherwise admission refuses before changing accepted evidence. To deliberately adopt a different plan, explicitly leave that profile mode first or open the complete bundle carrying its own original study and assumptions.

Source-only export remains exactly the owner's v2 plan, suitable for the maintained CLI. Full browser export uses `skill-translator.cue-bundle/v4` with one authoritative `budgetPlan` and the complete original-PNG `comparison`. The budget plan contains the original study, all readings, remaining budget, and declared effort profile. There is no duplicate top-level study or profile. A v4 envelope requires a weighted v2 plan; the existing complete v3 envelope requires a unit-count v1 plan. Downgrades refuse instead of flattening costs into question counts. Existing v1/v2 study bundles and unit-count v3 replay remain supported.

Original PNG admission follows the maintained comparison reader. No supplied category, availability basis, original frame, or decision row is inferred from the budget result. The retained unsupported-conjunction explanation remains available.

## Receiving

The source-only import generation and complete-export revision guards cover profile edits, availability changes, budget changes, source replacement, and mode changes. A delayed import cannot replace evidence after a newer declaration; a pending import blocks an ambiguous export.

`tools/browser-cue-effort-budget-consumer.mjs` extends the unit-count and unsupported-reading receiving course with actual maintained weighted CLI input. Its authored four-row control uses cue costs2 and3, an unavailable historical cue costing7, and remaining budget4. It expects a two-label bound using effort2 although complete distinction requires5. It checks source/profile custody, valid/invalid spending, unaffordable continuation, explicit budget revision, complete v4 and source-only v2 downloads, fresh narrow keyboard replay, downgrade refusal, and delayed profile edits. Run with the maintained sandboxed Chrome receiving environment, `PUPPETEER_PATH`, `CHROME_BINARY`, and a fresh `QA_OUTPUT`.

Authored software controls and browser receiving do not establish learner benefit, physical action correctness, or hosted-model execution.
