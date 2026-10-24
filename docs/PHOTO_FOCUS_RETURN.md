# Linked focused-practice photo return

From **Photo findings → Compare a returned focused-practice photo**, bring a saved focused practice session back to the exact photo-focus selection. `/photo-focus-return` also opens saved photo-focus files or linked return files directly.

The baseline is the original investigation's later photo, including its declared annotation regions and every named finite corner reading. The returned session is admitted against the setup recomputed by maintained `photoFocusedPractice`: identical selected mark definitions, source rules, tolerances and target dimensions. Choose a retained returned photo round and explicitly declare its horizontal and vertical pixel half widths. Every selected mark must have an attached retained photo annotation; missing or manually detached selected marks refuse the complete comparison.

Original baseline round numbers and returned session round numbers are displayed separately. A temporary calculation projection selects the relevant annotation pixels and reuses maintained photo-region bounds; it is never installed or exported as actual practice history. Both original source sessions and full photo observations remain unchanged in the raw envelope. The source reference is recomputed on import and checked against retained image/annotation records. No returned metadata is treated as proof that practice occurred.

The original calibration is always included for each photograph. Up to three named returned-photo corner readings can be added. Each reading supplies one shared calibration for every selected mark; the complete baseline × returned matrix has at most 16 combinations. The inherited mapping guard remains an engineering allowance, not calibrated uncertainty or a physical accuracy guarantee. Exact downstream squared comparisons do not strengthen calibration evidence. Results describe conditional placement differences, never learning, a drill's effectiveness, or a continuous calibration range.

Pair the two actual image files by their retained identity to inspect original corners, selected reading corners, selected annotation points and declared regions. A reused image digest is explicitly identified as reused evidence, not an independent observation. Per-mark tolerance statuses and the exact guarded scenario details remain available alongside the aggregate selected-set result.

**Save linked raw photo evidence** downloads `photo-focus-return.json` using `skill-translator-photo-focus-return/v1`. It retains the original photo focus, returned session, selected returned round, region declaration, finite returned readings and source reference. Reopening recomputes evidence; it does not trust saved derived findings or modify an active practice. Files are limited to 10 MB. Input edits, replacement source reads and close invalidate queued work; failed imports retain the last accepted source. Draft findings cannot be saved.

Native controls:

```
node --test test/photo-focus-return.test.mjs
```

Actual browser receiving (requires Puppeteer and a sandbox-capable Chrome):

```
PUPPETEER_PATH=/absolute/path/to/puppeteer CHROME_BINARY=/absolute/path/to/chrome QA_OUTPUT=/tmp/photo-focus-return-receiving node tools/browser-photo-focus-return.mjs
```

The receiver verifies sandbox admission, trusted keyboard activation, the existing photo-focus entry, actual PNG matching and mismatching, native downloaded-file replay, wide-region unresolved controls, wrong-source and tampered-reference refusal, queued-input and delayed-file/close cancellation, and received external styles at 390 px. This is authored image/software evidence, not physical validation.
