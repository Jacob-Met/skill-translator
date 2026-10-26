# Stationary-reference calibration drafts

Capture (`/capture`) can propose four corners for another original PNG of the
same flat workpiece. Load a calibrated reference task and its matching PNG,
select 2–8 nonoverlapping textured patches fixed relative to that workpiece,
explain that declaration, and request a draft. Matching reuses the four existing
reference corners and physical dimensions. A succeeding target needs no fresh
corner placement before review; the reference patches can remain selected for
successive target PNGs.

The target corner fields remain editable. Existing **Apply calibration** applies
the reviewed mapping, preserving target marks in their original pixel coordinates.
No task point, relationship meaning, scale measurement or physical success is
inferred. Export remains unavailable while a calibration draft is pending.

## Maintained mechanism and custody

The vendor file is byte-identical to MICROVERSE `calibration/fiducials.py` at
commit `b762d8c26db6b314c612cbb53a14e7cb165a7c3f`, Git blob
`5346e1988f8f144b4fe88e1876e5418913d54b4e`, SHA-256
`b7c8728e5fefafb7e10ebe4e05e2c65dbce299b01d2f7234517e5e3f4f750743`.
Only `register` is consumed; MICROVERSE's encounter-stage application is unused.
The adapter checks these bytes before execution. Defaults remain unchanged:
16-pixel search, score .85, distinct-peak margin .08, maximum independent-patch
disagreement 1.5 pixels. Thresholds cannot be tuned through this consumer.

The same-origin local native service checks both original PNG hashes, equal
dimensions (16–8192 per side, at most 16 million pixels per image), 12 MiB per
original, unchanged 8-bit decode, and opacity over the **entire** image. PNG EXIF
and animation are refused so browser and native coordinates cannot silently
diverge. Grayscale samples stay unchanged; opaque color is converted with
OpenCV BGR-to-gray. There is no resizing, source cropping, background fill, or
fallback to zero after failed registration. Patches are matching regions within
the original image; source corners remain in full original coordinates.

The service admits one bounded request at a time and kills work after 15 seconds.
It requires Python with NumPy and OpenCV. `SKILL_CALIBRATION_PYTHON` selects that
interpreter; standard Python dependency discovery applies. A missing dependency
is a visible refusal, leaving manual Capture usable. The tested native profile
is Python 3.12, NumPy 2.3.5 and opencv-python-headless 5.0.0.93 (OpenCV 5.0.0).
Pillow is not required. No dependency installer runs in the product flow.

## Limits and evidence

Template matches use integer offsets. The coordinate-wise median across patches
can be half-integral; it is still not a subpixel image estimator. A seeded control
with a true quarter-pixel shift was accepted as zero. Another control moved both
declared stationary patches together while leaving the background still: matching
accepted their common 7-pixel movement. Agreement cannot verify the user's
stationarity declaration. Rotation, deformation, parallax, changed physical scale,
occlusion, repetitive texture, and blur can invalidate or prevent a draft.
Scores are not calibrated probabilities and this is not certified calibration.

Applied tasks retain the target original identity, the reference source calibration,
declaration, native report, and original proposed corners in
`source.calibrationDraftEvidence`. Final edited corners remain separately in
`source.corners`. Existing raw task export/reopen preserves this supporting
provenance; it does not rerun matching or authenticate imported reports. A fresh
proposal always reprocesses both original PNGs. Changing current source, reference
files, patches, declaration, or calibration edits retires pending native responses.

## Receiving

Run `python test/calibration-translation-native.py` using the qualified native
dependencies, then `node test/calibration-draft.test.mjs` directly. The former
generates authored original-PNG controls in `test/calibration-fixtures` for the
latter and the browser course. These controls establish mechanism behavior, not
an observed physical demonstration or measured real-world accuracy.

`tools/browser-calibration-draft.mjs` starts the maintained server and uses its
actual native route. It requires `PLAYWRIGHT_PATH`, `CHROME_BINARY`, and a fresh
`RECEIPT_DIR`. Chromium launches with its sandbox enabled; namespace, seccomp and
TSYNC must pass the maintained sandbox preflight before product navigation. The
course checks source-bound corner proposals, manual correction, existing target
marks, actual download and fresh-page reopen, stale native response retirement,
refusal, and narrow keyboard access. Source hashes and screenshots accompany the
receipt. A browser run cannot be substituted by direct module tests.

Qualified receiving for the frozen candidate composed on
`9196d97972c502ca775ff80b36ae267570cb2100`: eight actual native groups, five
direct JavaScript groups, and four actual maintained-server/browser groups passed.
The receiving host used Python 3.12.3, OpenCV 5.0.0 (distribution 5.0.0.93),
NumPy 2.3.5, Node 22 and sandboxed Chrome 156. Desktop and 390-pixel screenshots
were independently inspected; the browser course recorded no errors. Root-held
browser log SHA-256:
`ad43e7328cfc31ca46c713e0d3a4dc60868c9ee5231bef1cba7e9d2a523f9a49`.
Independent SECOND GROUND review found no blocker and reran all five direct
JavaScript groups. These authored controls do not establish physical accuracy.
