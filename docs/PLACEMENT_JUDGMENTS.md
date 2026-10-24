# Judge a placement before feedback

In **Changing sheets**, place every task mark, then optionally predict whether every mark is within its declared tolerance. Choose **I am uncertain** when appropriate. Supply a reason if useful, then record the first judgment. This freezes those exact placements until commitment, so the later comparison concerns the layout that was judged. You can still request targets; requests before and after judgment remain separate in the original action history. Commit to reveal the ordinary maintained score and whether the prediction agrees with it.

An adequate prediction means every mark is within tolerance. An inadequate prediction means at least one is outside. Uncertainty receives no agreement score. Missing predictions are not uncertainty, incorrect predictions, or evidence of competence. Incomplete placements cannot receive a complete-layout judgment, but ordinary partial rehearsal commitment remains available.

The judgment does not automatically score a learner's explanation. These are authored planar criteria applied to diagram placements. Agreement does not establish physical success, independent work, mastery, a calibrated confidence probability, or a learning effect. Target requests are recorded interface actions; outside assistance is unknown. Local files can be edited and do not authenticate chronology.

## Keep or reopen the complete account

**Export complete judgment study** retains the complete original rehearsal and each first prediction's action boundary and reason. **Reopen a rehearsal or judgment study** accepts either the complete study or a plain original rehearsal. A plain rehearsal begins with no judgments. **Export rehearsal only · omits judgments** deliberately exports only the original rehearsal for existing consumers. The complete study is a separate `skill-translator.rehearsal-judgment/v1` format, with no changes to the original rehearsal format or reducer.

The receiver replays the original action prefix for every prediction. It refuses incomplete or already committed predictions, repeated judgments, reordered boundaries, and placement changes between judgment and commitment. Derived trial indices, assistance counts, geometric scores, and agreement are recomputed; saved verdicts are ignored. The complete compact account is bounded at 1200 KiB, including the original rehearsal's existing 1 MiB bound. Invalid replacement files retain accepted work, and a superseded file read cannot replace a newer plan or edit.

## Verification

`node test/rehearsal-judgment.test.mjs` exercises correct and mistaken predictions, uncertainty and missing predictions, frozen placement and prefix/source custody, separate before/after assistance, multiple workpieces, exact reopening and malformed input refusal. It compares original scores directly with the maintained reducer.

`PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/path/to/receipts node tools/browser-rehearsal-judgment.mjs` exercises the actual page with an authored one-mark task, including keyboard freeze, commit/reveal, target-help history, compact download/reopen, invalid and late input refusal, and desktop/390px captures. Actual receiving results must be recorded separately; the script's presence is not a claim it ran.
