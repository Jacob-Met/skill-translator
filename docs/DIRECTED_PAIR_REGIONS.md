# Directed relationships over learner-photo regions

At `/directed-pair-region`, open the saved learner-observation notebook from
Observe Learner Placements. Select two retained annotations, an explicitly named
horizontal or vertical directed-separation criterion, its allowed difference,
and each annotation's independent pixel half widths. Inspect before saving.
Draft changes hide findings; invalid imports preserve accepted inputs.

The receiver reuses `annotationContext` and `inspectAnnotationBound` for image,
calibration, practice binding and complete projective-region admission. It
refuses regions outside the raster/workpiece, perspective poles and numerically
unsupported thin areas. It does not clip or replace those requirements.
`evaluateRelationships` supplies the original point assessment and transferred
reference at the retained practice size.

For axis coordinate q, the complete independent difference interval is
[min(q_B) − max(q_A), max(q_B) − min(q_A)]. A projective rectangle admitted by
the maintained mapping is convex; its linear extrema occur at vertices.
The receiver retains actual attaining endpoint pairs. Point and segment regions
are supported. Euclidean-distance criteria are deliberately unavailable here.

A nonzero region pair is all-within only when its entire interval is strictly
inside the authored criterion with a numerical guard. It is all-outside only
when the interval is strictly separated from that criterion. Other cases,
including near-boundary cases, remain unresolved. The guard sums the maintained
endpoint guards; it is a conservative display convention, not certified
arithmetic or a measurement-confidence interval. Two zero regions reuse the
maintained nominal criterion semantics exactly.

Pair the exact original PNG/JPEG to inspect both rectangles on retained pixels.
The complete digest and browser-oriented dimensions must match. The downloaded
notebook retains original setup, practice history, observation and two raw
region declarations; derived findings recompute. Reopening requires the image
to be paired again. Nothing is applied back to practice.

The independent-regions assumption includes all combinations. It does not infer
correlation or probability, model calibration uncertainty, authenticate supplied
measurements, establish physical skill, or recommend a correction. Criteria can
be chosen after inspecting results and remain exploratory.

Native course: `node test/directed-pair-region.test.mjs`.
Browser course (existing dependencies): `PUPPETEER_PATH=... CHROME_BINARY=...
QA_OUTPUT=... node tools/browser-directed-pair-region.mjs`.
The browser course verifies actual namespace/seccomp admission, a generated
and explicitly authored raster, actual file download and native reopening,
source tamper refusal, stale-draft hiding and narrow receiving. A passing source
or native test does not substitute for executing that browser course.
