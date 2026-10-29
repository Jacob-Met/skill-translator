# Inspect original and focused placements

In Practice Review, attach a focused source and its separately saved practice
session. Choose **Inspect placements** beside a mark in that drill's comparison
table. The panel shows the selected original and focused rounds side by side:
their targets, actual retained placements, signed offsets, distances and existing
tolerance findings. At narrow widths, the two accounts stack vertically.

Offsets are **placement minus target**, in physical-sheet millimetres. Positive
x points right and positive y points down in the standard sheet view. Mirroring
a practice view does not change the stored physical coordinates. These saved
sessions do not identify whether an earlier practice view was mirrored; this
inspection does not infer that history or flip either sign.

For example, placements five millimetres to opposite sides of the same target
have equal distance errors but horizontal offsets of +5 mm and −5 mm. Inspecting
them exposes the retained difference without declaring an improvement, cause,
recommended correction or learning effect.

An unplaced mark has no retained placement, offset or tolerance verdict. A mark
outside the focused subset is explicitly **not part of this focused task**.
Neither state is a zero error. Each displayed result comes from the maintained
practice evaluator; no new score or comparison rule is introduced.

The inspection is separate from the checkboxes that choose the next drill.
Opening or closing it changes no source, placement, selected round, focus
selection or saved-review bytes. Use **Return to this mark’s result** to close
the panel and return keyboard focus to its row. Enter or Space activates the
ordinary inspection button; opening moves focus to the panel heading.

Changing the compared rounds or accepted source/drill collection clears the
inspection so the old account is not presented against new results. Failed
replacement operations retain the accepted account. Changing only the next-drill
checkboxes does not alter the retained focused attempt being inspected. An
identical-content reopened account may retain the same inspection. Inspection
is temporary UI state and is not added to the saved-review format.

## Receiving

The focused browser course must run against an explicitly supplied local
application with existing Puppeteer and stock sandboxed Chrome. It should retain
served-source hashes, exact saved-review comparisons, focused viewport captures,
and authored controls for opposite signed offsets, missing placements, subset
scope, round changes, failed replacements and keyboard return. Qualification
belongs to the exact executed source/package receipt; the presence of this guide
or a receiver is not a passing result. These controls establish software behavior,
not physical accuracy, source authenticity or learner benefit.

Start the application separately, then run the maintained receiver:

```sh
QA_BASE_URL=http://127.0.0.1:8787 \
QA_BUILD_SOURCE=FULL_40_CHARACTER_SOURCE_COMMIT \
QA_OUTPUT=/absolute/path/to/new-inspection-evidence \
PUPPETEER_PATH=/absolute/path/to/existing/puppeteer \
CHROME_BINARY=/absolute/path/to/chrome \
node tools/browser-focused-placement-inspection.mjs
```

Replace the source placeholder with the exact full commit and use the actual
loopback origin of the separately launched application. Choose a fresh evidence
directory for each run. The receiver does not start a fallback application.

`QA_BUILD_SOURCE` records the expected source identity; that label alone does not
verify the server. Connect the receipt's actual served-file hashes to the reviewed
candidate tree. For an extracted runtime, run the maintained static manifest and
route-byte receiver against the same origin and expected commit, retaining its
receipt alongside this browser course. Record the launch and extracted-package
identity as described in [runnable release receiving](RUNNABLE_RELEASE.md).

The course imports its fixture-building core from the served application and
does not require Git imports or a source checkout. It can therefore run from a
standalone evidence bundle containing the receiver, using an absolute script
path in the command above. Preserve the receiver hash and the same source/hash
and static-receipt linkage in that mode.
