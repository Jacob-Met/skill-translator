# Choose a fresh drill from individual retained-photo findings

In the finite photo-calibration reading investigation, **Choose a fresh drill from individual photo findings** shows every fixed common mark separately. An aggregate decrease can coexist with an individual mark outside its original tolerance; neither the aggregate nor the original point result substitutes for that mark's complete-region finding.

For each selected round, a mark is labeled entirely within or entirely outside only when every named reading has that corresponding maintained annotation-region status. Otherwise a common tolerance conclusion is not established. Each distinct reading appears once in its disclosure even when it occurs in multiple matrix pairs. Repetition is not another observation or vote. Missing marks are explicitly listed with no photo finding and cannot be selected through this evidence-specific path.

No mark is automatically selected. Choose one or more common marks and use **Open fresh practice for selected marks**. This calls the existing `focusedPractice` path: original source, landmark rules, physical dimensions and tolerances remain intact; new attempts and history are empty and goals start hidden. Earlier photos remain evidence in the retained investigation and never count as fresh performance. The selection does not establish that the drill will improve skill, explain a cause, or change any existing practice verdict.

## Portable source and choices

**Save photo findings and explicit selection** downloads `photo-focus.json`, retaining the admitted finite-reading investigation and selected mark IDs. Reopen it through the page's main file input even in a fresh page, or through the focus panel's own file control. All underlying original references, calibration readings, region geometry and per-mark findings are re-admitted/recomputed; derived labels are not trusted. Files are limited to6MB. Missing, duplicate or unknown selected marks refuse; opening a fresh drill requires at least one explicit selection.

A changed accepted investigation resets the selection. An unaccepted corner draft hides the findings and disables focus actions; discarding it restores the accepted evidence and deliberate choice. New explicit selection supersedes delayed source-file reads. Failed import preserves the accepted findings. Saving the parent finite-reading file alone still saves that investigation; use the focus-specific save to retain the explicit drill selection too.

## Authored control and receiving

The authored two-mark control has errors `[8,1]` mm earlier and `[1,4]` mm later, with0.1px horizontal annotation regions and original/±0.2px later corner readings. All three named reading pairs establish aggregate decrease. Mark A is entirely outside then entirely within tolerance; mark B is entirely within then entirely outside under every named reading. Explicitly choosing B reaches maintained fresh practice with the unchanged B rule and no earlier attempts.

```sh
node test/photo-focus.test.mjs
PUPPETEER_PATH=/existing/puppeteer CHROME_BINARY=/actual/sandbox-capable/chrome \
QA_OUTPUT=/fresh/receipt-directory node tools/browser-photo-focus.mjs
```

Native controls also cover distinct-reading accounting, wide-region unresolved findings, missing-photo mark refusal, source tamper and portable replay. The actual browser receiver uses trusted keyboard selection, actual download/native reopen, delayed source read superseded by selection, draft/discard,390px layout, and the real focused-practice consumer with original source and empty-session downloads. Run it separately; native success does not establish browser success.
