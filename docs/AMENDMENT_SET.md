# Carry selected corrections across original examples

Open the original demonstrated-account comparison, its question, and the retained
reply comparison. Under **Carry selected corrections across examples**, explicitly
choose at least two proposed amendments or withdrawals for distinct examples.
Competing replies for the same example cannot be combined. An explanation-only
reply does not authorize any source change and cannot be selected.

**Inspect selected amendments** shows original and proposed account text with each
declared author. Every original alternative remains in the reply comparison; no
answer is automatically preferred. A withdrawal produces not supplied—unknown,
not observed absence. The resulting comparison starts with its global relationship
unresolved rather than inheriting a judgment about the old accounts.

**Save amendment selection** retains the complete original reply account and
explicit selected indices. Reopen it after the same original source comparison,
question and reply comparison. Derived fields recompute; changed source or replies,
duplicate selections and competing same-example proposals refuse. The selection
file is bounded at 1 MiB. Pending old reads cannot replace newer selections.

**Download separately revised comparison** uses the maintained complete comparison
writer. It retains all original PNGs, changes only the selected fields through the
maintained author-reply mechanism, and preserves all unselected examples. Keep the
original files and selection alongside this separately revised bundle. No source
is replaced automatically, authorship authenticated, combined truth established,
or physical skill/learning effect inferred.

Native controls: `node test/amendment-set.test.mjs`. Actual browser course:
`PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-amendment-set.mjs`.
