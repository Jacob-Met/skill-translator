# Rehearse the change between two demonstrated states

Open `/transition-practice` from the calibrated state-comparison page. This consumer separates two questions about explicitly corresponding marks:

- Do the learner's final mapped positions meet the original endpoint tolerances?
- Does each learner after-minus-before position change meet its separately declared change tolerance?

For example, a source mark moves from x20 to x40 mm. A learner who starts at x30 and ends at x40 meets the final endpoint but differs from the demonstrated change by10 mm. A learner who starts at x30 and ends at x50 reproduces the20 mm change while missing the final endpoint. Neither observation by itself grades the physical action. A different start, frame, interpretation or authored criterion may explain the disagreement; the software does not choose a cause.

## Actual producer and learner workflow

1. In the maintained calibrated-state comparison, retain a before/after sequence with calibrated annotations. Explicitly declare the shared source plane and matching corner meanings, pair specific marks, and save the complete comparison. Identical labels never create correspondence.
2. Import that saved comparison into transition practice. The original checked PNG frames remain visible. Supply one positive change tolerance, up to50 mm, and its authored basis for every retained pair. These are separate from the original positional tolerances. Freeze the criteria.
3. Open the before-state and after-state tasks in the existing practice page. These use each retained moment's own annotations and original supplied width/height. Enter actual learner placements or receive learner-photo annotations through the existing practice consumer, then export its ordinary raw sessions.
4. Import those two sessions and explicitly declare that the learner states share a planar reference with matching corner meanings. Matching dimensions alone cannot establish that physical fact.
5. Predict the final endpoint and endpoint-change observations separately. Commit the prediction, then reveal. Feedback stays withheld until commitment and reveal. The result shows source and learner endpoints, their changes, per-pair errors, original endpoint tolerances, independent change tolerances, and current-round provenance. Before-position discrepancy is shown separately.
6. Save the complete account. Reopening rechecks original source images, raw sessions, mappings and declared criteria, then recomputes the results. Receiving either learner state resets the common-reference declaration, prediction and reveal; editing that declaration also clears stale reasoning drafts.

The diagrams connect endpoints only. They do not depict a measured motion path. Only mapped points participate in the aggregate observations; counts of unpaired source marks remain explicit. Any known failed pair makes that criterion unsatisfied. Otherwise missing paired placements leave it unknown. A criterion is satisfied only when every mapped pair has the required evidence and meets its bound. Earlier practice rounds never fill missing current-round marks.

## Maintained mechanisms and boundaries

`stateChangeEvidence` owns the source displacement and correspondence admission. `momentTask` supplies each exact source-state task. `importPractice` and `evaluatePractice` own source/rule/dimension binding, actual placements, photo-coordinate normalization and endpoint evaluation. The existing `evaluate` predicate compares the learner displacement vector with the source vector under the separately supplied circular tolerance. No new calibration, matching, anchoring, collision or optimization algorithm is introduced.

This first profile requires the demonstration's original supplied workpiece dimensions for both practice states. It does not infer how a demonstrated change should transfer to a differently sized workpiece. Photo annotation classes and identities remain retained, including explicit manual detachments; original learner image pixels are not reattached in this consumer. Source PNG identity checks do not authenticate capture, calibration, correspondence or chronology. Local predictions and file order are editable records, not evidence of prospective testing or absence of help.

A difference between endpoint changes is not instantaneous speed, trajectory agreement, physical necessity, contact, force, causal explanation, task completion or learned skill. The source is still an authored interpretation of retained observations.

## Source custody and bounds

The core account format is `skill-translator.transition-practice/v1`; its complete raw and normalized JSON must each fit4,000,000 bytes. Each learner session must fit the maintained practice page's256 KiB input limit. There are at most30 correspondences under the existing state-change contract. The complete browser bundle retains the maintained state-change bundle, both normalized raw practice sessions, the common learner reference, criteria, first prediction and reveal state. Its measured output bound is the existing state-change bundle limit plus4,000,000 bytes and64 KiB; the importer uses the same limit. No evidence is dropped to fit a limit.

Cached findings and arbitrary saved verdicts are ignored. The saved account's normalized comparison must match the independently checked source bundle. Source replacement, learner-reference edits and prediction actions invalidate pending reads; failed replacement preserves accepted evidence. Saves retain a snapshot and check both operation generation and accepted-state identity before downloading.

## Receiving

```sh
node --test --test-isolation=none test/transition-practice.test.mjs
CHROME_BINARY=/opt/google/chrome/chrome PUPPETEER_PATH=/path/to/puppeteer QA_OUTPUT=/path/to/receipt node tools/browser-transition-practice.mjs
```

Seven native groups cover separately calibrated camera views, endpoint-only/change-only agreement, stationary/direction/missing cases, source/rule/size refusal, prediction commitment and reset, photo/manual-detach provenance, raw replay, current rounds and capacity refusal.

The browser course authors original PNG controls, then uses the actual maintained state-comparison UI to declare correspondence and download its bundle. It opens actual before/after practice tabs, enters placements and downloads their sessions, imports them into the new consumer, commits predictions before feedback, exercises changed and incomplete evidence, foreign-dimension refusal and a delayed read superseded by a reference edit, then saves and reopens at390 px. Explicit foreground transitions avoid background-tab animation-frame polling. The receipt retains all31 runtime-source hashes, browser/executable identity, actual producer/practice downloads, the complete reopened account and desktop/mobile screenshots. Authored test PNGs are not recorded physical demonstrations. A written receiver is not an execution receipt; actual browser qualification must be recorded separately.

### Retaining the first prediction

A committed prediction locks its learner-reference declaration. Re-submitting the same normalized reference or the same normalized raw practice session preserves the prediction and any revealed findings. To revise a committed reference, receive a changed practice state first; this begins a fresh comparison and clears the reference and prediction. Before committing, reference edits remain available. This is a local teaching interaction, not an authenticated examination history.
