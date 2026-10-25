# Propose supported relationships

Open the maintained `/rule-adoption` workbench with the original source and its
matching observation file. **Propose supported rules for undecided marks** fills
the editable dropdown for each mark with exactly one compatible rule. Existing
manual choices are preserved. Ambiguous, contradictory and untested marks get no
inferred choice; unselected marks retain their original annotation. Review the
target plot and accept the complete setup before opening ordinary fresh practice.

The proposal reuses `analyzeEvidence` through `reviewRuleChoices`. It neither fits
a new model nor changes measurement bounds. The five alternatives remain fraction,
left, right, top and bottom clearance, conditioned on the original calibration.
A unique survivor is a proposal within that family, not observed expert intent or
a physical requirement. It does not remove the current need for source calibration,
point correspondence or supplied observation coordinates.

For each unique proposal, omission sensitivity removes each group of identical
numeric readings and recomputes the maintained evaluator. Group identity uses
width, height, x, y and uncertainty radius for that same mark; renaming copies
cannot manufacture retained support. The original source is never held out.
Different readings can still share a recording, demonstrator, calibration error
or authored construction. This diagnostic is retrospective sensitivity, not
independent validation or a probability. Every group and remaining rule is shown.

Existing decision exports keep the original source, all observations and the
accepted selections. Reopening recomputes support and proposals; no proposal or
omission result is trusted from a file. A newer proposal action retires a pending
older file read. Existing practice begins with empty attempts, preserving earlier
practice under its original rules.

## Verification

`node --test --test-isolation=none test/rule-proposals.test.mjs test/rule-adoption.test.mjs test/evidence.test.mjs`

29 named native cases passed. The new unfamiliar 137×89 source uses observations
at 251×113 and 181×157, then predicts the separately selected 307×193 target:
fixed-left x=23 instead of the original fraction x≈51.54. Changing observations
selects each of the other four rules; unchanged-size, contradictory, untested and
renamed-copy controls retain their limits. These are authored numerical tests.

`node tools/browser-rule-proposals.mjs` uses Playwright from
`CODEX_PRIMARY_RUNTIME_NODE_MODULES`, `CHROME_BINARY` and optional `QA_OUTPUT`.
Seven actual browser groups cover editable proposals, manual-choice preservation,
390px input-only replay, actual maintained practice handoff, changed-input keyboard
selection, delayed-import retirement and contradiction refusal. The initial root
run used the default disabled sandbox; final receiving ran as unprivileged
`nobody` (UID65534) with `chromiumSandbox: true`, writing to a task-specific
`/tmp` output directory. Use that unprivileged route when running from a root
container.
Rendered desktop and narrow views were inspected. No physical learning study,
automatic visual extraction, Nebius workload or competition qualification follows.
