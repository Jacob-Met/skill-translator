# Ordered tool approaches

Save the current study from **Tool adaptation**, follow **Compare approaches for an explicitly ordered task**, then open that saved file. The comparison retains the complete source, target workpiece and tool declarations. Move marks Up/Down to explicitly declare their intended order; the source list is a default, not a measured sequence. Choose an edge for each mark and compare.

The maintained `analyzeToolAccess` remains the only geometry admission. A dynamic program over four physical edges and at most 30 marks finds the minimum adjacent edge changes without reordering or relocating marks. Initial setup has no cost. Forward/backward costs expose every edge occurring in at least one globally optimal assignment. These sets are not independently combinable; a coherent complete witness is shown separately. Exact integer path counts are exported to the view as decimal strings. A user assignment is compared only when each selected approach is compatible.

The selected-step schematic uses the maintained target coordinates and approach margins. It displays the coherent witness strip, physical edge labels, the selected unchanged target and the preceding-edge comparison. It depicts nominal support/depth, not movement or clamp clearance. Editing clears this diagram along with the results.

No available complete assignment produces an explicit no-complete result. Editing the order or selected edges clears findings and disables saving until recomputation. Raw JSON saves the source/tool study, order and selected edges, without derived verdicts. Reopening revalidates and recomputes. Invalid replacement files retain accepted work. Original task targets and positional practice scoring remain unchanged.

The existing nominal strip model uses depth/side margins and its stated numerical roundoff convention. This addition does not include the unmerged exclusion/contact-patch work. It does not model time, travel, clamps, reach, forces, collision, safety, expertise or learning. Fewer declared changes are not a recommendation for physical operation.

## Verification

`node --test --test-isolation=none test/ordered-tool-access.test.mjs` checks exact ties, 120 independently exhaustive small assignment cases, changed order/tool, no-cover, incorrect chosen edges, source-reference refusal and raw result recomputation. `node tools/browser-ordered-tool-access.mjs` uses an installed sandbox-capable Chrome and Playwright (`CHROME_BINARY`, `PLAYWRIGHT_PATH`, `QA_OUTPUT`) for actual producer download, input changes, order changes, save/reopen, invalid replacement, unavailable edges, keyboard and 390px receiving. Passing counts must be recorded only after execution; authored controls do not establish physical benefit.
