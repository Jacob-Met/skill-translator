# Unit-count budget plans with original demonstrations

The maintained cue-study page can open a source-only budget plan from `tools/inspect-cue-budget.mjs` against the complete original demonstration study already on screen. This is a consumer of `src/cue-budget.mjs`: it does not introduce another planning algorithm or alter the CLI contract.

## Use

Open a complete cue study containing its original PNG frames. Choose **Compare within a unit-count question budget**, declare 0–8 remaining categorical questions, and compare. The result reports the worst number of retained decision labels left within that budget, the maximum questions used for that bound, and the source rows compatible with each answer. Supply only categories actually inspected. A valid newly retained reading consumes one question through the maintained `recordCueBudgetReading` reducer; invalid readings consume none. Explicitly revising the remaining budget is a new assumption, not inferred learning progress. Clearing supplied readings does not replenish it.

Unit-count mode assumes every unread cue is available and costs one question. Declared availability and relative effort remain a separate, mutually exclusive mode. Switching requires turning the active mode off first. These guarantees concern authored categorical reference rows, not physical action correctness or learner competence.

## CLI and source-only interchange

The **Open a source-only budget plan against these originals** control accepts either the maintained `skill-translator.cue-budget/v1` plan or the CLI's `{input, report}` envelope. Only `input` is admitted; saved derived reports are ignored and recomputed. The original demonstration metadata, cue declarations, and decision rows must match the accepted complete study. A mismatched plan leaves accepted originals, readings, and budget intact. The same final page also accepts weighted `skill-translator.cue-budget/v2` plans in the distinct declared-effort mode; an active effort profile must match before source-only intake. See [declared-effort budget use](CUE_EFFORT_BUDGET_CONSUMER.md).

**Save source-only budget plan** emits exactly the maintained plan format, suitable for the CLI. It contains source metadata, explicit readings, and the remaining budget, but no original PNG bytes. Opening it therefore requires the matching complete study already loaded.

## Complete interchange

The ordinary **Save** control in unit-count mode emits:

```json
{
  "format": "skill-translator.cue-bundle/v3",
  "budgetPlan": {"format": "skill-translator.cue-budget/v1", "study": {}, "readings": [], "budget": 0},
  "comparison": {}
}
```

The abbreviated objects above stand for the full admitted cue study and the complete original-PNG comparison bundle. `budgetPlan` is the sole source of study/readings/budget: conflicting top-level study, question readings, or effort plans are refused. Older v1/v2 bundles remain supported for equal-count and declared-effort modes. A v3 bundle requires a unit-count v1 budget plan and can reopen in a fresh browser to recompute the result without any saved derived report. A weighted v2 plan requires the separate complete v4 envelope; putting it inside v3 is refused, preserving declared units and costs.

All original bytes undergo the existing comparison import verification. Unsupported reading conjunctions remain available through the existing original-row explanation. Neither budget exhaustion nor an unsupported combination silently deletes evidence.

## Pending work and receiving

A pending source-only plan blocks exports. Source work, budget drafts, mode changes, or other accepted edits retire delayed plan imports. Complete export snapshots the inputs before generating original-PNG bytes and refuses if the accepted revision changes. A blank budget is refused rather than interpreted as zero.

`tools/browser-cue-budget-consumer.mjs` exercises the maintained CLI, original PNG import, mode exclusivity, source-only download, complete v3 download and fresh 390px keyboard replay, source mismatch, invalid/valid reading costs, exhausted budget, unsupported additional evidence, and delayed import/export retirement. It also retains the unsupported-reading receiving course. Run on a qualified sandboxed browser with `PUPPETEER_PATH`, `CHROME_BINARY`, and a fresh `QA_OUTPUT`; browser execution receipts are separate from syntax checks and authored controls. No physical or hosted-model proof is implied.
