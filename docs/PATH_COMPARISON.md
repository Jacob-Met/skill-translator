# Compare ordered sampled demonstrations

From the sampled-path investigation, save two declared accounts and open
**Compare ordered samples across two demonstrations** (`/path-comparison`).
Each account retains its entire original demonstration and verified PNGs.
Declare that its point has the same meaning in both examples and that origin,
axis directions, scale and corner meanings agree. Matching size labels alone
do not establish that declaration. The instrument fits no registration.

The comparison finds an order-preserving pairing that minimizes the largest
distance between paired sampled positions: the **discrete Fréchet distance**.
Every selected sample of each path is visited. A step advances the first path,
the second path, or both, so one sample may pair with several others. The
display shows one deterministic optimal pairing, its bottleneck pairs, each
original presented time and both source frames with declared-point overlays.
It does not synchronize the demonstrations' clocks.

Two paths that start and finish at (20,20) but pass respectively through
(25,20) and (20,25) have a minimum largest paired separation of 5 mm. Equal
endpoints conceal that sampled difference. Conversely, sampling the same
straight line at different positions can give a nonzero distance. Neither
the number nor the displayed pairing establishes a physical technique score,
continuous trajectory, speed, contact, efficiency or skill transfer.

## Complete sources and explicit gaps

Both paths must have every selected observation. A missing selected point
refuses a complete comparison instead of joining across it. Unselected frames
remain in the original account; their points are not automatically matched.
Both declared planar reference dimensions must agree exactly. The original
path receiver continues to check per-frame calibration and correspondence.
No source, calibration, point identity or original practice score is edited.

Save the complete comparison to keep both original PNG sets, raw path
declarations and cross-example interpretation. Findings recompute on reopen;
saved derived results are not trusted. Opening a replacement source clears
the old cross-example declaration. A malformed replacement preserves prior
accepted work. Edits retire delayed imports and exports.

## Mechanism and limits

For paired sample distances d(i,j), the table stores
`C(i,j) = max(d(i,j), min(C(i-1,j-1), C(i-1,j), C(i,j-1)))`, with the start
cell equal to d(0,0) and out-of-grid predecessors omitted. Backtracking keeps
one minimizing predecessor. The inherited 12-sample limits bound work to 144
cells. Distances use the maintained nominal calibrated coordinates. Floating
point and calibration uncertainty are not certified by the result.

This is the standard dynamic-programming recurrence described by Thomas Eiter
and Heikki Mannila, *Computing Discrete Fréchet Distance*, CD-TR 94/64, Table 1:
https://www.kr.tuwien.ac.at/staff/eiter/et-archive/files/cdtr9464.pdf . No source
code from that report is copied. The implementation retains source evidence
through Skill Translator's maintained sampled-path and image receivers.

## Receiving

`node test/path-comparison.test.mjs` checks nine groups, including 200
deterministic cases against an independently exhaustive enumeration of all
small-path couplings; repeated samples, order reversal, translated paths,
equal-endpoint excursions, sampling changes, missing/different-size refusals,
raw replay and full 12-by-12 capacity are covered.

`PLAYWRIGHT_PATH=... CHROME_BINARY=... RECEIPT_DIR=... node tools/browser-path-comparison.mjs`
executes actual original PNG import, paired inspection, complete download and
fresh reopening, transactional refusal, delayed import/export retirement and
390px/keyboard receiving in sandboxed Chrome. The browser course creates
explicitly authored geometric/raster controls. It is not a physical learning
experiment or Nebius/NVIDIA runtime qualification.
