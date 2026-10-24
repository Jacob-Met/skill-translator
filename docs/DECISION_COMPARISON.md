# Compare demonstrated decision cues

Open **Compare decision cues** from Demonstration Sequence, or `/decision-comparison`.
Add two to six saved sequence bundles containing their original retained PNG frames.
For each example, explicitly select the step you intend to compare. The receiver
checks original frame bytes through the maintained sequence admission and shows
before/after states, source timestamps and image identities alongside each author's
intended result, visible change, sensory cue and recovery cue.

Missing text is **not supplied — unknown**, including cues a camera cannot reveal.
The app does not infer that matching words mean matching physical conditions, or
that differing words establish differing strategies. Context and all original
accounts remain independently inspectable. Matching steps is the user's declaration;
no automatic correspondence or semantic judgment is performed.

Record a shared, different, mixed or unresolved relationship with your explanation.
A non-unresolved declaration requires explanatory text. This is a separately authored
interpretation; it does not overwrite any source account or establish an invariant.
Save the complete comparison to retain all original sources, selected correspondences
and the interpretation. Reopening verifies the frames and rebuilds the comparison;
malformed or superseded reads preserve the accepted work. The combined sources are
bounded to 32 MiB of PNG data and 32 megapixels, with a 48 MiB JSON export limit.
Saving or rehearsing a comparison refuses duplicate copies of the same clip/step as independent evidence; select distinct source steps first.

To rehearse a selected example, save its original source bundle and its selected
practice file. Open Decision Practice, load that source, then load the practice file.
The new rehearsal retains exactly the selected original step, no responses, and
**seen-before** familiarity because the comparison already exposed the authored
account. Existing learner history is not imported, merged or graded. The source
remains unchanged.

## Verification

`node test/decision-comparison.test.mjs` exercises distinct and missing cues,
unchanged source custody, raw replay, invalid or duplicate correspondence, source
changes, six-example capacity, discarded claimed conclusions and rehearsal familiarity.

`PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome QA_OUTPUT=/tmp/decision-comparison node tools/browser-decision-comparison.mjs`
runs the actual browser receiver against authored original PNG controls, raw
save/reopen, 390px layout, selected rehearsal export, refusal and delayed-read controls.
Execution results must be recorded separately; the presence of this script is not
an assertion that a browser run passed.

This comparison preserves inspectable demonstrated accounts. It does not validate
expert claims, authenticity of supplied context, physical causation, mastery,
learning efficacy, or successful transfer to another tool or material.
