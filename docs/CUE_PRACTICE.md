# Request a supplied cue before deciding

Cue Request Practice provides selective information seeking during a retained
source exercise. Open the original demonstration and inspect its before frame.
You may ask for the author's supplied sensory cue or recovery cue before retaining
your first prediction, or request it afterward. Each cue can be requested once per
step before the full outcome reveal. An unanswered cue remains **not supplied —
unknown**; no sensation, force or contact is manufactured from the image.

The after frame and intended result remain undisplayed until full reveal. The
requested authored text can itself mention an outcome, so a request is explicitly
recorded as assistance. Its timing relative to the first submitted prediction and
whether any source text was available are derived from raw actions and the exact
retained source. An unsubmitted prediction draft survives a request. The first
submitted prediction cannot be rewritten after seeing the cue.

Continue with the maintained full reveal, self-comparison, evidence-linked
reconsideration and remaining question. Source authorship and prior familiarity
remain supplied declarations; the system does not authenticate them, grade the
learner, or establish learning or physical competence.

The separate `skill-translator.cue-practice/v1` file preserves selective requests
alongside the ordinary actions. It is not interchangeable with ordinary decision
practice, whose format cannot represent this assistance chronology. Keep the
original PNG demonstration to reopen it. Changed source notes or image identity
refuse the old exercise; saved claimed cue content and assistance flags are never
trusted. Up to 24 selected steps and 144 raw actions are admitted, with a 2 MiB
practice-file limit. Original source limits remain unchanged.

`node test/cue-practice.test.mjs` exercises source-bound selective disclosure,
missing notes, first-response custody, timing, refusal, replay and full lesson
capacity. `PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-cue-practice.mjs`
receives actual authored PNGs, requests a cue by keyboard while retaining a draft,
checks undisplayed outcome and truthful assistance, reads a completed Chrome
download, reopens at 390px, and challenges forged/source-changed/stale imports.
Actual receiving results are recorded separately from these definitions.
