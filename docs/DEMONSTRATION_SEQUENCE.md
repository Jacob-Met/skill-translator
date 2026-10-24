# Demonstration sequences

Open `/sequence` in the maintained local server to preserve an expert's account of
how a task changes over time. Choose a local MP4 or WebM, enter a time or use its playhead, retain meaningful source
moments, then connect a before and after frame with an intended result, visible
change, supplied sensory cue and recovery note. The viewer compares the actual
retained images and keeps incomplete or overlapping descriptions visible.

This adds temporal explanation to the maintained single-frame capture,
calibration and practice work. It reuses the existing video decoder, presented-frame
capture, image admission and frame-origin validators. It does not modify source
capture editing or infer actions, contact, force or successful learning.

## Retained evidence and authored interpretation

Each moment keeps its original clip SHA-256, byte length, media type and duration;
requested seek time; actual `requestVideoFrameCallback` media time; decoded and
display dimensions; and full SHA-256 of the copied PNG. A requested seek is not
substituted for an observed presentation time. The shared decoder may briefly
play muted when an unchanged paused seek supplies no new callback.

Moments are canonically ordered by distinct presented times. New moments can be
inserted earlier in the sequence; malformed saved order is refused. A step must
refer to two retained moments with a positive presented-time interval. Overlapping
step intervals are allowed and reported: descriptions are not automatically
converted into a causal chain. The interval between two retained frames is not a
measurement of exact action onset or completion.

Intent, visible-state descriptions, sensory cues and recovery notes are supplied
by the author. Missing descriptions stay unsupplied; the app does not fabricate
them. Stable moment and step identifiers survive revisions. Deleting a referenced
moment requires revising or deleting its steps first.

## Saving and reopening

The saved `skill-translator.sequence-bundle/v1` JSON includes the normalized
sequence and the exact PNG bytes of every retained frame. The source video is not
embedded. Export hashes the actual PNG bytes it serializes, in addition to
checking their retained metadata. Reopen decodes and independently hashes every
PNG, checks its dimensions and frame binding, validates all source/timing/step
relationships, and recomputes findings. Saved derived findings are ignored.

A saved file can be viewed and its notes edited without the original video.
Choosing the matching original clip enables new captures. A different clip is
refused while the accepted sequence remains. Matching allows a renamed file but
requires identical clip digest, byte length, media type and decoded duration.
Hashes establish consistency with the retained record; they are not signatures
or proof that a supplied PNG was captured from a particular physical event.

Admission is transactional. Failed files or stale reads leave accepted source
frames and notes intact. A newer source operation supersedes the older one;
editing the account while a reopen/capture/save is pending prevents that operation
from replacing or exporting older work. Object URLs are released on rejection,
replacement and ordinary page teardown, while persisted page transitions retain
their source URLs.

## Bounds and local operation

The source clip uses the shared 128 MB / three-hour admission. A sequence admits
at most 12 moments, 24 steps, 32 million cumulative image pixels and 32 MiB of PNG
bytes. Each image also obeys the maintained 12 MiB / 24-megapixel / 8192-side
limits. Saved JSON is bounded at 48 MiB before parsing. Notes have explicit length
limits. These are workload bounds, not measured peak-memory or mobile-performance
guarantees.

The application uses the same local server and strict same-origin script/style
policy as the workbench. No video, image or account is uploaded. Browser Web Crypto
requires HTTPS or localhost. Keep source files and saved accounts in locations
appropriate for their actual rights, consent and privacy.

## Verification

`node test/demonstration-sequence.test.mjs` exercises source/time bindings,
canonical insertion and malformed order, stable transactional editing, invalid
references, explicit overlaps/unknown cues and bounded saved-state admission.

The current-main composition passes 155 native/HTTP cases. The maintained
`tools/browser-sequence.mjs` course passes 13 behavioral groups plus a source-hash
stability guard on actual Chrome 156.0.8078.47: real MP4/WebM decoding, PNG pixel
and digest binding, authored steps, downloads, fresh reopening, wrong-source
refusal, stable edits and delayed-operation supersession. Root inspected desktop
and 390px screenshots; strict CSP, offsite-request and page-error checks pass.
The final authored requests 0.25 and 1.25 seconds presented frames at 0.5 and 1
seconds in this run. Distinct pixel markers independently match the actual
reported times; exact seek landing is not promised.

Run `CHROME_BINARY=/path/to/chrome PLAYWRIGHT_PATH=/path/to/playwright
RECEIPT_DIR=/path/to/receipts node tools/browser-sequence.mjs` (environment
assignments on the same command line). An installed FFmpeg is required only to
create the authored test clips. Source identities, independent review and exact
receiving are in [the verification receipt](receipts/demonstration-sequence-20261024/verification.json). Authored controls establish
software behavior, not expert agreement, physical task success, prospective
transfer, learning, cloud runtime use or deployment.
