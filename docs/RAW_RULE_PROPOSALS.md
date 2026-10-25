# Infer a practice relationship from original demonstrations

From **Demonstration Sources**, choose **Infer a practice relationship from these
sources** and open the complete saved demonstration account. The receiver derives
positions from the retained annotations and tests the five maintained geometric
interpretations against every original x/y bound. No coordinate re-entry, source
renaming or conversion to circular bounds is required.

A unique survivor becomes a proposed relationship. The original-versus-proposed
target plot shows its effect on the chosen workpiece; other marks retain their
original authored rules. Change the target dimensions and explicitly compare them
before accepting the proposal for a fresh ordinary practice round. Original raw
annotations and prior practice sessions remain unchanged. An ambiguous,
contradictory or unobserved account produces no inferred practice source.

The original source inspector reuses the maintained exact-image receiver. Choose
the reference or an additional annotation and reattach its original PNG/JPEG to
verify its bytes. A matching image does not establish calibration accuracy or
semantic correspondence. Numeric observations without extra annotations remain
explicitly numeric in the per-candidate evidence. The raw source file supplies
correspondence, dimensions and bounds; no additional expert rule label is required.

## Bounds and interpretation

The comparison reuses `predictInterpretation` for fraction, left, right, top and
bottom rules. Each nominal predicted x and y is compared separately with the
corresponding observed coordinate and supplied bound using the pinned exact
rational decimal comparisons. No numerical allowance or original task tolerance
is substituted. The source coordinates and predictions still come from the
maintained nominal planar floating-point geometry; exact comparison does not
make calibration exact or bound its numerical error.

The original affine coefficient domain is retained in the raw account but does
not constrain this separate five-rule interpretation test. A unique candidate
is conditional model compatibility, not physical necessity, expert intention,
causality or demonstrated learning. There is no refitting of training inputs.

A material negative control is a predicted point `(20,60)` against an original
observation `(21,60)` with bounds x±0.1 and y±2. The rectangle correctly refuses
that prediction. Replacing these bounds by the enclosing circle of radius
`sqrt(0.1²+2²)` would incorrectly accept it. The receiver never performs that
conversion.

## Saving and continuation

**Save complete proposal** writes only the raw account and selected unique rule;
reopening validates and recomputes both the candidate and proposed source. A
changed rule or evidence that no longer supports the saved rule is refused.
Images remain external. The compact complete export is bounded at 2MB and refuses
to discard sources to fit. Save the complete proposal to retain its raw supporting
account; the ordinary practice handoff carries the proposed source, not a copy of
all additional raw images or a new observed practice result.

Target drafts disable practice and proposal export until applied. An invalid
target leaves original evidence intact. A newer target action retires an older
pending file import. Accepted replacement and source selection release earlier
image attachments through the maintained source-image lifecycle.

## Executed verification

`node --test --test-isolation=none test/raw-rule-proposals.test.mjs test/response-demonstrations.test.mjs test/rule-adoption.test.mjs`

28 named native tests pass. Composition on c786e707 also passes all6 new
path-axis cases (34 total, no failures/skips). The raw-source checks include all five changed-input interpretations,
separate bounds, exact computed-bound equality/just-below controls, original
source immutability, original practice-vs-proposed target difference, absence and
ambiguity, refused unconfirmed correspondence, source-only replay and affine-domain
independence. Authored original PNGs are generated deterministically by the browser
runner without external media.

`QA_OUTPUT=/tmp/task-output runuser -u nobody -- "$CODEX_PRIMARY_RUNTIME_NODE" tools/browser-raw-rule-proposals.mjs`

Run with an existing writable task output directory and `CHROME_BINARY` pointing
to Chromium. The runner uses Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES`
and explicitly enables the Chromium sandbox. Eight actual browser groups pass,
covering source-workbench navigation, complete raw intake, original PNG and
wrong-image custody, target edits, actual fresh practice, changed source,
input-only390px replay, delayed-import retirement and the anisotropic refusal.
Desktop/narrow rendered source pixels and target plots were inspected. These
controls establish software receiving, not physical skill or Nebius execution.
