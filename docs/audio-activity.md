# Original audio activity into demonstration moments

The optional studio audio navigator connects native decoded source audio to original video context and ordinary frame capture. It proposes activity intervals under fixed energy settings. It does not recognize physical contact, cutting quality, correct force, completion or expertise.

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
