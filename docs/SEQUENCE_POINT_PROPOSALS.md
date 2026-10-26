# Reviewed point choices across retained frames

The optional proposal panel in `/sampled-path` reuses the maintained spatial-correspondence matcher to offer local mark choices across explicitly included original moments. It applies only when the original frames already contain compatible constellations of 3–7 annotated points. It does not request new annotation work, detect pixels or establish physical point identity automatically. The query uses fixed physical pair distances; it does not opt into common-scale matching or normalize coordinates.

Choose the included moments and one original anchor point, then supply a pair-distance discrepancy and bounded search budget. Each other selected moment is compared directly with the original anchor annotation. A complete unique mapping offers a point choice. When several complete mappings survive but every one agrees on the selected anchor, that anchor alone is offered. Other identities remain ambiguous. Different point counts, missing calibration, incompatible geometry, an unforced anchor and incomplete search do not offer a choice. Unselected moments remain unselected; an unavailable sample is not silently filled or bridged.

## Review and reference are separate

Each offered complete mapping shows both original PNGs, all paired source points and their original local IDs. Review whether that mapping denotes the same task points before using it. For an anchor-only proposal, the two original PNGs highlight only that forced pair and disclose the number of surviving complete mappings. Review only that point identity; no complete mapping is adopted or supplied to the additional-point-path consumer. For example, an isosceles triangle can fix its apex while its two base identities may swap. Selecting a base point still offers no choice.

The action converts the anchor and target into ordinary editable authored mark choices and bases. The existing sampled-path form still requires its independent fixed-plane and matching-corner declaration, label and final inspection. The proposal never checks that declaration for the author.

Pair-distance agreement cannot establish a common coordinate reference. An authored control with rotated later corner meanings retains a unique point mapping but changes a point from `(31,21)` to `(21,69)` in the reported coordinates. A wider declared plane can also retain the same physical distance pattern; the unchanged path admission refuses unequal declared dimensions. No frame transform is inferred or applied.

Before ordinary path acceptance, source, anchor, selected-moment, mark or discrepancy changes retire pending proposals and unchanged generated bases. Manually edited bases remain authored text. Withdrawing a target's semantic review retires its unchanged generated basis. Failed source admission preserves the previous accepted source and pending evidence. Successful ordinary path inspection accepts the choices as authored, clears transient proposal cards and removes their provisional basis markers. Later query edits preserve these accepted bases just like reopened authored choices. Proposal recomputation invalidates the previous displayed path account so a saved account cannot silently lag behind changed form declarations.

## Saved evidence and limits

Saving uses the existing sampled-path bundle: the complete original sequence, every original PNG, original local IDs and explicit authored choices. The transient reviewed mapping is not saved as a new certificate. Reopening restores the authored choices; a new proposal query recomputes the geometric mappings from originals. Existing path measurements and save/reopen behavior remain owned by the unchanged sequence-path and bundle consumers.

On the authored four-frame course, four separate mark-ID choices become one anchor choice plus three semantic mapping reviews and the independent common-reference declaration. This is a reduction in selecting local IDs, not a demonstrated reduction in total human actions, annotation/calibration work, or proof of learning or physical skill. Original labels are neutral and IDs are independently permuted; matching delegates entirely to the existing spatial-correspondence API.

## Forced-anchor verification

`node test/sequence-point-proposals.test.mjs` compares an authored four-frame isosceles course with translated apex positions (50,20) through (53,23). Each later frame has two complete mappings, but one common apex pair. The ordinary path retains the original points and reports a 4.243 mm chord sum. Base selection, exhausted search and changed geometry produce no offered choice; anchor-only reviews cannot enter complete mapping reuse. The browser receiving script exercises original PNGs, separate review and reference declarations, source-only export/reopen and desktop/narrow layouts. These are authored geometric controls, not measured physical skill or recognition of task intent.
