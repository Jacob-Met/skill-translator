# Locate remaining sampled appearance changes

The demonstrated-sequence scan can locate residual regions after its narrow or
wide image-shift comparison. Open **Locate remaining change after image shift**
inside a fitted comparison to inspect the original earlier and later samples,
their support and connected-region bounds. The existing unaligned region view,
whole-image scores, all retained shifts and full-resolution moment capture remain.

This answers a conditional appearance question. On an authored pan-plus-patch
course, the existing unaligned detector can cover almost the entire sample;
after accounting for the retained shift and brightness offset, only the local
patch exceeds the same 16-channel-level threshold. No region, object label or
point coordinate is supplied by the observer.

## All minimizing shifts participate

For each exact minimizing integer shift, compare the same reference interior
with its shifted later pixels and subtract that shift's fitted brightness offset.
A sampled pixel changes if any RGB channel's residual reaches the existing
threshold. The earlier and later images accumulate their own coordinates:

- **Every fit:** the pixel exceeds the threshold in every retained fit. Each fit
  must actually evaluate that pixel; absent support cannot count as changed.
- **Some fit:** the pixel exceeds the threshold in at least one evaluated fit.
  Other fits may disagree or may not evaluate that pixel.

The earlier full-support rectangle is the fit's common interior. The later
full-support rectangle is the intersection of every translated interior. Outside
that intersection, some-fit observations can still exist; an every-fit conclusion
cannot. Each fit leaves its own unevaluated pixels unassessed.

A flat earlier image followed by a central 5 × 5 patch illustrates why an
arbitrary first shift is inadequate. At radius four, all 81 shifts minimize the
same residual. The earlier reference has zero every-fit pixels and 169 some-fit
pixels, while the later image has the original 25 patch pixels under every fit.
These are different coordinate questions, not conflicting counts or a discovered
correspondence. Uniform images with an exact zero fitted residual need no mask
traversal: every evaluated channel is zero under every minimizing fit.

## Reuse and work bounds

The pinned `vendor/microverse/pixel-observations.mjs` performs the same eight-way
connected-component extraction used by the unaligned region view. Regions under
four pixels remain counted and listed as excluded. Components are not identified
as physical objects, and a bounding rectangle includes pixels outside its region.
The fixed component admission remains; extraction failure is unavailable, never
a zero-change result.

Residual masks use two unsigned 16-bit counters per sample pixel, sufficient for
the admitted maximum 1,089 fits. At most `commonPixels × retainedFits` pixel pairs
are inspected after fitting. Work stays in the existing single comparison worker,
with interval progress and source/report ownership. Native fit-only callers keep
their prior output unless `includeChangeRegions: true` is explicitly requested.

Canvases and region rows are created only when the details open. Both original
sample images are retained; cyan boxes show every-fit components and amber boxes
show some-fit components. Excluded small components use dashed bounds. The white
dashed rectangle marks complete support. At most 50 coordinate rows are rendered
per page, and all retained regions remain available. The controller preserves
open state, page and keyboard focus when another radius finishes for the same
scan. Source clearing/replacement retires derived views through the existing flow.

The displayed canvases are small scan samples, not new retained image evidence.
Original-resolution capture, sequence exports and fresh reopening are unchanged.
The result does not establish camera motion, physical identity, contact, action,
skill, completion or anything between the sampled frames.

## Reproduction

```sh
node --test test/translated-change-regions.test.mjs test/visual-translation.test.mjs \
  test/visual-scan.test.mjs test/visual-span.test.mjs test/scan-change-regions.test.mjs

PLAYWRIGHT_PATH=/path/to/playwright CHROME_BINARY=/usr/bin/google-chrome \
RECEIPT_DIR=/tmp/translated-change-regions-receiving \
node tools/browser-translated-change-regions.mjs
```

Native checks compare masks and component geometry with an independent set/flood
oracle across changed and periodic courses. They retain original default outputs,
ambiguous mappings, small excluded regions, omitted borders, exact zero ties and
unavailable support. The browser receiver uses authored original media, real
sandboxed Chrome and the maintained server. Exact execution results and any
informative failures belong with the reviewed source revision.
