# Preserve judgments through feature review

Use **Review feature gaps across these sheets** in the changing-sheet rehearsal, then **Return to the unchanged rehearsal** in feature review. This route retains the complete validated first-judgment study: the original source, plan, placement and help events, predictions, and reasons. A recorded judgment still freezes its placements after returning. Committing and advancing to the next sheet allows new placements while preserving the earlier account.

The feature page retains judgments alongside its accepted rehearsal and checks their complete rehearsal identity before returning them. Selecting another review trial preserves this companion. Legacy raw rehearsal handoffs remain supported without judgments.

## Replacement and saving

Successful explicit imports of raw rehearsals or saved feature reviews replace the companion, even when the rehearsal history is identical. Successful comparison replacement and fresh rehearsal navigation start without the previous judgments. Rejected imports preserve accepted work. A cancelled fresh navigation also preserves the current review and its judgments.

Feature review downloads keep their existing schema and omit judgments. To keep the complete study, choose **Return to the unchanged rehearsal**, then **Export complete judgment study**. Live-page preservation does not provide durable storage across a feature-page reload.

## Browser receiving

From the repository root, run:

```sh
PUPPETEER_PATH=/absolute/path/to/puppeteer-core \
CHROME_BINARY=/absolute/path/to/chrome \
QA_OUTPUT=/absolute/path/to/receipts \
node tools/browser-feature-judgment-handoff.mjs
```

The course runs as an ordinary user and admits the actual Chromium sandbox before product navigation. It uses the maintained application server, compares served source bytes with the package, reads completed browser downloads, and captures desktop and 390-pixel views.

Its nine groups cover exact judgment return, all three placement controls, commitment and continuation, failed and successful replacements, legacy interoperability, cancelled fresh navigation, and invalid post-judgment edits. The comparison uses authored geometric declarations; it does not establish physical performance or learning effects.

Related native tests:

```sh
node --test --test-concurrency=2 \
  test/transfer-rehearsal.test.mjs \
  test/rehearsal-judgment.test.mjs \
  test/feature-rehearsal.test.mjs
```

See [the receiving record](receipts/feature-judgment-handoff-20261027/verification.json) for the reproduced baseline, reviewed correction, exact source hashes, and results.
