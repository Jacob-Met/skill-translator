# Conditional movement bounds across sampled states

Open `/path-regions` from the sampled-path result. Receive an original sampled path with every retained PNG. For each observed selected moment, declare an axis-aligned rectangle in the existing common reference plane, in millimetres, containing that nominal annotation. State the basis for those supplied bounds. Missing observations remain missing and cannot receive a rectangle. No region is silently clipped to a sheet or inferred from pixels.

Supply a displacement threshold. The receiver inspects every adjacent selected pair and the selected endpoints independently. The maintained `polygonPairDistance` component and vendored CHRONOS exact rational arithmetic compute the minimum and maximum squared distances over the two independent rectangles, including exact extrema witnesses. The threshold is squared exactly from its supplied binary64 value. Every admitted distance is either strictly above the threshold, at or below it, or unresolved because the bounds permit both outcomes. Equality belongs to “at or below.” The comparison never uses a rounded square root.

The original source, annotation, correspondence, nominal geometry and PNGs remain unchanged. Saved accounts retain original sampled-path source once and raw region declarations; receiving revalidates and recomputes. Original PNG hashes and image decoding use the maintained sequence receiver. Edits invalidate accepted findings; asynchronous source intake and downloads are revision fenced. Invalid replacements retain the last accepted evidence.

## Worked control

Two nominal points at (20,20) and (24,20) have a 4 mm chord. Independent half-millimetre square bounds give exact squared distance extrema 9 and 26 mm²: every possible distance exceeds 2 mm. Three-millimetre square bounds around the same nominal points give 0 and 136 mm², so the same question becomes unresolved. Those rectangles are authored declarations, not measured error estimates.

## Boundaries

These are conditional geometric results on supplied common-plane coordinates. They neither establish that a physical point lies within the rectangle nor propagate source calibration error. They do not infer correspondence or movement between frames. Different adjacent extrema may require incompatible positions of a shared middle sample, so no sum of adjacent minima/maxima is presented as an attainable total path interval. The threshold is a user-selected geometric comparison, not a learned or necessary physical criterion. Point and segment declarations are supported without manufacturing area. Workpiece dimensions remain the maintained 1–10000 mm contract; coordinate and rectangle admission is finite and source-bound.
