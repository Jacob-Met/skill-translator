# Declared three-mark corner angle

From placement practice, export the original source and session, then open **Inspect a three-mark corner**. Choose a vertex and two arm marks, name the intended relationship, and provide a degree tolerance and its basis. Each retained round can be inspected without changing any original position, tolerance or point score.

The angle turns from the first arm to the second around the vertex. Across/down coordinates make a positive turn clockwise. The reference angle is recomputed from the adapted source geometry at the retained workpiece size; an anisotropic size change can therefore change the reference angle. The comparison uses the shorter signed circular difference in the range −180° inclusive to 180° exclusive. Equivalent representations at the ±180° branch cut compare as zero difference. A half-turn difference is displayed as −180°.

This separates an angular task relationship from point location. With reference points (20,50), (50,50), (50,80) mm and the middle mark as vertex, retained points (20,51), (50,49), (51,80) each have a 1 mm positional error. They pass original 2 mm point tolerances, while their directed angle differs by about 1.9665° and fails a separately declared 1° criterion. A rigid rotation and uniform scaling can preserve the corner angle while failing original point scores. Reflection reverses the directed relationship. Neither angular nor positional assessment overrides the other.

Missing marks produce an incomplete result. A collapsed or numerically indistinguishable arm in either reference or retained geometry leaves the corner unresolved. Arm lengths are displayed but are not constrained by the angle criterion. The length and angular comparison guards are computational conventions rather than physical uncertainty estimates.

The diagram shows the original and retained arms and curved angular measurement arcs. The coordinate table retains every selected point. These are measurements, not proposed correction movements. Saving a complete raw review retains the exact source, original full practice session, selected round and declared angular criterion. Reopening validates source identity and recomputes results; cached findings are ignored. The angular review has a distinct schema, so a millimetre guide review cannot silently be interpreted as a degree criterion.

A criterion can be declared after viewing outcomes. Its supplied basis remains an authored assertion; this tool does not establish contact, fit, causal learning effects, physical accuracy or independent physical skill. It leaves the maintained practice producer and raw session schema unchanged.

## Verification

Run `node --test --test-isolation=none test/*.test.mjs` for native checks and `node tools/browser-corner-angle.mjs` for the actual receiving course. The browser script uses the established `PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT` environment variables. It records bent, rotated/scaled, reflected, collapsed and empty rounds in the maintained practice UI; follows the corner link; checks original and angular findings; saves/reopens the complete original records; and checks source refusal, stale imports, narrow layout and keyboard table access. See `docs/receipts/corner-angle-677009-20261024/verification.json` for exact source and receiving scope.
