# Boundary-triggered midpoint acquisition: negative development result

The frozen one-round policy **did not improve finite-search containment against equal-sample uniform acquisition** on this known original source. It required 40% more pair fits. This result does not justify adding the policy to the maintained product.

## Complete comparison

Both schedules acquired all 16 requested frames and compared all 15 final adjacent intervals. There were no missing, duplicate-time, out-of-order or changed-size pairs. All fits had one minimizing shift. The adaptive schedule retained all nine original parent fits, requested six midpoints for parents 1, 2, 3, 4, 5 and 7, and retained the six retired parents alongside the final sequence.

| Measure | Adaptive midpoint policy | Uniform control |
|---|---:|---:|
| Sample requests / successful samples | 16 / 16 | 16 / 16 |
| Final adjacent intervals | 15 | 15 |
| Evaluated pair fits per radius | 21 | 15 |
| Wide contained intervals | 7 / 15 | 9 / 15 |
| Wide contained requested time | 5.0 / 9 s (55.56%) | 5.4 / 9 s (60.00%) |
| Wide contained actual presented time | 4.966 / 9 s (55.18%) | 5.4 / 9 s (60.00%) |
| Narrow contained requested time | 2.5 / 9 s (27.78%) | 3.0 / 9 s (33.33%) |
| Wide time-weighted zero-shift residual | 27.0405 levels | 26.2574 levels |
| Wide time-weighted fitted residual | 21.2177 levels | 21.4904 levels |
| Narrow time-weighted fitted residual | 23.1710 levels | 22.5825 levels |

Containment means every retained minimizing image shift lies strictly inside the finite search. It is not physical tracking accuracy. Requested-time coverage uses the fixed nine-second span as its denominator, so unavailable intervals could not disappear from the measure. Actual-time coverage is reported separately.

The adaptive wide residual is slightly lower, but that is a different objective and does not rescue the failed containment comparison. Narrow containment and fitted residual are both worse. A lower residual is not evidence of a correctly identified action or camera transform.

The spatial comparison is controlled within each radius: 12,464 reference pixels at radius 4 and 7,424 at radius 16. Both schedules use the same supports. Cross-radius scores are not a controlled accuracy comparison. The four common requested instants, 0.1, 3.1, 6.1 and 9.1 seconds, have identical actual presentation times and sample hashes between schedules.

## Work and source accounting

Adaptive acquisition took 4.146 seconds versus 4.048 seconds for uniform in this run. Wide fitting took 1.174 versus 0.840 seconds, and narrow fitting 0.231 versus 0.130 seconds. These are observed browser wall times, not an isolated performance benchmark. The exact structural cost is 21 versus 15 pair fits per radius.

The input is the already examined Aerra Carnicom scissors demonstration, CC BY-SA 4.0, not an independent held-back source. Exact original bytes, declared source hash, maintained source-file hashes, all actual timestamps, sample hashes, all original parents, every midpoint, all final intervals, all fits and residual-region ledgers are retained in `receipt.json.gz`. No source imagery is committed. Attribution and the unchanged acquisition rule are in `PROTOCOL.md`.

Maintained source: `ad218f4d4f390e1d817b132e4c06c45ab2d9628b`. Frozen protocol SHA256: `2219a2996c0efc5420bc6ef5936301cd13ea41d058a055a345336333bb476870`. Executed runner SHA256: `7a6586980dbe14b34021996991cb45355243d73040f26912fe861a1655039aac`. Uncompressed receipt: 4,352,247 bytes, SHA256 `3bf32fdc8d91ad5f5e828f49b07763fa36683e811584b4c002832e6627c32e68`.

An independent audit recomputed the selected parents, exact midpoint times, complete final adjacency, unchanged cached parents, full nine-second denominator, requested and actual coverage, same-support residual means, and pair-fit counts. It did not independently decode the source video; that distinction remains explicit.

## Reproduce and inspect

`python3 evaluation/boundary-midpoints/audit.py` audits the complete recorded compressed receipt. It checks this frozen recorded course, not a positive outcome. The audit accepts a JSON or gzipped JSON path as an optional argument.

To acquire a new run, fetch the maintained source revision above into a separate directory, obtain the exact original source under its attribution/license, and run:

```sh
PLAYWRIGHT_PATH=/absolute/path/to/playwright node evaluation/boundary-midpoints/run.mjs /absolute/path/to/pinned-tree /absolute/path/to/original.webm /absolute/path/to/new-output
```

The receiving script uses installed `/usr/bin/google-chrome` with its sandbox and the maintained presented-frame sampler. Each new run retains its own actual presentation times; browser presentation scheduling is not replaced with nominal requested times. The complete original ten-sample receiving study remains separate in `evaluation/scissors-appearance/`.

## Engineering decision

Do not promote this one-round boundary-trigger policy. Keep the informative failure and examine the appearance model or a materially different acquisition objective. Additional frames alone do not address multiple independently moving or rotating image regions. Any later policy needs its own frozen procedure and independent source/control qualification.
