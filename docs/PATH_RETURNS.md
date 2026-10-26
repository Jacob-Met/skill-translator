# Sampled departure and return proposals

Open an original sampled-path account in `/sampled-path`. Beneath its existing
geometry, **Find sampled departure and return intervals** accepts a nominal
radius in millimetres. Choose **Find return candidates** to search every original
selected point as a possible start. Inspect the retained start, farthest sampled
departure and return using the original-frame buttons.

For each start, the first later selected sample outside its radius by more than the maintained numerical length guard establishes a
departure. This prevents tiny calibration roundoff from becoming a zero-radius excursion;
near-boundary differences do not establish departure. The first subsequent selected sample inside or on that radius supplies
the return. Missing positions terminate the search. A stationary run, monotonically
departing run, or equal endpoints separated by an explicit missing observation
does not produce a return. Ties for farthest departure retain the earliest sample.

The search replaces manual endpoint scanning with editable geometric proposals.
The baseline already showed chords and turns; it did not enumerate these intervals.
Initial calibration and point correspondence still require supplied evidence. The
radius is a nominal comparison threshold, not an estimated measurement error.
Overlapping candidates are kept: A/B/A/B/A can yield three overlapping intervals,
which must not be interpreted as three repetitions of a task. These proposals do
not establish contact, purpose, completion, physical trajectory or learned skill.

Changing the radius clears its results until recomputation. Editing source
declarations hides the existing result through the maintained account workflow.
The complete source export is unchanged; reopen it and choose a radius again.
No candidate endpoint replaces an original frame or annotation, and no additional
inferred fields enter the saved evidence.

## Verification

`node --test --test-isolation=none test/path-returns.test.mjs
test/sequence-path.test.mjs test/path-summary.test.mjs` exercises the maintained
input admission and existing path algorithms. Authored unfamiliar oblique points
at nonuniform times test witness identities and raw reopening; stationary,
monotone, missing and changed-radius examples are negative controls. These are
software geometry controls, not independent physical demonstrations.

`PLAYWRIGHT_PATH=... CHROME_BINARY=... RECEIPT_DIR=...
node tools/browser-path-returns.mjs` exercises original PNG intake, return and
farthest-frame inspection, changed-radius/missing refusal, complete raw download
and reopen, tampered-source refusal, delayed intake cancellation and narrow
receiving. Browser execution and its exact source revision must be recorded
separately; the presence of this driver alone is not a passing result.
