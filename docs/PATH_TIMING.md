# Compare timing across demonstrated paths

Open **Compare timing across demonstrated paths** from Sampled path, or visit `/path-timing`. Open two sampled-path exports created by the maintained workflow. Each must include its original retained PNG frames and explicitly declared point correspondences. The receiver checks those frames through the existing bundle reader; a raw geometry-only file is not a substitute for the original browser export.

Name an action interval, explain why the two intervals correspond, and select its start and end sample independently in each demonstration. Add another interval to compare phases. Matches must run forward and cannot overlap on either source; neighboring intervals can share endpoints. Omitted phases stay unmatched. The software does not infer matching actions, align motions automatically, or decide that two people performed equivalent work.

For each match, inspect original presented-frame timestamps, elapsed seconds, the second/first elapsed ratio, and the elapsed difference. Time shares use the sum of the explicitly matched intervals, not the whole clip or activity. Inspect original frames and the retained annotations behind each interval. A missing selected position does not erase the time evidence, but prevents a complete sampled chord sum and chord-distance/time quantity. Known adjacent chords remain available as partial coverage. Unselected retained frames inside an interval are listed.

## What the comparison can establish

An authored control with the same sampled 10 mm excursion over four seconds and eight seconds returns a duration ratio of two and equal sampled chord sums. Another control keeps the same four-second total while moving the intermediate timestamp: the phase comparison reveals the reallocation hidden by the equal total. These are analytic software controls, not measured learning or physical-skill results.

Each demonstration retains its own declared planar reference and calibration. Different sample density can produce different chord sums even for the same motion; an endpoint-only view can conceal an excursion. Chord distance divided by elapsed time is a sampled geometric quantity, not instantaneous speed or total physical travel. Neither longer time nor shorter chords establishes efficiency, technique, task success, safety or expertise.

## Retain and reopen

Save the complete comparison to download both original sampled-path bundles, their frames, and the explicit interval declarations. Reopening recomputes all findings; stored result fields are not trusted. Original sources are kept in full, including unmatched samples and source accounts. Invalid replacements preserve accepted work. A newer import or accepted edit retires an unfinished read. Files stay in the browser; nothing is uploaded or automatically stored.

The pure `src/path-timing.mjs` API accepts the maintained raw path accounts. It bounds comparisons to 1–11 ordered interval matches and 8.5 MB of raw declarations. The browser bundle adds the existing original-image budgets for both sources and uses `web/path-timing-input.mjs` to retain and validate their bytes.

## Verification

`node --test test/path-timing.test.mjs test/sequence-path.test.mjs` exercises timing changes, phase reallocation, gaps, sampling differences, unmatched intervals, invalid matches, complete source custody and recomputation. `tools/browser-path-timing.mjs` exercises actual producer-shaped bundles through the page, original-frame receiving, download/reopen, rejected source corruption, overlapping matches, missing positions, stale reads and a narrow layout. Browser execution needs the established Playwright and sandboxed Chrome installation; no dependency install or external service is required by the product.
