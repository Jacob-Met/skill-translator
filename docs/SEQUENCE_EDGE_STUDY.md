# Independent edge evidence across task moments

The visible-edge consumer retains one independently received report and observer
review for each original moment. Moving to another moment preserves accepted
reviews. Returning restores that moment's proposal, ROI, selected feature and
review basis. A newly received report replaces only its own moment's active
report with unreviewed evidence. Edited review fields become retained evidence
when the observer presses **Retain this review**.

The overview lists every original retained moment in source order. A moment
without a report is **uninspected**, distinct from a report with zero candidates,
an unreviewed report, a rejected report, or a selected visible feature. Existing
authored steps show their exact before/after source anchors and each anchor's
review status. Step descriptions remain authored; the consumer does not infer
feature identity, continuous motion, physical contact or successful action.

The new `sequence-edge-study/v1` core reuses original sequence and edge-report
admission for every entry, refuses duplicate moment entries and source
mismatches, and strips per-entry source duplication. The saved
`sequence-edge-study-bundle/v1` contains one original sequence/PNG bundle and all
retained reports/reviews. Input and export remain bounded to 60 MiB. Original
single-report v1 accounts still open and become one-entry studies. Both the
legacy coordinate cloud and complete-field report are supported.

Import validates the complete new study before replacing accepted source assets.
Invalid input preserves the prior study. Native requests, report reads, source
reads and saves share a revision fence; a newer edit or source adoption retires
an older result. Navigation can discard unretained form edits while restoring
the last accepted review. Saving serializes accepted evidence, not transient
form state or computed overview claims.

## Actual source receiving

The same internally retained Sounds of Changes paper-cutter source documented in
[complete edge fields](SEQUENCE_EDGE_FIELD.md) supplied all five original PNGs.
The actual browser requested native reports for moments 0.507 and 2.007 seconds,
retained a selected image-space proposal and a separate rejected review,
navigated between them and reopened the full account. Three other moments
remained explicitly uninspected. The original source step's after anchor at
7.973 seconds therefore remained uninspected rather than acquiring a conclusion
from the earlier selected report.

A private five-report receiving experiment retains every original PNG once in
12,624,492 bytes; the five independent reports occupy 781,869 bytes. No original
source media or source-bearing account is distributed in this repository.

## Verification

Four new native groups verify ordering, explicit gaps, exact authored step
anchors, duplicate/wrong-source refusal, nonmutation and roundtrip. Existing
edge groups remain unchanged. MICROVERSE independently ran the four groups and
accepted source/lifecycle behavior.

Actual browser receiving additionally verifies invalid multi-report import
preserves accepted work and a deliberately delayed whole-study save is retired
by a newer review edit. Desktop and 390 px views were inspected. The prior
scissors consumer retains zero-proposal and stale-native-response behavior, and
the five-frame crowded-field course still admits every original detected pixel
and reopens the original single-report account.

```
node --test --test-isolation=none test/sequence-edge-study.test.mjs test/sequence-edge.test.mjs
EDGE_FIELD_SOURCE=/path/to/permitted/paper-cutter-sequence.json node tools/browser-edge-study.mjs
```

Use the same qualified OpenCV/NumPy environment as the native edge inspector.
