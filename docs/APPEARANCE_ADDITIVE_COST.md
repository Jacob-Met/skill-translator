# Finite appearance cost under additive shifts

The existing three-frame appearance page retains two separate questions:

1. Can all three independently minimizing shift sets compose additively? The maintained #473 answer and every original pair report remain unchanged.
2. What is the least summed finite image residual when shifts must satisfy `AC = AB + BC`, and how much does that constraint cost relative to the independent minima?

The second question enumerates all finite additive triples. It retains every exact optimum, participating alternative, witness and bounded page. An empty independent-minima join can coexist with a small positive-cost additive optimum; no threshold turns that excess into a physical verdict.

## Shared kernel and arithmetic

`profileTranslatedSamples` in `src/visual-translation.mjs` exports the complete maintained histogram costs and the exact incumbent comparison derived from those costs. The old comparators and new profile share one private histogram loop and one private report reducer. Original admissions, lower median, candidate order, zero comparison, alternative objects, status and optional residual-region behavior remain intact.

A profile contains raster dimensions, radius, complete reference support, channel count, every candidate's integer shift, integer fitted brightness offset, exact integer absolute residual and boundary flag, plus its acyclic `comparison`. Explicit support normalizes only its admitted coordinates/dimensions, as the incumbent supported comparator does. Insufficient default support remains explicit. The shared kernel still accepts the maintained 160×160 raster domain; the appearance-page source request separately retains its 14,400-pixel bound.

`minimizeAdditiveAppearanceCosts` accepts three complete matching profiles. It reserves two complete adjacent-candidate passes, then retains the least integer sum and all ties. Maximum work is 2×1089² = 2,371,842 pair visits per page. Each page reuses cached image profiles but recomputes both algebra passes; it is not a free lookup. An exact cost is at most 255 times its channel count, because zero brightness offset provides that upper bound and a median cannot worsen it. Individual adjusted channel residuals may exceed 255 and are not clipped. Integer sums remain safely exact.

The displayed mean uses three equally weighted, equal-size channel populations. Each directed pair fits its own brightness offset on its own reference-frame inset. This does not establish one globally registered photometric field, an object identity, an action or physical motion. The finite radius/support and all search-boundary alternatives remain visible. Positive display values below 0.001 channel levels are shown as `<0.001`; exact zero remains distinct.

## Work and source lifecycle

The worker performs exactly three histogram searches, using each profile's `comparison` to preserve the independent pair reports. Initial work reserves those three finite pixel searches, the maintained full-frame admission comparisons (three calls, each with two RGB traversals), the original independent-minima join and both cost-reduction passes; `initialWorkReservation` records upper bounds, not measured independent-minimum visits. The source inspector admits the original request before any pixel work and reserves at most 200 million counted RGB channel visits (finite-search visits plus the six full-frame RGB traversals) and 3.6 million initial algebra pair visits.

Source/settings edits, import, cancellation and page exit retire the existing worker and cached profiles. Page replies require current worker, revision and exact source identity. Export remains the existing complete original sequence/PNG plus triplet/v1 settings. No cost profile, fit, result or cache is saved as source. Fresh reopening recomputes both questions. Two-frame mode remains unchanged. There is no new page, source intake, sampler, ROI, calibration or numeric-inference schema.

## Qualification

Nine new native controls cover all candidate costs against sorted-difference arithmetic, the generic 160-square domain, 256 independent triple oracles, all 667,489 flat radius-16 optima, structural admission, exact original-account parity, acyclic report parity and explicit-support normalization. Three maintained files cover twenty additional defined controls, including twenty pinned pre-refactor reports. A separate frozen-baseline check matched 144 serialized successful reports and four refusal/insufficient cases.

Six browser groups received the retained original Commons scissors PNG source through the ordinary consumer, source-only save/fresh replay, separately authored changing/flat PNG controls, full optimum pagination, a delayed real page reply retired by editing, and incumbent pair mode. The authored changing course has integer independent lower bound 175,294, constrained optimum 178,048 and excess 2,754. Flat radius-2 imagery retains all 361 optima. These are finite image-model observations, not physical accuracy evidence.

After that course, two focused real-DOM controls checked the per-directed-pair brightness copy and exact-zero versus tiny-positive formatting. The tiny-positive report is an explicit display fixture, not an image-computation observation. An explicit-support normalization fix affects only that new API path; the default support used in the browser course is unchanged. No full lifecycle rerun is claimed for these narrow changes.

Original recording attribution: [Aerra’s Films of the Ordinary IV — Scissors Cutting Card Stock](https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm), Aerra Carnicom/Aerrapc, CC BY-SA 4.0. Original media, PNG payloads, saved bundles and screenshots are excluded from this source packet. Evidence records distinguish authored controls, original-image receiving and independent source review.

The incumbent `channelComparisons` field remains search-only for exact parity. `initialWorkReservation` separately records `fullFrameAdmissionCalls`, `fullFrameRGBTraversals`, `admissionChannelVisits` and `totalRGBChannelVisits`. These count the declared pixel traversals, not total CPU instructions, shape validation, histogram-bin arithmetic or sorting/DOM costs. This accounting correction changes no image-scoring loop and passed a focused native reservation control; no full browser lifecycle rerun is claimed.
