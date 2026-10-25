# Question planning with declared availability and effort

The existing cue-combination workspace can now compare questions under explicitly
supplied observation conditions. Open a complete cue study, select **Use declared
cue availability and effort**, then provide availability, a positive integer
relative effort (1–1000), and a basis for every cue. These are declarations about
this investigation, not inferred learner limitations or measured effort.

The unchanged default minimizes question count. The optional planner minimizes
the largest sum of declared effort along a remaining answer branch. It uses the
same original categorical examples and unknown-compatible branches. All
available first questions and their branch witnesses remain inspectable. An
unavailable cue is excluded from future questions; an already recorded reading
remains part of the evidence. Missing decisions, conflicting rows, and necessary
unavailable cues cannot produce a finite distinction claim. A zero result means
only that compatible records share one declared label.

For an authored four-example table, a direct distinguishing cue with effort 9
wins the original count comparison in one question. Two complementary binary
cues costing 2 and 3 instead distinguish all four rows with worst-case effort 5.
If both the direct cue and one necessary binary cue are unavailable, the result
is unresolved. This demonstrates a changed finite-table planning mechanism,
not real task completion or an empirically validated teaching policy.

## Portable assumptions and lifecycle

Saving a custom plan uses `skill-translator.cue-bundle/v2`. It retains the complete
original comparison and PNGs, cue study, readings, and a
`skill-translator.cue-question-plan/v1` declaration. No calculated results are
saved. Reopening validates every cue identity, declared availability, integer
cost and basis before adopting the incoming source. Existing v1 studies remain
supported; saving without custom conditions still produces v1. Older consumers
refuse v2 rather than silently discard the assumptions. A v1 bundle with custom
plan data is refused by this consumer.

Editing source categories resets readings and custom conditions. Editing only
question conditions preserves readings and clears calculated findings. Invalid
incoming plans preserve accepted conditions; pending imports and asynchronous
exports are retired when the user changes conditions or readings. Invalid plan
drafts cannot be exported.

The bounded exact solver reuses the maintained compatible-example/remaining-cue
memoization. Up to eight cues keep accumulated integer effort at most 8000.
Effort is fixed per cue and additive; probabilities, repeated observations,
observation error, actual accessibility, physical safety, and learning benefit
are outside this model. Nebius execution and NVIDIA model use are not established
by this local mechanism.

## Verification

`node test/cue-questions.test.mjs` covers the existing 512 equal-count tables,
1536 independently enumerated weighted/availability tables, cheaper multi-question
routes, unavailable necessary evidence, unknown and novel categories, unchanged
inputs, complete identity admission and invalid declarations.

`PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-cue-effort.mjs`
receives actual authored PNG bundles through the maintained consumer, tests legacy
behavior and source custody, then exercises weighted planning, v2 download/fresh
390px reopen, malformed-plan retention, unavailable-cue refusal and invalid-draft
export. Authored controls do not establish real physical skill or learning.
