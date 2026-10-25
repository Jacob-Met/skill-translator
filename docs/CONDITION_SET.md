# Inspect a complete declared task-condition set

The placement page links to **Inspect task conditions together**. Export the original source and practice session, open both, and declare up to twelve named conditions. Choose a pair distance or directed separation, a three-mark guide offset, or a directed corner angle. Every condition requires its own tolerance and basis. Linear criteria retain millimetres; angular criteria retain degrees. Existing pair, guide and corner evaluators own their calculations and admission rules.

The receiver evaluates every declared condition on the same selected original practice round. It preserves the original complete-task point score, every condition's result, and counts of within, outside, incomplete and unresolved conditions. A definite failed condition makes the set outside even when another cannot be evaluated; the incomplete or unresolved finding remains visible. A nonempty set is within only when every declared condition is within. An empty set is undeclared, never a passing task.

This reveals why an individual criterion cannot establish a complete task outcome. For example, shrinking a right-angle layout by a factor of 0.7 preserves the corner angle but changes a 30 mm arm to 21 mm. A 1° angle criterion passes while a separately declared 1 mm arm-length criterion fails. Translating the whole layout can preserve every relative condition while failing its original point-location tolerances. The receiver retains both conclusions without changing their meaning.

Choose a condition to read its complete reference, retained value, difference and tolerance without horizontal scrolling. Its supplied basis, selected original coordinates, and reference/retained geometry remain inspectable. Guide projection and numerical guards retain their original meanings; the directed corner uses the shorter circular difference. Connecting lines identify selected marks rather than measured motion or a suggested correction.

Adding or removing a condition or changing the selected round hides stale findings. An unadded condition draft must be added or discarded before inspecting the set, so a partly entered requirement cannot silently be omitted from a displayed result. Invalid source replacements preserve the accepted work, and a newer draft fences delayed imports.

Save the complete raw set to preserve the original source, every retained practice round, selected round and all typed declarations. Reopening revalidates source identity and recomputes every finding; imported verdicts are not authoritative. The receiver refuses duplicate identities, unsupported condition kinds, invalid units, missing bases, more than twelve conditions, or a compact raw bundle exceeding 2 MiB. It does not replace or alter the maintained practice, pair, guide or corner producers.

Criteria can be declared after seeing outcomes. Their supplied bases remain authored assertions. A within set is limited to those declared planar conditions; it does not establish physical accuracy, contact, fit, acquired skill, or a causal learning effect. Original missing information stays missing.

## Verification

Run `node --test --test-isolation=none test/*.test.mjs` for native checks and `node tools/browser-condition-set.mjs` for the receiving course. The browser script uses the established `PUPPETEER_PATH`, `CHROME_BINARY` and `QA_OUTPUT` variables. It creates six actual practice rounds, follows the maintained producer link, authors all three criterion families, checks mixed and unavailable outcomes, saves/reopens raw originals, exercises invalid and delayed imports, checks narrow keyboard inspection and receives all twelve conditions without truncation. Exact qualification is recorded in `docs/receipts/condition-set-677009-20261024/verification.json`.


## Compare retained rounds

After inspecting the set, choose a different baseline in **Compare retained rounds
under these conditions** and press **Compare with selected round**. Both rounds
use the exact same declared conditions, units, tolerances and authored bases.
Each condition displays its original reference, retained value, difference,
allowance and status in both rounds. The original complete-task point score and
placement denominator remain separate for each round.

Equal totals can conceal tradeoffs. In an authored right-angle example, the first
round has a 21 mm arm against a 30 mm reference while preserving the third mark's
30 mm guide offset. The second restores the arm length but moves that third mark
to a 21 mm offset. Both rounds have two of three conditions within tolerance;
the comparison exposes the length entering tolerance and the offset leaving it.

An incomplete or numerically unresolved condition becoming evaluable is labelled
as an availability change, even when the resulting value is within tolerance.
Losing a mark never counts as entering tolerance. The same status does not imply
identical values; both complete typed results remain visible. Comparisons can run
in either selected direction and do not infer chronology from UI selection.

Changing the baseline clears the old comparison. Editing the set or selected
round hides all stale findings until inspection. Saving retains the existing raw
condition-set format with all original rounds; the comparison is a recomputed
view and does not add authoritative verdicts to that file. After reopening,
select the baseline again. Declared criteria may reflect knowledge of outcomes,
and these descriptive changes do not establish physical accuracy or learning.

`node --test test/condition-changes.test.mjs` exercises equal-total tradeoffs,
missing and collapsed-arm transitions, reverse comparisons, source mismatch,
replay and all 21 retained rounds with twelve declarations.
