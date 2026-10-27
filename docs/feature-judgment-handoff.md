# Preserve judgments through feature review

Use **Review feature gaps across these sheets** in the changing-sheet rehearsal, then **Return to the unchanged rehearsal** in feature review. This route retains the complete validated first-judgment study: the original source, plan, placement and help events, predictions, and reasons. A recorded judgment still freezes its placements after returning. Committing and advancing to the next sheet allows new placements while preserving the earlier account.

The feature page retains judgments alongside its accepted rehearsal and checks their complete rehearsal identity before returning them. Selecting another review trial preserves this companion. Legacy raw rehearsal handoffs remain supported without judgments.

## Replacement and saving

Successful explicit imports of raw rehearsals or saved feature reviews replace the companion, even when the rehearsal history is identical. Successful comparison replacement and fresh rehearsal navigation start without the previous judgments. Rejected imports preserve accepted work. A cancelled fresh navigation also preserves the current review and its judgments.

Feature review has two separate downloads. **Save complete raw review inputs** keeps its existing format and omits judgments. **Export complete judgment study** downloads the attached full study directly as `skill-placement-judgments.json`; reopen that file through the rehearsal page to restore its judgment history and placement locks.

The complete-study control is enabled for a valid attached study, including one with no judgments. It is disabled for an accepted raw review with no attached study. Matching rehearsal history alone does not attach earlier judgments. Failed imports and cancelled navigation preserve the current study; successful explicit replacement clears it.

You can also choose **Return to the unchanged rehearsal** and export the study there. Export a file to keep a portable copy; live-page preservation does not provide durable storage across a feature-page reload.

## Original center prediction in feature review

For the selected trial, feature review shows the attached study’s original center prediction and recorded reason. It keeps the original wording: **Every mark is within tolerance**, **At least one mark is outside tolerance**, or **I am uncertain**.

The prediction concerns original mark positions. Feature clearance is assessed separately. After commitment, agreement comes from the existing center result. For example, both centers can be within their two-millimetre tolerances while their feature gap is six millimetres against a ten-millimetre requirement. An “every mark” prediction agrees with the center result; the separate feature requirement still fails.

Before commitment, center-result and agreement feedback remain withheld. A committed uncertain prediction retains **Uncertainty retained; no agreement score.** The page distinguishes a trial with no recorded prediction from a raw review without an attached study. Changing the selected trial updates its account without changing the study.

These findings describe authored geometry and the recorded prediction; they do not establish physical performance, mastery, or a learning effect.

## Browser receiving

From the repository root, run:

```sh
PUPPETEER_PATH=/absolute/path/to/puppeteer-core \
CHROME_BINARY=/absolute/path/to/chrome \
QA_OUTPUT=/absolute/path/to/receipts \
node tools/browser-feature-judgment-handoff.mjs
```

To receive an already-running maintained application, set `QA_ORIGIN=http://127.0.0.1:PORT`. The course then uses that instance; without it, the course starts and closes its own server.

The course runs as an ordinary user and admits the actual Chromium sandbox before product navigation. It uses the maintained application server, compares served source bytes with the package, reads completed browser downloads, and captures desktop and 390-pixel views.

Its thirteen groups cover exact judgment return, direct complete-study downloads and reopening, all three placement controls, commitment and continuation, failed and successful replacements, empty-study versus raw-review availability, legacy interoperability, cancelled fresh navigation, and invalid post-judgment edits. A four-sheet course also checks separate center agreement and feature-gap failure, skipped judgments, uncertainty, safe long-reason rendering at 390 pixels, withholding before commitment, and later disclosure of the original center disagreement. The comparison uses authored geometric declarations; it does not establish physical performance or learning effects.

Related native tests:

```sh
node --test --test-concurrency=2 \
  test/transfer-rehearsal.test.mjs \
  test/rehearsal-judgment.test.mjs \
  test/feature-rehearsal.test.mjs
```

See [the original handoff receiving record](receipts/feature-judgment-handoff-20261027/verification.json), [the direct-export receiving record](receipts/feature-judgment-export-20261027/verification.json), and [the selected-trial context receiving record](receipts/feature-judgment-context-20261027/verification.json) for reproduced baselines, exact source hashes, review, and results.
