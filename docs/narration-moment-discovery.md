# Find original moments from narration

The demonstration sequence studio can use an existing timed transcript to help you find a moment in the original video before retaining any frames. Open `/sequence`, load the original clip, and expand **Find moments from supplied narration**. Choose a UTF-8 WebVTT file, describe its origin, and pair it with the clip. A transcript can be a human account or an unchanged recognition draft; review its words and timing accordingly.

Search matches literal cue text, ignoring case. Results retain the transcript's cue order and show up to 50 cues per page. Each result shows the original cue interval and its interval after your explicit offset. The offset is added to transcript times: an offset of −1 means a cue beginning at 3 seconds points to 2 seconds in the clip.

Choose **start**, **midpoint**, or **end** to preview that requested time in the existing video player. Inspect the source, enter the moment's label and visible state, and use the studio's existing **Retain this moment** action when you want to keep it. Previewing a cue does not retain a frame, create a step, or produce an automatic clip. Spoken words alone do not establish an observed action or a successful result.

The actual frame presented by the decoder can differ from the requested time. Retained frames continue to carry both the requested time and the observed presentation time, the source clip digest, and the original PNG digest. The existing capture path remains responsible for those records. A candidate before zero or at or beyond the clip's duration is unavailable; the navigator does not move it to a nearby valid time.

## Pairing and replacement

The accepted narration is bound to the current clip identity. A CAPTIONVERSE source SHA-256 declaration must match the original clip. Other supplied transcripts may not declare a source: choosing and describing the correct transcript remains an explicit author decision. Editing transcript, attribution, or offset disables navigation until the new settings are accepted. Discarding a draft restores the previously accepted narration.

Replacing or clearing the clip clears the navigator, including when the newly selected clip contains the same bytes. A transcript read that finishes after replacement cannot populate the new session. Narration controls also respect capture activity, video seeking, and the studio's moment-editing state.

Navigation settings are local to this open studio session. The sequence export continues to contain the original retained frames and authored steps. To keep attributed narration alongside those steps, use the existing `/timed-narration` receiver with the exported sequence and the original transcript; it retains the full transcript and explicit selections in its sidecar.

## Receiving verification

`tools/browser-narration-discovery.mjs` extends the existing CAPTIONVERSE receiving course. It uses the separately fetched, pinned synthetic-speech video and its unchanged ASR VTT from CAPTIONVERSE commit `aedd749b9a8eb43af5be838aa4c438d7772956fd`. It verifies both input hashes, searches the actual recognized cues, previews their midpoints through the navigator, and retains two original frames through the normal studio action. It then checks source and PNG hashes, applies attributed quotations in the maintained narration receiver, and reopens the downloaded sequence in a fresh narrow studio.

The course also checks a wrong source declaration, negative and out-of-range offsets, empty search results, pagination, narrow layout, keyboard activation, and delayed transcript completion after clip replacement. Run it with the same `CAPTIONVERSE_MEDIA_DIR`, `PUPPETEER_PATH`, and `CHROME_BINARY` environment as the existing-ASR course, plus a fresh `QA_OUTPUT` directory. It requires an adequately sandboxed Chromium session and does not fetch models or run ASR.

Executed on Node 22.23.4 with sandboxed Chrome 156: all 667 native tests and eight browser receiving groups passed. Requested cue midpoints 1.15 s and 3.58 s produced original presented frames at 1.125 s and 3.542 s. The saved records retain both times. PNG SHA-256 values were `e0046001fd9fcfe2d470b3c759889a7b06b44addfead52b023c2146888a7827e` and `5a7b1e665f9fa70265bd5c7fcff0ba219e32ef5ead9b4c0859049349d4db1ad3`.

This input is synthetic speech with an existing recognition error. Its receiving evidence concerns working source navigation and preserved original frames and words; it is not evidence of a learned physical skill or a successful real craft demonstration.

## Align an external transcript clock

A constant offset cannot align a transcript whose clock runs at a different rate. Enable optional clock alignment in the existing studio, set the ordinary offset to zero, and supply two corresponding landmarks in increasing order on both timelines. Describe how you identified them. The navigator uses the straight-line mapping through those two points; it does not estimate correspondences or identify physical action onsets.

Supply a third, separate check point and a tolerance in seconds. This point is excluded from the two-anchor calculation. Its signed residual is predicted clip time minus supplied clip time. A residual larger in magnitude than the declared tolerance prevents mapped navigation; it never falls back to the ordinary offset. A passing check establishes consistency only at that supplied point. You may already have used it to choose the anchors, so the application does not claim independent held-out validation. Unmodeled clock jumps, edits and changing drift can still make other times wrong. Zero tolerance is strict on represented floating-point arithmetic; no hidden numerical allowance is added.

Cue intervals extending beyond the fitting landmarks are labeled. Individual requested start/midpoint/end times also report whether they are extrapolated. Out-of-clip requests remain unavailable, without clamping. Preview and original full-frame capture continue through the existing source receiver, retaining both requested and actually presented timestamps.

Save narration and clock declarations to preserve the complete literal transcript, attribution, original clip identity, raw landmarks, separate check and tolerance. Reopen it with the matching original clip; mapping and check are recomputed. The saved record is limited to 2 MiB; the original transcript remains limited to 256 KiB. This navigation record is separate from the sequence bundle and timed-narration quotation sidecar. It does not rescale or rewrite that older sidecar's transcript timestamps. Invalid replacements preserve the accepted navigator; editing clock settings requires explicit pairing, and replacing the clip retires the old navigation.

The authored browser control compares an offset-only request of 2.2 seconds with a two-anchor request of 2.4 seconds. Actual decoder presentation can differ and remains separately recorded. This is a software timing control, not evidence of improved physical skill, valid sensory interpretation or Nebius model execution.

Run the focused and maintained source controls:

    node --test test/narration-clock.test.mjs test/narration-moments.test.mjs test/timed-narration.test.mjs test/demonstration-sequence.test.mjs test/sequence-capture.test.mjs
