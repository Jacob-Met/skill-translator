# Finite learner-photo calibration readings

After accepting a complete photo-region comparison in **Practice review**, choose **Investigate alternative photo corner readings**. The investigation retains that comparison's original rounds, common marks, image identities, annotation pixels and region declarations. A saved photo-region comparison can also be opened directly on `/photo-calibration-readings`.

Choose the earlier or later photo, name a proposed reading or repeated annotation, and enter its four image corners in top-left, top-right, bottom-right, bottom-left order. The original is always included; at most three alternatives per photo produce at most16 complete combinations. Every alternative is one shared calibration for every mark in that photograph. Workpiece dimensions, mark pixels and source identity cannot be changed through a reading. An invalid alternative refuses the complete draft rather than being silently removed.

The complete matrix reports the original #136 conditional squared-error ordering for each pair of named readings. If every pair establishes a decrease or increase, the summary says so only for those named readings. Opposite directions are reading-sensitive; unresolved scenarios remain visible. These finite alternatives are neither a continuous calibration uncertainty bound nor a probability distribution. Repeating an annotation is not an independent learner attempt, and no learning effect is inferred.

The implementation reuses maintained calibration/observation admission, mapped annotation regions, exact polygon distances and inherited guarded squared-error aggregation. Each scenario uses a fresh in-memory calculation vehicle; it is never installed into original practice or exported as a new attempt. The exact original common-mark list is checked for every scenario. Original round numbers remain visible, and the portable file contains the original admitted photo comparison plus named corner readings and their retained-photo references—not scenario practice sessions or trusted verdicts.

## Inspect source evidence

Select a matrix scenario and pair each original image file. The maintained byte-identity check requires its SHA-256, dimensions, MIME type and orientation contract to match. The image displays original corners in blue, the selected reading in orange, and unchanged annotation pixels in black. The exact audit disclosure retains guarded squared-error sums and mapped witnesses. Approximate display coordinates do not replace exact classification. Mapping guards are engineering allowances, not calibrated physical accuracy.

The authored control contains a100mm square in120px images. Both marks have earlier nominal errors3mm and later errors1mm. With0.1px horizontal annotation halfwidths the original pair establishes conditional decrease. A named later-photo corner reading translated4px left maps both unchanged later pixels to error5mm and establishes increase. The same actual authored PNG bytes and their computed hashes are used for every reading. This is a synthetic mechanism control, not a field measurement.

## Save and lifecycle

Save downloads `photo-calibration-readings.json` with a6MB limit. Reopening re-admits original evidence and reading references and recomputes the entire matrix. Changed references or original pixels are refused; image bytes must be paired again in a fresh page. A failed import preserves accepted inputs. A draft edit hides stale findings and disables saving; discard restores the previously accepted complete matrix. New drafts, source-file selection and navigation supersede pending reads/calculations. Removing an alternative recomputes the complete remaining matrix while retaining the original reading.

## Receiving

```sh
node test/photo-calibration-readings.test.mjs
PUPPETEER_PATH=/existing/puppeteer CHROME_BINARY=/actual/sandbox-capable/chrome \
QA_OUTPUT=/fresh/receipt-directory node tools/browser-photo-calibration-readings.mjs
```

Native controls cover coherent opposite directions, complete matrix enumeration, fixed common marks, original immutability, actual authored image hashes, portable replay, reference/pixel tamper, finite limits and invalid readings. The actual browser receiver enters through maintained photo review, uses trusted keyboard submission, pairs both real PNG files, downloads and reopens native bytes, tests refusal/cancellation, and verifies the actual390px stylesheet including expanded audit containment. Browser receiving must be run separately; native success does not imply it passed.
