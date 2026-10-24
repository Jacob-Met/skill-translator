# Declared three-mark guide alignment

Open **Inspect a three-mark guide** from the practice page after saving the original source and practice session. Load both files, choose two distinct guide anchors and a third compared mark, then declare the relationship's name, tolerance and basis. Every retained round remains selectable, including an incomplete current round. Original point-position scores remain visible alongside this separate criterion.

The guide is the directed, unbounded line from the From anchor toward the To anchor. The comparison measures the third mark's signed perpendicular offset from that line and subtracts the corresponding offset in the adapted reference geometry. It therefore supports a source relationship with a nonzero offset. The along-guide projection is shown separately: a projection beyond an endpoint does not fail an unbounded-line offset criterion. Reversing the anchors reverses the offset sign without changing the absolute-error verdict.

For example, reference marks at (20,50), (50,50), (80,50) millimetres and retained marks at (20,51), (50,49), (80,51) can pass each original 2 mm point tolerance while failing a declared 0.5 mm guide criterion: the middle point's relative offset differs by 2 mm. Conversely, rigidly rotating all three marks preserves this guide relationship even when their original point scores fail. The tool preserves both assessments and does not claim that one overrides the other.

Missing marks yield an incomplete relationship. Coincident or numerically indistinguishable anchors yield an unresolved relationship. A scale-relative numerical guard is displayed; it is a computational convention, not an estimate of physical measurement uncertainty. Dashed reference and solid retained geometry, perpendicular measurement lines, and exact coordinate tables explain the result. These lines are measurements rather than proposed correction movements.

**Save complete raw guide review** retains the original source, full practice session, selected round and declared criterion. Reopening revalidates source binding and recomputes findings; imported cached scores have no authority. Editing the criterion hides previous findings until it is inspected again. Invalid replacements retain the accepted review, and delayed older imports cannot replace a newer draft.

The criterion is authored by the reviewer. It does not establish contact, fit, physical accuracy, learning effectiveness, or independent physical skill. The maintained practice producer, raw session schema, placements and original tolerances are unchanged.

## Verification

Run `node --test --test-isolation=none test/*.test.mjs` for native checks and `node tools/browser-guide-alignment.mjs` for the receiving course. The browser script uses `PUPPETEER_PATH`, `CHROME_BINARY`, and `QA_OUTPUT`; it creates four rounds through the maintained practice UI, downloads the actual original records, follows the guide link, inspects each case, saves and reopens a review, and checks source mismatch, delayed replacement, narrow layout and keyboard table inspection. The receiving receipt is in `docs/receipts/guide-alignment-677009-20261024/verification.json`.
