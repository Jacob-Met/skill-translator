# From a demonstration to decision practice

In **Demonstration studio**, retain the original moments and save at least one
before/after step. Choose **Practice decisions in a new tab**. Decision practice
receives that authored account and every retained PNG directly; there is no
intermediate file selection. The studio stays open. The practice tab verifies
all image bytes through the existing sequence importer before accepting the
exercise, then starts with the before frame and authored context. After frames
and the author's intended result remain undisplayed until the learner reveals
them.

This is a snapshot of the retained account. Unsaved step or moment drafts must
be resolved first. Changes made while the snapshot is being prepared cancel the
handoff; edits made after it was sent do not modify the separate practice
exercise. Familiarity remains an explicit learner declaration. Opening the
exercise from a studio does not establish that the learner has not seen the
source before.

## Keep and continue the entire practice

Choose **Save complete practice with frames** after retaining response drafts.
The resulting `complete-decision-practice.json` contains the original sequence,
all its original PNGs, authored context and retained practice actions. In a fresh
Decision practice tab, use **Reopen complete practice with its original frames**
to continue from that single file. The importer verifies each PNG and replays the
actions against the exact original account. It does not trust stored findings or
verdicts. A mismatched action source, altered PNG or invalid file leaves the
accepted exercise and its pixels intact.

The existing separate-file workflow remains supported. **Save responses only**
produces the existing decision-practice format; reopen it after loading its
matching saved demonstration. Source-only sequence exports and the practice
reducer are unchanged.

The complete file is bounded at 49 MiB, with the existing 48 MiB sequence,
32 MiB retained PNG and 1 MiB practice limits also enforced independently. These
are file admission limits, not a promise that a browser can handle unlimited
concurrent demonstrations.

## Local transfer and failure behavior

The direct handoff uses a temporary same-origin browser channel with a unique
identifier. It does not upload source bytes, add a service, or create a retained
browser-storage copy. Both tabs close the channel after receiving, refusing,
canceling or timing out. A blocked new tab or unavailable browser channel leaves
the studio's normal export/import route available. An unfinished receiver also
keeps its ordinary file inputs available.

Work remains in the tabs until explicitly downloaded. Closing the tabs without
saving is not a saved practice. Keep the original video separately: complete
practice includes retained PNG evidence and clip metadata, not the video bytes.
Neither the handoff nor the portable account establishes physical task success,
authenticated authorship, a measured teaching benefit or an automatic grade.

## Maintained launch and delivery

This is a source-served Node application. `npm start` runs `node server.mjs` on
loopback (port 8787 by default, or `PORT`); there is no separate production build
or package script. Deliver the maintained source tree, including its `src/`,
`web/`, `native/` and `vendor/` dependencies. This increment adds
`web/decision-handoff.mjs` and `web/decision-practice-input.mjs`, with explicit
JavaScript routes in `server.mjs`; neither file is an optional test asset. Verify
the launch and the exact served bytes for both modules as well as the studio and
practice pages. No browser dependency install is required for product use.

## Receiving

`tools/browser-decision-handoff.mjs` exercises the maintained server and studio:
an actual encoded authored video, original presented-frame capture, two authored
steps, direct practice, prediction/reveal/self-comparison, complete Chrome
download and fresh 390px reopening. It also checks existing separate-file
reopening, rejected PNG/account replacements, a blocked popup and a source edit
during PNG preparation. The course records source hashes, screenshots, browser
errors and external requests. Its synthetic frames are software controls, not
expert demonstration or learner-performance evidence.

Run with existing Puppeteer, Chrome and ffmpeg:

```sh
PUPPETEER_PATH=/path/to/puppeteer \
CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/path/to/receiving \
node tools/browser-decision-handoff.mjs
```

The existing `tools/browser-decision-practice.mjs` remains an independent
separate-file regression course. Run the applicable native and server checks on
the exact composed source as part of integration.
