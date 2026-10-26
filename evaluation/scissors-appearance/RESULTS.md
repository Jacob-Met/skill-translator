# Original scissors appearance receiving — results

## Source and protocol

The frozen protocol in PROTOCOL.md requested ten samples from 0.1 through 9.1 seconds, retaining all nine adjacent intervals. The acquired original source was Aerra Carnicom’s *Aerra’s Films of the Ordinary IV — Scissors Cutting Card Stock.webm*, CC BY-SA 4.0, 1,006,547 bytes; SHA256 `06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe`. Source and attribution: https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm; license: https://creativecommons.org/licenses/by-sa/4.0/. No protocol parameters were retuned.

The maintained original-source browser run passed with no page errors. It rendered both original sample coordinate systems at desktop and 390 px and captured/reopened original 1920×1080 PNG moments with matching hashes. These checks establish the receiving journey, not physical or action accuracy.

## Complete interval census

Scores are mean absolute RGB residuals in 0–255 channel levels. Each baseline is the zero-translation, brightness-adjusted candidate on the SAME radius-specific interior. Cross-radius values use different supports. Coordinates/shifts are in the original 160×90 sample grid.

|Index|Requested seconds|Presented seconds|±4 baseline→fit|±16 baseline→fit|Wide shift|Wide boundary?|Wide changed /7424|
|---:|---|---|---:|---:|---|---|---:|
|0|0.1→1.1|0.112→1.112|0.8601→0.8601|0.9192→0.9192|(0,0)|No|0 / 0.00%|
|1|1.1→2.1|1.112→2.112|28.1183→27.2676|29.8449→20.1137|(16,16)|Yes|2537 / 34.17%|
|2|2.1→3.1|2.112→3.112|45.7567→44.3097|53.9402→41.8164|(-16,16)|Yes|5537 / 74.58%|
|3|3.1→4.1|3.112→4.112|50.1826→48.9260|54.5237→50.7390|(15,-16)|Yes|6360 / 85.67%|
|4|4.1→5.1|4.112→5.078|42.0329→40.2417|46.9198→34.1881|(16,16)|Yes|4848 / 65.30%|
|5|5.1→6.1|5.078→6.112|36.8212→34.2502|44.6430→34.4625|(16,5)|Yes|3902 / 52.56%|
|6|6.1→7.1|6.112→7.112|17.0064→16.3722|22.0714→20.7821|(-2,1)|No|2869 / 38.64%|
|7|7.1→8.1|7.112→8.112|29.1642→26.8982|35.5619→28.8871|(-16,-2)|Yes|3017 / 40.64%|
|8|8.1→9.1|8.112→9.112|14.5200→13.7444|15.5497→13.2956|(-7,5)|No|2446 / 32.95%|

All ten requests produced samples and all nine intervals were compared. Presented times strictly increase. The 5.1 second request presented 5.078, giving adjacent elapsed intervals 0.966 and 1.034 seconds; all others span 1 second. No unavailable or duplicate-time interval was substituted with zero. All 18 radius-specific fits have one minimizing shift, so every-fit and some-fit masks coincide on this source.

## What the fitting changes

Across all nine intervals, the±4 same-interior baseline averages 29.3847 levels and the fit 28.0967 levels, a 4.383% pooled reduction. Its fit hits a search boundary 7/9 times. The±16 same-interior baseline averages 33.7749 levels and the fit 27.2449 levels, a 19.334% pooled reduction, with 6/9 boundary hits. The zero shift is among the candidates, so a non-increasing optimized score is expected by construction; improvement alone does not validate a camera-motion interpretation.

The source capture is 1920×1080 while comparison samples are 160×90, one-twelfth the dimension per axis. The reduced image does not retain native-resolution detail. Narrow support 152×82=12,464 pixels covers 86.56% of the 14,400 pixel sample. Wide support 128×58=7,424 pixels covers 51.56%, omitting 6,976 sample pixels(48.44%). These different supports prevent interpreting lower wide scores as a controlled cross-radius improvement.

## Residual regions and limits

Wide residual masks remain broad: intervals 2 and 3 have largest-component bounds[16,16,144,74], the entire wide reference interior. Largest-component shares of changed pixels in intervals 2–7 are 95.72%,99.98%,96.23%,94.80%,93.83%,90.26%. This is not compact localization of a cutting event. The fixed illustration is interval 3, selected after the complete census by highest original unaligned brightness-adjusted mean change. It contains 6,360 changed pixels: one accepted 6,359 pixel region and one excluded single pixel. Its largest later-image bounds[31,0,159,58] correctly retain later-image coordinates.

Interval 0 has zero pixels above the fixed 16 level residual-channel threshold but a positive 0.9192 level mean fitted residual. Zero thresholded components is not identical images. Region acceptance uses the fixed 4 pixel minimum; excluded components remain counted. No action/contact/cut-completion labels, physical correspondences, segmentation ground truth or skill-understanding accuracy are established.

## Implication for a separate sampling experiment

The six boundary hits motivate testing shorter acquisition gaps, not a claim that translation is the true cause. This fixed census must remain unchanged. Refining all six wide-boundary parent intervals adds six samples:16 total and 15 final intervals. Reusing prior fits still spends 9 parent+12 child=21 wide pair fits, versus 15 for uniform 16 sampling. Thus the two schedules can match sample/decode budget without matching fitting-compute budget. Report both denominators, retired parent intervals and actual presented times; keep any duplicate/unavailable child results. Root owns any separate midpoint experiment.

This report is derived from the complete recorded receipt and the unchanged PROTOCOL.md; no additional demonstration was counted.

## Exact source and reproduction

The executed maintained revision is `ad218f4d4f390e1d817b132e4c06c45ab2d9628b`. The complete receipt is preserved as `receipt.json.gz`, including every original sample hash/time, both full fit accounts, all region bounds, original capture metadata and receiving checks. Its uncompressed size is 908,400 bytes and SHA256 is `3b41f910f978696f2b1e15fc3132817c019f527f5082a3f40e41ff1f7044f0d1`. Source media and captured PNG imagery are not committed.

Fetch the exact maintained revision into a separate directory, obtain the credited original source, and run:

```sh
PLAYWRIGHT_PATH=/absolute/path/to/playwright node evaluation/scissors-appearance/receive-original-scissors.mjs /absolute/path/to/pinned-tree /absolute/path/to/original.webm /absolute/path/to/new-output
```

The receiver uses installed `/usr/bin/google-chrome` with its sandbox. It checks exact original bytes before decoding, keeps the full fixed census, renders both coordinate systems, captures original-resolution moments and exercises real download/fresh reopen. Actual presentation times from a new run remain explicit rather than being replaced with requested times. Decompress the recorded receipt with standard gzip tools or Python's `gzip` module. The separate midpoint development experiment does not alter this original study or establish an independently held-back demonstration.
