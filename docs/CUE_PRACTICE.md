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

A retained remaining question can continue through **Clarify a retained question**.
Save this cue-practice file and the original demonstration, then load both in the
clarification receiver. The author sees the exact selective assistance before and
after your first answer. Amendment lineage preserves the original cue-practice
format and requests. A clarified retry is a separate empty familiar exercise; it
never replaces or rewrites your original history.

## Bounded replay cost

Cue replay validates the supplied source first, then batches ordinary actions between cue requests. Each cue is derived only after the preceding ordinary history is admitted by the maintained decision-practice reducer. A final ordinary replay admits the remaining history before either a session or findings can be returned. The exported event order, cue format, 144 combined-event bound, and underlying 96 ordinary-event bound are unchanged. This is a replay implementation change, not a change to assistance labels or evidence strength.

`test/cue-practice-batching.test.mjs` compares the new reducer with a test-only pinned copy of the reducer from commit `2dfb8c3eca163fdf06053520ec6b1fb23240155b`. It covers 847 history variants, calibrated source custody, and saturated task and learner text fields across 24 steps and 143 events. Accepted normalized sessions and findings must match exactly; invalid histories must be refused by both. The baseline fixture imports the maintained ordinary reducer and is never served to consumers.

For actual consumer timing, run `BASELINE_DIR=/path/to/complete/2df-source PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/cue-performance node tools/browser-cue-performance.mjs`. The course uses separate unchanged servers and matching ordinary reducer/UI hashes. It alternates three before and three after imports of the same source-bound maximum-history exercise with saturated task and learner text fields. Timing starts at the actual file input change and ends after reopened status and two animation frames. Every run completes a real Chrome download and checks exact history parity. The receipt reports every sample, medians, source hashes, and browser errors. There is no machine-dependent timing assertion. These are authored software controls, not measured learning outcomes or physical execution evidence.

### Actual before/after receiving

The retained [actual Chrome receipt](receipts/cue-batching-e898/actual-browser.json) records the 396,297-byte control with 24 steps and 143 events. Before batching, the three imports took 713.4, 717.1 and 726.7 ms; after batching they took 192.0, 204.5 and 204.9 ms. The median changed from 717.1 to 204.5 ms, a 3.51× ratio on this receiving host. All six completed Chrome downloads matched the normalized session exactly; no browser errors or off-site requests occurred. The ordinary reducer and consumer UI hashes match across versions. The browser retained its sandbox, and no competing browser/native receiving job ran on that host during timing.

The input saturates the main task and learner text fields and the supported step/request history, while retaining the original titles, moment descriptions and source pixels. This is a controlled latency comparison, not a general workload guarantee. Current combined source also passed 493 native tests. Source hashes and individual timing samples are retained so the result can be reproduced and its limits inspected.
