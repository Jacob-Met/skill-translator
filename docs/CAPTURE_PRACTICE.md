# Practice the marks you authored in Source Studio

Source Studio can open its accepted annotations directly in the existing
geometric Practice workbench. You can keep the original image beside the new
practice tab without downloading and importing annotations to start practice.

## Open a practice session

1. Open **Source Studio** at `/capture` and choose a local PNG or JPEG. A saved
   frame from the studio's video workflow also works.
2. Enter the workpiece's measured width and height, select its four corners, and
   choose **Apply calibration**.
3. Add at least one source mark. Give each mark its intended proportional or
   fixed-edge relationship and tolerance. Save or discard any unfinished mark
   draft before continuing.
4. Choose **Practice these marks in a new tab**.

The new tab receives a copy of every accepted mark and its original source
record. It starts at the accepted source width and height, in the standard view,
with **Show target marks** turned off. Select and place marks, then choose
**Review complete attempt**. You can reveal the targets when you want to inspect
them.

Source Studio stays open with its original image and annotations. The practice
tab receives the annotation record, not the image pixels. Later edits in Source
Studio do not change a practice tab that is already open; open another practice
tab to use a newly accepted source.

## Change the workpiece and keep your attempts

In Practice, expand **Source and workpiece setup**, enter another width and
height, and choose **Start a new session**. The existing authored relationships
are adapted to those dimensions. A workpiece that cannot satisfy a declared
physical clearance is refused.

Changing the workpiece or source starts a new session. Export placements you
want to retain first. **Try a fresh round** keeps the preceding round within the
current session while clearing the placements for another attempt.

Use **Export source annotations** and **Export practice session** to save both
parts of your work. To reopen a session, enter its saved target width and height
in **Source and workpiece setup**, then choose the matching source annotations
file. Source import uses those entered dimensions immediately. Finally, use
**Reopen a session for this setup**. Reopening checks the source, relationships,
tolerances and dimensions;
results are recomputed from the recorded placements.

The original **Download annotations** and **Continue to Task Space** routes in
Source Studio remain available. Keep the original image separately if you want
to reopen the source for editing or inspect its pixels. For a captured video
frame, use **Save frame PNG** as well as saving the annotations. An open browser
session is not a saved source file.

## If practice is unavailable

| What the studio reports | What to do |
| --- | --- |
| Add at least one source mark | Apply a valid calibration and add a mark. An empty calibration remains editable but cannot start practice. |
| Apply or revert calibration edits | Apply the revised corners or measurements, or revert the draft to the accepted calibration. |
| Save or discard the current mark draft | Add the new mark or save its changes. Use **Discard mark draft** for a new point, or **Cancel mark edit** for an existing mark, to keep the accepted source unchanged. |
| The practice tab was blocked | Allow the new tab and try again, or download the annotations and import them under Practice's **Source and workpiece setup**. |
| Practice handoff did not complete | Source Studio keeps its current work. Download accepted annotations and use the ordinary Practice import. A browser-storage failure is reported explicitly; a failed restoration of the previous setup is also reported rather than treated as a completed handoff. |

## What this practice establishes

This is planar placement practice using human-authored calibration,
relationships and tolerances. Hidden targets change the display, not the
underlying geometric criteria. Incorrect source measurements or interpretations
can still produce internally consistent geometry.

The handoff does not infer expert intent, contact, force, pressure or a physical
skill outcome. A geometric pass describes agreement with the supplied source
rules; it does not establish successful physical work or learning. Original
pixels remain available in Source Studio for inspection.
