# Withdraw an invalid reading without erasing its history

From the corrected-reading workflow, follow **Withdraw an invalid reading while retaining its history**. Load an original v1/v2 cue bundle or a saved withdrawal inquiry. Select the active reading, enter an explicit withdrawal reason and choose Withdraw selected reading. Inspect the remaining active readings and save the original inputs.

A withdrawal refers to the reading’s current revision. The original record, any transcript corrections and the withdrawal reason remain in event order. The withdrawn reading no longer contributes a mismatch position. It cannot subsequently be corrected or reused; a genuinely new inspection requires a new reading identity. Save/reopen recomputes from the retained source and event history, rather than accepting saved conclusions.

This is an explicit exclusion decision. It does not validate the remaining readings or establish category truth. The one declared total mismatch bound applies to active readings. Original source PNGs and provenance remain retained. Empty active evidence returns all source-compatible retained alternatives; it is not a newly confirmed decision.

Bounds: at most 90 events and 30 total introduced reading identities, including withdrawn identities. Withdrawal does not recycle that limit. Existing original v1/v2 admission and categorical budget limits remain unchanged.

## Receiving

Run the independent deletion-mask course and targeted refusal controls from the repository root:

```sh
node --test test/cue-reading-withdrawals.test.mjs test/cue-reading-withdrawal-refusals.test.mjs
BROWSER_HELPER="$EARTH_BROWSER_HELPER" CHROME_BINARY="$CHROME_BINARY" QA_OUTPUT="$WITHDRAWAL_OUTPUT" SOURCE_BUNDLE="$ORIGINAL_CUE_BUNDLE" node tools/browser-reading-withdrawals.mjs
```

Use the maintained browser helper and ordinary sandbox-enabled Chrome. The authored original-PNG control is test/fixtures/repeated-cue-study.json; it is a software control, not evidence of physical reliability. The browser course follows the visible entry, saves actual inputs, reopens at 390px, refuses a forged revision atomically, and records a distinct new reading after withdrawal.
