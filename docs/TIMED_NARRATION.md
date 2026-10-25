# Bring a spoken account beside a demonstrated change

Open **Inspect supplied narration** from the demonstration studio, or `/timed-narration`.

1. Open the original saved sequence. Its embedded PNG files are checked by the maintained sequence receiver.
2. Choose an appropriately sourced WebVTT transcript and describe who supplied it and how it was obtained. This feature accepts supplied text; it does not record, transcribe or verify speech.
3. Declare the offset added to transcript timestamps to place them on the clip timeline. Zero is an explicit unchanged timeline. Pair the account.
4. Choose an authored step. Inspect its original before/after frames, original notes, and every transcript cue that overlaps the half-open interval from the before frame to the after frame. A cue spanning two steps appears in both. An empty interval remains empty.
5. Explicitly select the quoted cues and the account field they belong in. Retain the selection. The proposed account appends attributed quotations to the original notes; it does not replace them or infer a cue category.
6. Save the narration record and the separate narrated sequence. Keep the original sequence too. The narrated sequence reopens through the ordinary studio and can serve existing decision practice. The narration record requires the unchanged original sequence to reopen.

The narration record retains the exact supplied transcript, attribution, original validated sequence, declared offset and explicit selections. Reopening reparses the original text and recomputes the account; saved results are not trusted. The separate sequence carries the attributed quotations as authored notes. The complete narration sidecar remains necessary to inspect unused cues and the full transcript.

## Supported input and limits

Use a UTF-8 WebVTT file up to 256 KiB, with a WEBVTT header, blank line and timed cues. Malformed UTF-8 is refused without replacement characters. Timestamps use `HH:MM:SS.mmm` or `MM:SS.mmm`. Cue starts must be ordered; overlaps and equal starts are supported. Up to 1000 cues, 2000 characters per cue and six-hour transcript timestamps are accepted. The sequence clip retains its existing three-hour limit. The explicit offset is within ±three hours. Cues extending outside the clip are reported, never silently clipped.

NOTE blocks are retained in the original transcript but are not speech cues. Cue identifiers and original payload text remain inspectable. Voice tags, markup and entities are displayed literally through text nodes, never interpreted as HTML. Cue display-position settings are not applied. STYLE, REGION and timestamp-map blocks are refused because this receiver does not implement their semantics. Unsupported input leaves the accepted account intact.

Keep at most 48 step/field selections, each with 1–20 distinct overlapping cues. A field receives one retained selection that can be revised or cleared. The maintained 1800-character authored-field limit still applies; an overlong combination is refused without truncating words or replacing the old selection. Split or shorten the source account deliberately in its native studio when needed. Narration sidecars have a 4 MiB save/reopen limit.

Changes to transcript settings require pairing again, which starts new explicit selections. A delayed import cannot overwrite a newer input edit. No data is uploaded or persisted automatically.

## What the account establishes

Pairing is the user's declaration that the transcript belongs to the selected demonstration. Time overlap does not establish what a speaker meant, that the transcript is accurate, or that the words describe the action on screen. A statement about resistance remains testimony; it is not a force measurement. This feature does not establish expertise, causation, a safe physical action or a learning effect.

The initial evaluation input is an authored multi-speaker fold/tension account with overlapping speech, a cue spanning two steps, an unrelated later passage and a silent step. Its source images are authored raster controls, not observed craft work or a real expert study.

## Verification

Native: `node --test test/timed-narration.test.mjs`.

Actual browser receiver, with separately available Puppeteer and Chrome:

    PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/narration-qa node tools/browser-timed-narration.mjs

The browser course exercises original PNG validation, literal speaker text, keyboard selection, real source/sidecar downloads, fresh narrow reopening, maintained studio receiving, offsets and silence, invalid-source rollback and delayed-read protection. A course's presence is not a claim it has passed; use the integration receipt for executed evidence.

Subtitle admission reuses pinned CAPTIONVERSE. Recognized local-ASR and reviewed-WebVTT source declarations must match the demonstration clip digest; malformed or duplicate declarations are refused. An ordinary third-party transcript still requires explicit user association. A matching declaration is not authenticated model execution or transcript accuracy.
