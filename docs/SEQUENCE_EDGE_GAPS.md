# Inspect gaps in a proposed image segment

The optional internal-support inspector helps an observer distinguish a straight
Hough proposal from the discrete detector pixels supporting it. It operates on
the selected candidate in the original retained frame, without changing the
proposal, detector settings or observer disposition. Both original point-cloud
reports and complete-field reports use the same admitted source contract.

## What the certificate means

Project every candidate-support pixel center onto the candidate axis and sort
the exact integer dot products. For consecutive projection values with difference
D and candidate squared length L², the exact comparison D² > 16 L² establishes
that their axial midpoint is farther than two image pixels from every supporting
pixel center. Every support projection lies on one side of those consecutive
values, and Euclidean distance is at least axial distance. Equality is excluded.
The two-pixel radius comes from the existing support convention, not a newly
tuned threshold. Squared comparisons use BigInt; exact rational coordinates
and squared-distance lower bounds reuse the maintained CHRONOS rational kernel.
Approximate axial lengths and SVG coordinates are display values only.

Purple spans connect the two neighboring support projections. **Only the marked
midpoint is certified outside the two-pixel radius by this displayed proof.**
The whole purple span is not labeled unsupported. Neighboring actual pixel
centers remain visible as numeric witnesses. The panel reports the full gap
count and renders the first 25 in segment order to bound DOM work.

This is a sufficient and incomplete test. No reported gap does not certify a
continuous boundary. Candidate endpoints and other detected pixels are not
assessed. There is no inference of physical edge absence, contact, persistent
identity, measurement scale or task success. A detected support gap does not
automatically reject a proposal or change an observer's selected feature.

## Source and lifecycle

The inspector first reuses receiveSequenceEdge, including original moment, image,
clock, ROI, settings and complete support checks. Complete fields reuse
edgeFieldSupport; point clouds reuse the verified support indices. Candidate or
moment changes recompute witnesses. Missing reports hide the panel. Invalid
imports preserve accepted evidence. Saved studies retain original source and
reports, with no authoritative derived-gap cache; reopen recomputes findings.

## Executed evidence

An unfamiliar permitted paper-cutter video supplied five original presented
frames at 0.507, 2.007, 4.007, 6.007 and 7.973 seconds, using one fixed ROI and
the unchanged detector profile. Across all474 candidate segments, the inspector
finds44 internal gaps in34 candidates. Per-frame candidate denominators are
144,34,122,104,70; gap counts8,5,19,10,2 and candidates with gaps7,5,10,10,2.
Every count and exact midpoint matches an independent Python full-cloud scan.

Earlier exploratory hypotheses were negative: all46 nonparallel candidate
crossings shared support pixels, and all46 had support within two pixels of
the crossing for both candidates. Those findings are retained; the current
mechanism does not claim unsupported crossings. Original video/PNG media remain
private to the permitted experiment and are not included in the publication.

Six authored native groups cover equality, duplicates/off-band pixels, exact
field/cloud parity, reversal/diagonal geometry, empty support, source refusal
and independently evaluated rational distances. Ten existing edge/study groups
remain passing. Actual original-video browser receiving covers native output,
source-only save/reopen, candidate switching, rejected wrong-source import,
moment retirement and390px layout. SECOND GROUND independently accepted the
mathematical proof and ran all six new groups.
