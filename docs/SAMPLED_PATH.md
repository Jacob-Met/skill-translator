# Inspect intermediate retained states

A point may leave and return to its original location. A before/after comparison alone then has zero displacement even though selected intermediate annotations describe an excursion. The sampled-path investigation retains those intermediate states and their original source identities.

Open **Inspect matched intermediate states along a sampled path** from the demonstration sequence editor, or visit `/sampled-path`. Open the existing producer's saved sequence bundle with its original PNG frames. Every PNG is checked by the maintained image/sequence receiver before admission.

Select at least two moments from one retained demonstration and name the point whose correspondence you are declaring. At each selected moment, explicitly match a calibrated mark or retain a missing observation with a reason. Declare a common fixed planar reference, matching corner meanings and the basis for that declaration. All matched calibrations must use the same supplied width and height. The instrument does not silently rescale separate reference planes.

The result orders selected moments by their presented frame times. It reports each adjacent sampled chord, its endpoint difference and elapsed frame interval. A missing selected observation breaks continuity: the instrument does not connect across it. The sum of available chords remains separate from the complete sampled-path sum, which is unavailable unless every selected point is observed. The endpoint distance can still be inspected if the first and last selected observations exist; it does not fill a missing middle observation.

At each observed three-point neighborhood, the unsigned turn is between the incoming and outgoing chords. A zero or numerically unresolved adjacent chord has no stable direction, so its turn stays unavailable. The disclosed guard is `64 * Number.EPSILON * max(1, declared dimensions, absolute mapped coordinates)` mm. It prevents small homography rounding residues from becoming apparently precise directions. It is a numerical resolution convention, not a physical tolerance, an estimate of calibration uncertainty or a certified error bound; original chord values remain unchanged. Resolvable small chords above the guard are still inspected. Straight progression gives 0°, a right-angle corner 90°, and a reversal 180°. These describe the selected chords rather than the instantaneous direction of movement.

## Interpretation

All geometry is conditional on supplied annotations, calibration, correspondence and a fixed common reference. The selected samples cannot establish the intervening motion, physical distance traveled, contact, force, efficient technique, physical success or learning. Unselected retained moments are not automatically matched. An editable local account does not authenticate who made the declaration or when.

Save the complete raw account to preserve the original sequence, declarations and missing observations. Findings are recomputed on reopening; saved derived answers are not trusted. The optional expected-sequence argument refuses a mismatched original source. Core raw records are bounded at 4 MB. Browser bundles keep the complete original sequence and PNG frames once plus declarations, within the maintained 48 MiB sequence budget plus 64 KiB for declarations. Invalid images or source records preserve the previously accepted account. Editing declarations cancels a pending older import or export.

## API

`createSequencePath(sequence, {label, reference, samples})` admits the original sequence and explicit declarations. Each sample is `{momentId, markId, basis}`, with `markId: null` explicitly representing an unavailable observation. The reference contains `{label, basis, samePlaneAndCorners: true}`.

`importSequencePath(raw, expectedSequence)` checks the complete account and optional source binding. `inspectSequencePath(raw)` returns the ordered original sample identities, adjacent segment geometry, turns and separate coverage/endpoint summaries. No source, practice score or adaptation rule is changed.

## Verification

`node test/sequence-path.test.mjs` exercises ten producer-backed native groups including 100 independent collinear controls. `node tools/browser-sampled-path.mjs` runs the actual maintained HTTP/Chrome consumer with original authored PNGs, export/reopen, wrong-image refusal, stale-read cancellation and keyboard/narrow receiving. These fixtures are analytic authored evidence, not a physical task or learning study.
