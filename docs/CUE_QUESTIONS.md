# Compare categorical questions over retained demonstrations

In the cue-combination workspace, load a complete source comparison and declare
cue categories and decision labels. **Compare next questions** calculates the
smallest worst-case number of questions needed to distinguish the retained
declared labels. Every question counts equally; this does not measure physical
effort, risk, observation reliability or teaching value.

Every available first question remains visible, including ties and questions that
cannot resolve the table. Its branches list original example numbers and the
number of further questions needed. A user can supply an actually inspected
category for one cue, retaining that reading and recomputing the remaining table.
The tool does not select a category, fill a missing decision or instruct an action.

Unknown source categories remain compatible with each known answer and with an
unrecorded category. An answer that matches no retained evidence explicitly
leaves the supported table. Unknown decision labels and indistinguishable
conflicting rows prevent a finite distinction claim. A zero count says only that
the remaining examples share one declared label. It does not establish that this
label is correct, complete or appropriate for another physical situation.

## Why adaptive questions can differ from a fixed cue set

Consider four authored rows, each with a different decision label:

| Gate | Left | Right | Label |
| --- | --- | --- | --- |
| 0 | 0 | 0 | A |
| 0 | 1 | 0 | B |
| 1 | 0 | 0 | C |
| 1 | 0 | 1 | D |

Every fixed separating set needs all three cues. Asking Gate first permits Left
when Gate is 0, or Right when Gate is 1, requiring two questions in the worst
case. This is a finite categorical calculation; no observation probabilities or
physical learning effect are inferred.

## Source and reopening

The original source frames and declared cue study remain unchanged. Editing the
source/cue table clears supplied question readings. **Save complete cue study**
retains those readings alongside the existing complete original source bundle.
Reopening validates the readings before accepting the source and displays no
saved conclusions. Request the question comparison again to recompute it.
Older saved cue bundles without readings open with an empty question history.
Older applications may ignore this optional exploratory question state.

The exact bounded planner reuses maintained cue admission (2–6 examples and up
to eight cues), memoizing compatible-example and remaining-cue subsets. It does
not modify or refit the declared labels. Native checks include independent small
tree enumeration, adaptive versus fixed questions, unknown categories, novel
answers, unchanged inputs and malformed reading refusal. Browser qualification
must exercise actual retained frames, explicit reading, raw save and fresh narrow
reopening; passing native controls alone does not establish that experience.
