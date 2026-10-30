# Keep a separately spoken explanation with an original step

Open **Keep a spoken explanation** from Demonstration studio, or visit
`/spoken-explanations`. This notebook preserves a supplied account beside the
original before/after frames. It does not replace the demonstration's notes.

## Use the notebook

1. Open a complete sequence saved by Demonstration studio. The maintained
   sequence receiver checks every retained PNG against its original identity.
2. Choose the demonstrated step. Inspect its before/after frames and original
   written account. Open a frame in its own tab to inspect the full pixels.
3. Choose a separately supplied local audio file. Preview it, say who supplied
   the explanation and how it was obtained, and optionally add a written
   description. The description helps someone choose what to listen to; it is
   not an automatically generated transcript.
4. Choose **Attach to this step**. A file selection alone does not attach an
   explanation. Select another step to add a separate association. The same
   recording may be explicitly associated with more than one step.
5. Choose **Download explanation notebook**. The complete file contains the
   validated original sequence, every original retained PNG, all attached audio
   bytes, the explicit step associations and supplied attribution/description.
6. Reopen that file under **Continue a saved explanation notebook**. Frame and
   audio identities are checked again before the accepted work is replaced.

Playback starts only when requested. Moving between steps or replacing the
source pauses existing players. There is no synchronization between an
explanation's recording clock and the original demonstration's clip clock.
The original source clip remains external; the notebook retains its existing
sequence metadata and selected PNG frames, not the complete video.

Remove an explanation explicitly to change the current notebook. Removing one
association does not remove a shared recording still used by another step.
You can download a notebook with no explanations, including after removing the
last one. That download keeps the original sequence and PNG frames without
retaining the removed recordings.
Keep an earlier downloaded notebook if you need the earlier account. Nothing is
uploaded or persisted automatically. Attach or discard a current draft before
saving so the download does not silently omit it.

To correct an attached account, choose **Edit text** on its card. Correct who
supplied the explanation and its optional written description, then choose
**Save text**. Attribution must contain text; the description may be empty.
The same explanation, step, original source and recording are retained. The
recording stays available to play while editing, and an unattached audio draft
is kept separately. **Cancel** or Escape discards only the unapplied text
changes. Changing steps also cancels unapplied text changes and shows a notice.

Downloading, attaching another explanation and removing an explanation wait
until you save or cancel the correction. After **Save text**, download the
notebook to keep the corrected account; previously downloaded notebooks still
contain their original text. A rejected correction or failed import preserves
the accepted notebook. A successful import replaces it and closes the editor.

## Supported media and bounds

The browser checks recognized WAV, MP3, Ogg, WebM and MP4/M4A containers and must
be able to load audio data with a finite duration of at most five minutes.
Codec support depends on the receiving browser. Unsupported, malformed or
unknown-duration files are refused without replacing accepted work.

Each file is at most 4 MiB; a notebook retains at most 8 MiB of distinct audio
bytes and 12 explicit explanations. Reusing identical bytes does not multiply
the audio budget. A complete saved notebook is at most 64 MiB. The source
sequence keeps its existing 48 MiB bundle, 32 MiB original-PNG and 32-megapixel
limits. Attribution fits within 240 characters and a description within 1,800
characters; accepted text is trimmed under the same explicit input contract.

The `skill-translator.spoken-explanations/v1` account binds the full validated
original sequence, not just a selected step name or a claimed verification
flag. Every recording has its full SHA-256, byte count, supported media type and
supplied filename. Names are descriptive; renaming identical bytes does not
create a different recording identity. Complete
`skill-translator.spoken-explanation-bundle/v1` files contain each distinct
recording once. Reopening recomputes identities and media admission; export
checks every retained audio and PNG byte again.

Invalid source replacements, invalid complete notebooks and rejected audio
files leave accepted work intact. New source choices, later drafts and changed
inputs retire old asynchronous work. A stale player callback cannot replace
the status of a new source or an import in progress. Failed decoding and
partially admitted bundles release their temporary media resources.

## Meaning of the account

An attachment is the supplier's declaration that an explanation belongs beside
that step. It is separate from observed sound in the original recording. A
statement about resistance is an account of experience, not a force reading.
The notebook does not identify a speaker, verify that a file contains speech,
authenticate expertise, transcribe it, establish causation or measure learning.
Original geometric judgments and learner histories are not changed.

This is separate from **Timed narration**, which receives supplied transcript
text on an explicitly declared clip clock, and from original-clip playback in
learner practice. The separately maintained recording adapter in
[#460](https://github.com/Jacob-Met/skill-translator/issues/460) and
[PR471](https://github.com/Jacob-Met/skill-translator/pull/471) produces an ordinary
local audio File. Its final attachment to this notebook remains with that
outcome's owner. This consumer requests no microphone permission.

## Receiving

Native contract checks:

```sh
node --test test/spoken-explanations.test.mjs test/spoken-explanation-correction.test.mjs
```

The browser course uses actual checked original PNGs, actual tone-file
playback, complete downloads and fresh reopening. It also exercises duplicate
recording custody, malformed and over-capacity media, changed source/audio
bytes, keyboard and 390px layouts, late source/audio/export retirement, and
callbacks from removed players. These authored PNG and tone controls qualify
software behavior; they are not real expert recordings or a learning study.

With a separately installed Playwright module and a sandbox-capable browser:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/tmp/new-spoken-receiving \
node tools/browser-spoken-explanations.mjs

PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/tmp/new-spoken-correction-receiving \
node tools/browser-spoken-explanation-correction.mjs
```

The correction course exercises canceled and invalid text, the unchanged
recording and original-frame bytes after download and reopening, separate audio
drafts, stale editors, import/export races, keyboard focus and a narrow layout.
Its authored tone controls exercise playback and custody; they do not establish
that a recording contains speech or that someone learned from it.

Both browser courses can receive a separately extracted runtime launched with
its maintained `start.sh`. Set `SKILL_RECEIVE_BASE_URL` to its printed HTTP
`127.0.0.1` origin, `SKILL_RECEIVE_ROOT` to the extracted application directory,
and `SKILL_RECEIVE_COMMIT` to the independently expected full source commit.
They check the exact manifested files and served routes before opening the
browser; failed external receiving never falls back to a source server. Keep
`QA_OUTPUT` outside the extracted runtime so evidence does not alter its inventory.

The course requires a new output directory, retains partial results if a check
fails, launches Chromium with its sandbox enabled, and closes only its owned
browser and server. It preserves the app's CSP. A second, explicitly scoped
same-origin stylesheet supplies the wide-source visual comparison; the shipped
layout keeps the original step and spoken account beside one another.
