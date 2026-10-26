# Return proposals under supplied position bounds

Open the existing sampled-path region workspace with its original path and
retained frames. Declare or reopen its common-plane position rectangles and
distance threshold. Inspecting the account now also checks the original
departure-and-return candidates using that threshold as their return radius.
No additional point correspondence or interval annotation is required.

The original nominal candidates remain visible. A candidate receives a
**universally supported excursion** certificate only when both conditions hold:

- Every position in its original endpoint region is within or on the radius of
  every position in its original start region.
- At least one fixed interior original moment is strictly outside that radius
  for every position in its region and every position in the same start region.

The maintained exact polygon-distance kernel supplies the comparisons. Squared
rational distances are compared directly with the squared threshold. Endpoint
equality is included; departure equality does not establish a departure.
Every original interior pair remains inspectable, including exact extrema and
their separate witnesses. A broad region around the nominal farthest sample can
remain unresolved while another retained interior moment supplies the certificate.

These universal statements apply together for the same shared start, because
each holds for every allowed start position. Separate extremal pair witnesses
need not use the same start and must not be assembled into a synthetic path.
The output is a sufficient certificate, not an exact jointly attainable range.
**Unresolved does not prove that a counterexample exists.**

The certificate does not establish first-return timing. For example, a nominal
20 → 25 → 22 → 20 mm path can admit 20 → 25 → 20 → 20 mm when the third
position has broad supplied bounds. The departure and eventual return still
hold, while the first actual return can occur earlier than the nominal candidate.
Missing selected positions break candidates; motion between selected frames is
unknown. Overlapping candidates are alternatives, not counts of task cycles.

Original-frame buttons return to the existing evidence and declarations.
Changing a declaration hides prior results until recomputation. Saving keeps
the existing raw region account and original source frames; reopening recomputes
support without trusting saved conclusions. No new source schema is introduced.

These are conditional geometric findings. Supplied rectangles do not establish
physical accuracy, inferred calibration uncertainty, contact or learned skill.

## Verification

Run `node --test --test-isolation=none test/path-return-support.test.mjs
test/path-regions.test.mjs test/path-returns.test.mjs`. Authored controls include
narrow/broad bounds on identical nominal evidence, exact boundary equality,
missing observations, unchanged raw reopening, a non-farthest reliable witness,
forged-conclusion refusal, earlier possible returns and independently sampled
coherent shared-start assignments. These tests are not physical demonstrations.

The actual-browser course is `tools/browser-path-return-support.mjs`, using the
existing Playwright/Chrome environment with the browser sandbox enabled. It
exercises original path export into the existing region consumer, changed-bound
support, original-frame inspection, raw export/reopen, refused replacement and
desktop/narrow receiving. A driver file alone is not a browser passing result;
record execution and inspect its produced screenshots separately.
