# Reuse reviewed forced point identities

The sampled-path workbench can retain an explicitly reviewed **subset** of point
identities even when the full constellation has several compatible mappings.
It reuses the existing complete pair-distance matcher; no new matcher, alignment
or partial-observation model is introduced.

## Ordinary source workflow

Open an original sequence bundle at `/sampled-path`, select moments and an anchor,
and propose point choices. A pair is offered only after the complete bounded
search establishes that every surviving mapping agrees on that identity. When
an ambiguous frame has several forced pairs, expand **Optionally review all …
forced pairs for later point paths**. Inspect both original PNGs and the numbered
pairs, then explicitly review every highlighted pair. The ordinary selected-point
confirmation still applies. Use the reviewed choice in each included frame.

The existing independent fixed-plane and corner-meaning declaration remains
required. Inspect the selected samples. If a second reference point is forced
and reviewed in every included frame, the separate **Other paths from the
reviewed forced subsets** panel derives its ordinary path. Original annotations,
coordinates, labels, PNGs and reference declaration are retained. Unforced points
and points not supported in every selected frame are excluded; no gaps are filled.

A complete unique mapping's existing full semantic review already reviews all
its pairs. A singleton forced anchor has no additional identity to review. Neither
case requires a duplicate checkbox. An ambiguous frame with multiple forced
points requires the explicit expanded review before its other points can be
reused. Selecting only the original one-point option remains useful and cannot
become a review of additional identities.

## Save and reopen

Save an individual result as an ordinary sampled-path bundle, or choose **Save
reviewed forced-subset account** to retain the separate reviews and all original
frames. Reopen the latter through **Reopen reviewed forced subsets**. Every
complete match is recomputed from the original calibrated annotations; retained
pairs must exactly equal the recomputed forced subset. A budget-exhausted search,
changed seed identity, added unforced pair, omitted review or wrong original PNG
is refused without replacing accepted evidence. Merely adding rationale text to
an ordinary path cannot reconstruct these reviews.

The forced-subset format is separate from the complete reviewed-mapping format.
It never promotes an ambiguous constellation to a complete mapping. Its seed
account is bounded at 32 MiB; the portable bundle also retains the existing
bounded original-frame bundle. Source selection, query changes, ordinary edits
and withdrawn reviews retire dependent results. No persistence or upload occurs
unless the user explicitly downloads a local file.

## Evidence and limits

An authored four-point course has two forced axis points while two symmetric
base identities can swap. Three later frames each retain two complete mappings.
With independently authored rotation and translation, the two original point
paths have sampled chord sums about 34.059 and 18.416 mm. The new consumer derives
the second path from one expanded review per frame, without selecting four more
local mark IDs or copying the seed's point-specific label. The unresolved base
points never become paths.

`node test/reviewed-forced-point-paths.test.mjs` exercises recomputation,
point-specific meaning, exhausted search, source/identity changes, explicit
review requirements and forged subset refusals. The original complete-map and
anchor-only tests remain separate regressions. The browser harness
`tools/browser-reviewed-forced-point-paths.mjs` exercises new original PNGs,
manual-consumer parity, a changed original course, full source export/reopen,
refused replacements, withdrawal and desktop/narrow rendering.

Source calibration, annotations, point semantic review and the common reference
remain expert inputs. Removing repeated selections does not establish reduced
human time or cognitive load. Pair-distance agreement is conditional geometry;
source labels and reviews are supplied records, not authenticated physical
identity, task purpose, continuous motion, success or learning evidence.
