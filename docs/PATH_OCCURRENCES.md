# Find a demonstrated pattern inside a longer path

The first retained path is the complete pattern. The second is the search
source. Both keep their original frames, calibration, selected marks and
timestamps. Declare the same point meaning and coordinate frame, then supply
a nominal separation bound in millimetres. The search proposes spans without
asking you to select their endpoints first.

An occurrence visits every first-path sample and every selected sample inside
one contiguous second-path interval, preserving order. Each pairing advances
one index or both, so a sample can be paired more than once. Every paired
distance must fit the supplied bound. Intervals contain at least two selected
samples and have positive duration. No interpolation, fitted registration,
temporal rescaling or semantic matching is performed.

Every qualifying interval is retained, including overlapping or nested spans.
The count beside a span is the number of admissible discrete monotone pairings,
not a probability. One complete pairing is provided for original-frame
inspection. It is not necessarily the unique or minimum-distance pairing.
Repeated-looking positions can produce many equally admissible spans. No
interval is automatically declared to be an action or adopted as an authored
demonstration step.

## Coverage and absence

Every selected observation in the pattern must be present. Missing observations
in the second path split coverage: a candidate cannot cross one. A sample that
was never selected remains outside the search, even if its original frame is
retained. No qualifying interval means no match under these particular
samples, calibrations and supplied bound. It does not establish that the
physical action did not occur.

The two paths must have identical declared reference dimensions. The common
point/frame declaration remains a human interpretation; equal dimensions do
not establish it. A bound is a nominal comparison criterion, not a measured
calibration uncertainty or physical tolerance. Overlapping results must not
be counted as independent repetitions.

## Method and source preservation

The inherited twelve-sample limit yields at most 66 candidate intervals.
For each complete interval, the maintained `countMonotoneCouplings` kernel
counts all permitted paths through its distance grid with integer arithmetic.
A positive count supplies one backtracked complete witness. Every witness
uses indices and moment identities from the original complete sources.

A saved occurrence study contains the complete original comparison and the
supplied bound. It contains no authoritative occurrence or derived verdict.
Reopening validates the original paths and recomputes findings. Forged saved
result fields cannot manufacture a match. The original whole-path comparison
and explicitly authored timing correspondences remain independent.

This identifies conditional sampled geometric occurrences. It does not infer
the same action, expert intention, continuous trajectory, synchronized time,
technique quality, physical success or learning.
