# Compare appearance after an image shift

The maintained **Demonstrated sequence** page can sort a completed visual scan by
**Largest change after shift**. This helps find local changes when an image-wide
translation otherwise leads the existing brightness-adjusted ranking. Choosing
the order fits every compared interval in a worker; no landmarks or manually
entered displacement are required. Original scores, original sample pairs and
full-resolution capture remain available. The original scan is unchanged.

## What the comparison means

`compareTranslatedSamples(before, after, {radius})` enumerates integer shifts on
the original sampled RGB raster. The default radius is four sampled pixels; the
core admits radii one through six. Every candidate uses exactly the same inset
reference pixels. It fits the same lower-median additive brightness shift as
the existing RGB L1 score, and retains every exact minimum of the integer
residual. The displayed zero-shift comparison uses that same interior support.
The original whole-image score still includes the excluded border.

Results report the candidate count, support bounds, omitted border pixels,
brightness offset for every minimizing shift, ambiguity and a search-edge
minimum. Small samples without at least a 3 × 3 common interior have no score.
Existing missing-sample, duplicate-presentation and time-gap refusals are
retained. Source replacement or clearing retires the worker; failure produces
an unavailable state rather than a numerical result. Original pixel arrays
are cloned, not transferred out of the scan.

This is a finite appearance comparison. A real object's motion can also fit an
image shift. It establishes neither camera motion nor physical correspondence,
and it does not identify an action or infer unseen frames. Rotation, subpixel
motion, movement beyond the search radius and changes confined to the omitted
border are outside this fitted score. Original evidence remains necessary to
interpret the suggested ordering.

## Verification

Run the affected native checks from the repository root:

```sh
node --test test/visual-translation.test.mjs test/visual-scan.test.mjs test/visual-span.test.mjs
```

The 21 passing groups include an independent sorted-delta exhaustive oracle on
24 varied small rasters, exact ties, periodic and flat rasters, search-edge
minima, source/time gaps, input immutability and an excluded-border control.

The ordinary journey is reproduced by:

```sh
PLAYWRIGHT_PATH=/path/to/playwright \
CHROME_BINARY=/usr/bin/google-chrome \
RECEIPT_DIR=/tmp/skill-visual-translation-receiving \
node tools/browser-visual-translation.mjs
```

This harness creates its original media from authored pixels with FFmpeg; no
external footage is required. It uses Chromium's actual sandbox and the
maintained server's content security policy. A 320 × 240 clip changes through
an image shift, a local patch, a uniform brightness change and an unchanged
state. The original ordering leads with the translated interval; the fitted
ordering leads with the local patch. In the received course the translated
interval falls from about 53 channel levels on the common interior to zero,
while the local patch retains about 4.4 levels. These are authored-course
results, not accuracy or performance claims about arbitrary footage.

Six browser groups cover that changed ordering, keyboard inspection and a
390-pixel layout, original full-resolution capture and source-only save/reopen,
a fresh unchanged clip, cancellation during fitting and worker-resource
failure. The receipt retains source hashes, measured scores, sandbox evidence,
screenshots and page errors. The older `browser-visual-scan.mjs` receiver uses
`waitForFunction` with an injected evaluation path blocked by the maintained
CSP on the available Playwright version; this new receiver uses locator waits
without weakening that policy.

The shift fitting does not change saved sequence schema, retained images,
source provenance, manual state selection or existing transition ownership.
