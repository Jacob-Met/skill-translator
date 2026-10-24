# Conditional feedback from retained photo rounds

In **Practice review**, open the original source and practice session or a saved review, choose two different retained rounds, and use **Compare complete photo regions across retained rounds**. Declare horizontal and vertical pixel half widths separately for the earlier and later photographs. Each declaration applies to every fixed common mark in that round.

The existing point results remain unchanged. The new comparison uses only marks placed in both selected rounds, lists marks missing from either, and refuses the complete comparison if a common placement lacks its own photo annotation or was moved after that annotation. Missing or detached evidence never silently becomes zero error or drops out of the common set. Both rounds must retain a normalized photo observation. One to 64 common marks are admitted.

## What the result means

For every mapped annotation polygon, the maintained exact polygon distance helper computes squared distance extrema to that mark's target. The comparison sums these over the **same fixed mark set** in each round. A strictly lower later upper bound than earlier lower bound establishes a conditional decrease; the reverse establishes an increase. Overlapping bounds or equality remain unresolved. These are conditional geometric statements, not evidence of learning, causation, acquisition accuracy, or probabilities. No nominal RMS change is substituted for this test.

All declarations retain the original supplied calibration. The inherited mapping guard `g` is an engineering allowance, not calibrated uncertainty or a guarantee of physical accuracy. To incorporate it without certifying approximate square roots, let `M` be the greatest vertex Manhattan distance to the target; convexity makes it an upper bound for every nominal Euclidean radius. Exact rational arithmetic widens each squared-distance interval by `2*M*g + g*g`, clamps its lower bound to zero, and then sums. This may conservatively leave a result unresolved. Even zero-width declarations retain that allowance for cross-round comparisons; the original point assessment is displayed separately and unchanged.

For the authored control with two marks at point errors 3 mm earlier and 1 mm later, horizontal half widths of 2 pixels leave direction unresolved. Half widths of 0.1 pixels establish a conditional decrease. Neither conclusion is a measured learner study.

## Retained evidence and portability

Each round displays its original image name and SHA-256. Pair the corresponding original image bytes locally to inspect declared rectangles overlaid on the photograph. Pairing verifies the maintained image identity contract. Saved JSON retains the admitted raw review, both declarations, and a source/round reference; it contains no trusted derived verdict. Reopening re-admits the raw practice and recomputes geometry. A changed source reference refuses transactionally. A saved comparison can be reopened beside a different active review without altering it; original image bytes must be paired again in that tab.

Changing declarations clears stale findings and disables saving. Changed active rounds or source clear the comparison; delayed reads cannot overwrite newer input. A failed import leaves the previously accepted comparison intact. Portable input/output is limited to 4 MB. Arithmetic capacity or region-admission failure refuses the complete result.

## Receiving

```sh
node test/photo-round-feedback.test.mjs
PUPPETEER_PATH=/existing/puppeteer CHROME_BINARY=/actual/sandbox-capable/chrome \
QA_OUTPUT=/fresh/receipt-directory node tools/browser-photo-round-feedback.mjs
```

The browser course uses actual downloads and native file reopen, two actual authored image files, source tamper, changed-source/declaration cancellation, independent retained replay and an expanded exact-witness view at 390 pixels. It verifies actual Chrome sandbox admission; no package installation or sandbox bypass is required.
