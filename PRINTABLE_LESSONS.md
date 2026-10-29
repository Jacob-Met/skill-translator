# Keep a lesson for offline reading or printing

Sequence Studio can save a standalone lesson containing the authored steps and every retained source frame, including frames that no step uses. Attached calibrated annotations are included alongside their source frames.

## Save and read a lesson

1. In Sequence Studio, retain at least two moments and save at least one authored step. Finish saving or clear an unfinished step draft, and finish editing a moment before exporting.
2. Choose **Save sequence with frames** and **Save printable offline lesson**. Keep `demonstration-sequence.json` for future changes; the lesson is saved as `demonstration-lesson.html`.
3. Open `demonstration-lesson.html` in a browser. The downloaded lesson contains its images and needs no network connection to read. Links in each step take you to its before and after source frames.
4. Use your browser's Print command to print the lesson or save it as a PDF. Check the print preview for your chosen paper size. The annotation diagram is not a physical-size template.

The lesson shows each original retained PNG once, its hash, and both the requested and browser-presented times. Those times can differ. A hash identifies the supplied bytes; it does not establish the authenticity of a recording.

## Read attached calibrated annotations

A calibrated frame includes the author's supplied dimensions, calibration corners, provenance, evidence class, and unknowns. A separate diagram numbers the source marks; matching table rows list their original pixel coordinates, declared relationship, tolerance, and explanation. Marks at the same position can overlap in the diagram, but each has its own table row.

The table separates the author's declarations from relationships calculated using that calibration. A fraction describes a relative position. An edge offset describes a clearance from the declared edge. These values depend on the supplied corners and dimensions; they are not independent physical measurements. Displayed calculations are not rounded, so some numbers may be long.

The diagram does not alter the original image. It is a reading aid, not proof of contact, force, physical success, or learner mastery. The authored intentions, sensory cues, recovery advice, and unknowns remain part of the author's account.

In the HTML lesson, expand **Inspect the accepted annotation record** to see the attached annotation details. That disclosure is omitted from printing; the readable annotation table and author-supplied unknowns remain in the printed lesson.

## Reopen and revise

To revise the lesson, return to Sequence Studio and choose `demonstration-sequence.json` under **Reopen a saved sequence**. The saved sequence includes its retained PNG frames and authored account. Revise the sequence, then export a new HTML lesson. The HTML lesson itself is a reading copy, not an editable sequence file.

Keep the original video separately. It is not included in either export, and you need the matching original clip to retain additional moments. After making changes, save an updated editable sequence as well as a new printable lesson.
