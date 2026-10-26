# A departure can be inevitable without one fixed witness

The existing region workspace now also checks pairs of original interior
moments in each nominal return candidate. It uses the same supplied regions,
threshold and original frames. No new annotation or interval selection is needed.

If every possible separation of an interior pair is **strictly greater than
twice the radius**, both positions cannot be within that radius of the same
start: their mutual separation would then be at most twice the radius by the
triangle inequality. At least one of the two moments must therefore depart for
every allowed shared-start assignment. This is a statement about alternatives;
it does not identify one fixed moment that departs for all assignments.

The maintained exact polygon-distance kernel supplies each pair's minimum
squared distance and witnesses. Compare that exact rational value with four
times the exact squared radius, without a rounded square root. Equality does
not qualify. A return certificate still separately requires every allowed
endpoint to be within or on the radius of every allowed original start.

Existing fixed-moment witnesses remain available and primary. Every inspected
interior pair, including those that do not qualify, remains in the recomputed
details. Named alternatives have original-frame buttons and their own exact
pair witnesses. The complete original account and its download format stay
unchanged. Reopening recomputes results, and editing declarations retires them.

## Exact authored comparison

Consider original nominal x positions `15 → 5 → 25 → 15`, all at y = 20 mm.
Declare x regions `[10,20]`, `[4,6]`, `[24,26]`, `[14,16]`, each with y region
`[19,21]`. At a 7 mm radius:

- Endpoint maximum squared separation is 40, within the squared radius 49.
- Each fixed interior minimum squared separation is 16, so neither is always
  outside the radius across every possible start.
- The interior-pair minimum squared separation is 324, greater than
  four times the squared radius, 196. At least one of the two must depart.

The prior fixed-witness calculation remains honestly unresolved on this input;
the added pair certificate establishes the stronger conditional conclusion.
Changing only the radius to 9 mm makes the strict pair comparison fail at exact
equality, 324 = 4 × 81. The coherent allowed path
`(15,20) → (6,20) → (24,20) → (15,20)` then has no strict departure. This is a
negative control against using a non-strict comparison.

These are authored geometric controls, not a physical demonstration. Certificates
do not establish first-return timing, task-cycle counts, contact, calibration
accuracy or learned skill. Pair-distance extrema are separate witnesses and
must not be combined into an invented trajectory. This is a sufficient test:
failure does not prove that a coherent counterexample exists.

The original twelve-sample limit bounds shared cached comparisons to 66 distinct
pairs, even when nominal return candidates overlap. Missing positions still
break candidates. The same maintained source admission and geometry kernel own
those constraints.

## Receiving

Run `node --test --test-isolation=none test/path-return-alternatives.test.mjs
test/path-return-support.test.mjs test/path-regions.test.mjs
test/path-returns.test.mjs` for strict equality, broad-region and uncertain-return
negatives, source replay, fixed-witness preservation, cache bounds and coherent
assignment controls.

`tools/browser-path-return-alternatives.mjs` extends the maintained original-PNG
course: author and export the four original samples, import them into the
existing region consumer, inspect both original pair frames, change the same
account from 7 to 9 mm, download/reopen and inspect expanded exact evidence at
desktop and narrow widths. The driver retains sandbox and CSP checks. Actual
execution and screenshot inspection must be recorded separately.
