# Original audio activity into demonstration moments

The optional studio audio navigator connects native decoded source audio to original video context and ordinary frame capture. It proposes activity intervals under fixed energy settings. It does not recognize physical contact, cutting quality, correct force, completion or expertise.

## Prepare directly from the selected original

Choose an original MP4/WebM in Demonstration studio, then open **Find audible
activity in the original clip** and choose **Prepare audio from this original
clip**. The existing native FFmpeg producer receives those exact bytes through
the local application server. A sole audio stream is selected automatically.
For several audio streams, choose the displayed original stream index and
prepare again. A video without audio remains explicitly unavailable. Existing
report-file import remains supported.

The original hash is checked before and after preparation. Complete decoded PCM,
original integer timestamps, gaps, native commands and decoder provenance are
retained and recomputed in the browser. No browser Web Audio approximation is
substituted. The browser media-origin declaration is still required; re-preparing
the same original retains an already applied declaration, while a draft remains
unpaired. Use the existing candidate, playback, preview, frame capture and full
navigation saving workflow. Cancel native preparation without discarding an
accepted navigation. Replacing the clip or importing another report retires late
native responses.

The local server needs FFmpeg and FFprobe. Preparation admits one request at a
time, bounds the original at 128 MiB and the complete report at 48 MiB, and
cancels after 90 seconds. The maintained 60-second decoded-audio, mono/stereo,
sample-rate and timestamp limits still apply. Temporary originals are removed
when native work completes, fails or is cancelled.

Upload decoding uses explicit container profiles, never automatic playlist
probing: signature-selected MP4/MOV, Matroska/WebM and RIFF-WAVE; the browser
itself still chooses MP4/WebM. Every probe/decode restricts input protocols to
local files, and MOV external data references are disabled. The admitted MP4
structure additionally refuses external data-reference entries and compressed
movie metadata. Unsupported containers remain unavailable, not silently
converted. Requests require a trusted loopback Host and matching Origin. These
are bounded input-profile controls, not a qualification of every container or
decoder version. The earlier owned HLS negative was already refused by its
nonstandard temporary suffix; no successful external-read exploit was observed.

Native verification: `node --test --test-isolation=none
test/audio-input-profile.test.mjs test/audio-intake.test.mjs`. The request-handler
test is an in-process stream harness; actual HTTP, playback and desktop/390px
receiving belong to the maintained `test/audio-activity-browser.mjs` course.

## Prepare and use

Run the maintained native producer with FFmpeg and FFprobe installed:

    node tools/prepare-audio-activity.mjs original.mp4 --stream 1 --out new-audio-report

The stream number is the absolute original stream index, explicitly selected by the operator. The producer requires a new output directory. It retains `audio-activity.json`, recomputed `analysis.json` and `decode.log`. Keep the original media separately.

In Demonstration studio, pair the exact original MP4/WebM and open **Find audible activity in the original clip**. Load the native report, explicitly declare the container time corresponding to browser media time zero and describe its basis. The first decoded audio timestamp is not automatically the media origin. Choose an activity, optionally enable original audio and play its complete interval, or preview its onset. Retain and describe the actual original frame through the ordinary studio controls; author the step separately.

Save audio navigation separately from the demonstration bundle. Reopening requires the exact original clip and recomputes activity from retained PCM and timestamps. The sequence continues to retain its actual PNGs and requested/presented frame times through the existing format.

## Timing and complete evidence

The native producer retains original decoded-frame integer PTS and rational stream time base. Packed float conversion is reconciled frame-by-frame with FFmpeg's filter ledger and the full PCM byte count. Rescaling error is retained and limited to half a sample. No resampling, downmixing, normalization or silence insertion is requested. Original and filter channel-layout metadata remain distinct; unreported original layout is not upgraded to known.

The initial profile admits mono/stereo, sample rates 8000–96000 divisible by 50, at most 60 seconds of decoded audio, 8 million channel samples, 20000 frames and 128 MiB original files. It refuses timestamp overlap/backtracking and unsupported decoder correspondence. Positive gaps remain missing coverage; analysis never bridges them. Incomplete trailing windows remain explicit. This can refuse a container whose timestamp resolution cannot express contiguous sample boundaries; it does not repair that clock silently.

Every complete 20 ms window retains each channel's RMS and their maximum. Enter at RMS >= 0.05; remain active until RMS < 0.025; retain runs of at least two windows. Windows below the entry threshold may extend an existing run under this hysteresis rule. A below-exit window is excluded and closes the run. Complete windows restart at every contiguous coverage segment. All qualifying runs remain, including sustained sound or speech. No candidate is automatically a meaningful task event.

Original clip and supplied PCM hashes are verified. Browser analysis recomputes the supplied native artifact; it does not independently prove that its PCM was decoded truthfully from that clip. Reproduction requires the original file, recorded native commands and implementations. The explicit media-origin declaration remains a declaration. Whole intervals outside the paired clip are unavailable, never silently trimmed.

## Receiving and limits

    node --test test/audio-activity.test.mjs
    node tools/receive-audio-activity.mjs /new/receiving/path

The native course freezes settings before held-back shifted, quiet, short and opposite-phase controls. It retains all candidates and all authored labels, including quiet/short misses, alongside a uniform video-time sampling baseline. Moving silence and stationary sound distinguish this mechanism from visual change. The gap course requires a real decoded timestamp gap and verifies that no activity bridges it.

Browser receiving measures decoded Web Audio energy against actual video.currentTime, preserving callbacks and the predeclared observation tolerance. It then exercises original playback, actual frame capture, authored step export, saved navigation, wrong-source refusal and lifecycle changes. This is not a human listening study or sample-exact audio-clock proof.

The initial media are explicitly authored signal and moving-pattern controls. Permitted real task recordings, independently labeled events, physical understanding, teaching benefit and Nebius execution remain separate evidence claims. No such result follows from this implementation alone.

## Compare quieter changes with segment-relative energy

After pairing the native report and its explicit media origin, choose **Relative
to this segment’s background** in **Candidate method**. The fixed full-scale
method remains the default and its original candidates are unchanged. The
relative method can expose a quiet burst beside a quieter background, or a
change in one channel beside steady sound in the other. Choose its original
interval for the same playback, onset preview and ordinary frame capture.

For each contiguous decoded segment with at least 25 complete 20 ms windows,
the background of each channel is its sorted RMS at index
`floor(0.2 * (windowCount - 1))`. Entry requires any channel to reach the larger
of four times its background and RMS 0.001. An open candidate continues while
any channel reaches the larger of twice its background and RMS 0.0005. At least
two windows are required. The selected candidate shows its per-channel
background, entry and exit levels. Segments with fewer than 25 windows are
explicitly unavailable for this method. Original gaps and partial tails retain
the same treatment as fixed energy; candidates never bridge gaps.

These levels are source-relative energy assumptions, not a measured noise floor
or confidence estimate. Sustained sound can become its own background and have
no relative candidate. Slow gain changes can produce candidates; very quiet or
one-window events can remain absent. Quiet input is never normalized, and
channels are never mixed. Use both methods and inspect the original context.

Saved navigation still contains the complete original report and clock
declaration, with no derived candidate authority or new source format. Fresh
reopening recomputes both methods and initially selects fixed energy; method
selection is a view choice. Switching methods cancels ongoing interval playback.

Run `node --test --test-isolation=none test/audio-activity.test.mjs
test/audio-contrast.test.mjs` for the original and contrast controls. Run
`node tools/receive-audio-contrast.mjs NEW_DIRECTORY` for the independently
seeded native-decoded sine/noise course. Its complete original WAVs, reports,
predeclared specifications and results include adverse controls. These authored
signals do not establish real-task event accuracy, human audibility or teaching
benefit.
