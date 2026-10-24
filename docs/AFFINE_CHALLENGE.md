# A separate-workpiece challenge for one frozen affine family

This consumer receives an exported Workpiece Response study. It preserves its original source annotation, selected mark, training observations and finite coefficient domain, then lets the author declare1–6 new workpiece sizes. Source and training sizes cannot be reused as challenge sizes. Freezing requires an explicit declaration that challenge outcomes have not been used to choose the plan. The declaration is user-reported; the saved JSON is not a signed acquisition record or a trusted timestamp.

Save the frozen plan before obtaining separate results. Each result names its observation source and authored/reported evidence class, supplies x/y coordinates and separate coordinate-wise discrepancy bounds, and is bound to exactly one planned size. Results do not alter the source or training model. Replacing a reading retains only its replacement in the current account; export earlier versions if their history matters.

## Why individual agreement is insufficient

Consider a fixed source x coordinate20mm at source width100mm. A new width110mm and observed x30mm requires a width response coefficient1. Another width120mm with observed x30mm instead requires coefficient0.5. Each result separately lies within a broad coefficient family, but there is no single coefficient satisfying both exact readings.

The consumer therefore reports:

- The original frozen target ranges, always computed from training alone.
- Individual compatibility: whether training plus that result admits a model.
- Common-family compatibility through each row in frozen plan order: whether training plus every received result up to that row admits one model.
- Missing results as untested, without concealing a contradiction from available results.

It reuses the maintained response-family analyzer and exact half-plane dependency. There is no second fitting algorithm. The order of receipt does not change the evaluation order or final intersection. The first empty prefix identifies an order-dependent witness; it does not prove that the last observation alone is wrong. A contradiction is evidence against the declared source-conditioned family and coordinate bounds, not against all possible geometric or physical relationships.

A complete compatible account retains at least one common model; it does not establish physical necessity, calibration accuracy or skill transfer. Bounds are supplied assumptions. Their timing and quality are not verified. Missing results, widened bounds, an uninformative plan or an overly broad coefficient domain can all limit what compatibility teaches.

## Local receiving and replay

Open a response study to draft a plan, or reopen a full challenge to recompute its results. Validation occurs before accepted state is replaced. Frozen source and result-size mismatches refuse. Derived conclusions in saved files are ignored. Draft edits and accepted actions supersede delayed file reads. No data is uploaded.

Starting a new plan from the same training clears the challenge outcomes and requires another prospective declaration. This creates a separate account; it does not retroactively change the old frozen plan. Selecting a plan after inspecting results is exploratory even if a checkbox is later set.

Native receiving is `node test/affine-challenge.test.mjs`; real browser receiving is `node tools/browser-affine-challenge.mjs` with the maintained optional Puppeteer/Chrome environment. The course downloads a frozen plan before results, receives the individual-pass/joint-fail control, downloads and reopens results, rejects wrong-size imports, receives a revised reading, and opens a fresh390px keyboard flow. Script existence is not proof of execution. All included controls are authored analytic examples, not physical demonstrations.

## Received composition — 2026-10-24

Current main2f870a12 (including task readiness) plus this change passed294 native tests and10 actual sandboxed Chrome receiving groups. Source/result binding and the analytic individual-pass/joint-fail behavior were independently reviewed. Desktop,390px frozen-result cards and new-plan views were inspected. The narrow view retains every verdict beside its label without horizontal table scrolling. [Exact source, commands and limits](receipts/affine-challenge-20261024/verification.json) and [browser receipt](receipts/affine-challenge-20261024/browser.json) retain the evidence and intermediate receiver correction.
