# Decision practice from retained demonstrations

Open `/decision-practice` and import a demonstration exported by the maintained
Demonstration Studio. The page reuses its sequence and image admission rather
than implementing another capture or annotation editor. Original retained PNG
bytes are checked before an accepted exercise is replaced.

Each authored step starts with its title, before frame and supplied before-state
note. Describe an expected visible change, a cue for judging the situation, and a
reason to pause or reconsider. You can leave parts unanswered and explicitly
declare uncertainty. Submitting retains that first response; it is not silently
rewritten after the author’s account becomes visible.

An explicit reveal displays the retained after frame, intended result, visible
change and supplied sensory/recovery cues. Missing source cues remain missing.
Revealing before submitting is allowed and recorded as such. An unsubmitted draft
survives a reveal, but the later submission remains marked as following the
interface reveal. Unsaved drafts disable export until retained.

The learner then records a self-comparison: consistent, meaningfully different,
or uncertain/insufficient account, with optional notes. This is not an automatic
correctness judgment or an assertion that the source author is correct. Continue
through the selected source steps while retaining the separate first responses,
reveals and self-comparisons. A declared prior-familiarity setting is retained;
the software does not authenticate it or what was seen outside this interface.

## Source and replay

The separate `skill-translator.decision-practice/v1` file contains the normalized
source account, selected step identities, declared familiarity and ordered
actions. It does not copy the source image bytes. Keep the original demonstration
bundle and open it before reopening practice. Changed frame identity, timing or
authored explanation refuses the old practice; findings are recomputed from the
raw actions. The file is editable local data, not a signed chronology or an
independent acquisition record.

Source bundles retain the maintained 48 MiB limit. Practice files are limited to
1 MiB, at most 24 selected steps and 96 actions. A valid transition retains one
first response, one reveal and one self-comparison per step, then advances. It
never awards points, estimates force or contact, or establishes learned physical
skill. The source may itself be authored, incomplete or mistaken.

## Verification

`node --test test/decision-practice.test.mjs` exercises source binding, response
custody, uncertainty, reveal order, valid transitions and replay limits.
`node tools/browser-decision-practice.mjs` uses an existing Puppeteer/Chrome
installation plus FFmpeg to create an original authored color/marker clip. It
passes that clip through the maintained studio, receives actual retained pixels,
and exercises prediction/reveal/self-comparison, export/reopen, mismatch refusal,
draft races and 390px layout. Runtime configuration follows the other browser
courses; only explicitly admitted isolated environments should use the optional
`CHROME_TEST_NO_SANDBOX=1` setting. Authored browser controls establish software
behavior, not expert validity or a measured learning benefit.
