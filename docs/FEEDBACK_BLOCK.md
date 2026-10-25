# Commit a fresh block before reviewing outcomes

The ordinary changing-sheets rehearsal now links to **Commit the block, then review**. This is a separate fresh course with a fixed feedback policy. It uses the maintained rehearsal and first-judgment reducers, source admission, placement rules and scores; it does not introduce another scoring engine or alter the ordinary immediate-feedback course.

Choose the source and two to eight distinct workpiece sizes before beginning. Place the task marks and optionally record the existing first adequate/inadequate/uncertain judgment. Recording a judgment freezes those placements until commitment. Committing freezes the sheet, including any missing marks, and allows continuation to the next size. It does not expose target coordinates, target circles, geometric scores, errors or judgment agreement.

Current-sheet target help remains available before commitment. Requesting it performs the maintained reveal action and retains the exact prior placements and assistance history. The block does not claim that a helped sheet was independent. Source meanings, source files and outside assistance are not controlled.

After every planned sheet is committed, **Review the complete committed block** becomes available. This explicit final action is retained at the exact end of the original rehearsal action stream. The review exposes the original scorer's results for all sheets, missing placements and the existing judgment comparisons. The review-only sheet selector lets you inspect each earlier sheet’s original placements, targets and first judgment at its own dimensions without changing the event stream. Earlier review, a backdated boundary, duplicate review and further mutation through the reviewed-course operations refuse. Completing the final sheet alone does not reveal results.

## Preserve the course and its boundary

**Save complete feedback block** retains the original source, workpiece plan, every maintained rehearsal action, first judgments, fixed policy and absent or final review action. Reopening a partial or complete unreviewed block keeps its results withheld; reopening a reviewed block recomputes its original outcomes and restores the final boundary. Invalid input preserves accepted work, and a newer draft fences a delayed import.

Ordinary rehearsal files cannot be opened as deferred courses. Starting this course always creates a fresh empty rehearsal; an existing reviewed record cannot be retrospectively relabeled as unseen. **Export standard rehearsal · ordinary consumers reveal committed scores** is an explicit interoperability action. Its output is the unchanged maintained rehearsal record, and opening it in ordinary consumers reveals committed results. It omits the block policy and first-judgment wrapper by design.

This is an application feedback policy, not a security, proctoring or authentication boundary. The raw source permits independent calculation of targets, and local files are editable. No absence of outside assistance, unseen source knowledge, physical skill or educational benefit is established. The implemented behavior supports later investigation of feedback timing without claiming a learning effect.

## Receiving and limits

The maintained 2–8 workpiece plan, 30-mark source and 2,048-action limits remain authoritative. The complete feedback-block file is bounded to 2 MiB, with the nested maintained judgment and rehearsal admission limits preserved. No original action or missing placement is truncated to fit those limits.

Run `node --test --test-isolation=none test/*.test.mjs` for native verification and `node tools/browser-feedback-block.mjs` for actual consumer receiving. The browser script uses `PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT`. It follows the ordinary-course link, makes real placements and first judgments, commits and reopens without feedback, requests real help, uses mirrored keyboard placement, commits a partial final sheet, explicitly reviews, saves and reopens the reviewed record, refuses backdated/reclassified inputs, exercises a delayed import, and opens the disclosed raw export in the ordinary consumer. It also receives a complete 2,048-action, 30-mark record and checks narrow and desktop layouts.

Exact source, independent review and receiving scope are recorded in `docs/receipts/feedback-block-677009-20261024/verification.json`.
