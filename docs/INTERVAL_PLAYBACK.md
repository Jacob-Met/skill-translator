# View the original matched action intervals

After opening a timing comparison at /path-timing, expand your investigation with the optional original-clip panel. Pair the original MP4 or WebM for each source. The maintained local video loader checks the complete file digest, supported type, size and decoded duration against that source's retained clip identity. Renaming identical bytes with a supported clip type is allowed. A different or malformed clip leaves the previously accepted clip and comparison intact.

Choose one of the already declared interval correspondences. Each side has its own **Play selected interval at 1×** and **Stop interval** control. The selected video seeks to its retained start time and plays its encoded timeline at rate one. The first and last timestamps actually reported through the browser's presented-frame callback remain visible, along with offsets from the requested boundaries. Playback pauses at the first reported frame at or after the selected endpoint. If the source ends first, that is reported separately.

Two independent decoders do not establish synchronized playback. A low frame rate, seek behavior or presentation scheduling can produce a start or end offset. The displayed values are decoder observations, not a guarantee that every intervening frame was viewed. A clip encoded in slow motion or otherwise retimed does not establish physical real-time at 1×. These observations do not score technique, efficiency, task success or physical skill.

Native video controls remain available outside managed interval viewing. When they play or seek through the clip, the panel labels that mode; the declared comparison intervals and their calculations stay unchanged. Changing the selected interval, accepting a changed comparison, or leaving the page stops retired managed playback. A late clip decode cannot replace the currently accepted source. Failure to pair a clip does not prevent use of the retained-frame timing comparison.

## Source and saving

Original clips stay local and are not copied into the comparison export. Saving still retains the complete original sampled-path bundles, PNG frames and declared interval correspondences from the maintained timing workflow. Viewing a clip does not rewrite those sources or add inferred motion. Reopen the comparison and pair its original clips again when needed.

The feature reuses loadLocalVideo, releaseVideo and assertSequenceClip from their maintained source owners. It adds bounded interval playback and its consumer; it does not replace clip acquisition, visual scanning, correspondence annotation, geometric path comparison or cue practice.

## Verification

The native interval-playback tests exercise requested-versus-presented offsets, seeking, end-of-source distinction, cancellation, retired callbacks, an observer-triggered abort, invalid timestamps, invalid ranges and rejected playback. They use controlled video stand-ins and do not qualify a browser decoder.

tools/browser-interval-playback.mjs creates original four-frame clips with the maintained FFmpeg fixture approach at two encoded frame rates. It captures frames through the maintained actual browser video path, makes calibrated sampled-path accounts, reopens and downloads them through Sampled path, creates a timing comparison and pairs the exact clips. Its controls cover rename receiving, wrong-file preservation, actual presented timestamps, interval changes, native-control mode, unchanged comparison export, retired decode cleanup and a narrow viewport. Run it with the established sandboxed Chrome, Playwright and FFmpeg installation. Authored clips qualify the software receiving path, not physical-skill learning.
