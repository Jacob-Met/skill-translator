# Prerequisite rehearsal

Open **Rehearse prerequisites** from the maintained Demonstration Sequence page,
or visit /prerequisite-rehearsal on the normal local server.

The page receives an existing sequence bundle, checks retained PNG bytes through
the maintained reader, and keeps each step's before/after frames visible.
Declare directed prerequisites with reasons, lock the declarations, then propose
a full or partial order. Frame chronology supplies no automatic prerequisites;
independent prerequisites may admit several valid orders.

Findings distinguish reversed prerequisites, prerequisites missing before an
already proposed step, and remaining steps. A valid prefix shows which remaining
steps have all declared prerequisites. An invalid prefix offers no continuation
until its violation is addressed. Cycles, self-dependencies, duplicate edges and
unknown steps are refused.

## Source and first-attempt retention

The first submitted order stays fixed within its rehearsal. Starting another
rehearsal replaces the on-screen attempt; save first to retain it. Unsubmitted
selections are not saved. A saved unsubmitted declaration set reopens for editing;
a submitted record reopens with locked declarations and its exact first order.

Downloads include the source bundle, declared relationships and optional first
attempt. Reopening validates the full normalized source account, checks PNG bytes
and recomputes findings. Missing prerequisite arrays refuse; an explicit empty
array legitimately declares no constraints. Manually rewriting both a record and
its associated source is not an authenticated history.

Edits cancel pending older imports. Saving checks captured source and session
identities after asynchronous frame-byte collection, so a replacement import
cannot export an older rehearsal as current. Rejected imports preserve the
accepted source and attempt.

## Run and receive

Run npm start and open the route above. Native checks:

    node --test test/prerequisite-rehearsal.test.mjs
    npm test

For actual browser receiving, supply Puppeteer or Puppeteer Core and Chrome:

    PUPPETEER_PATH=/path/to/puppeteer-core \
    CHROME_BINARY=/path/to/chrome \
    QA_OUTPUT=/path/to/receiving \
    node tools/browser-prerequisite-rehearsal.mjs

The course uses authored retained PNG controls from the existing decision-practice
receipt. It exercises the maintained navigation, checked frames, editable drafts,
keyboard initiation, reversed and valid alternate orders, partial prefixes,
actual downloads/reopening, malformed source and constraints, desktop/narrow
layouts, and deliberately delayed import/save races. CHROME_TEST_NO_SANDBOX=1 is
available for environments whose existing browser test policy requires it.

This checks agreement with supplied reasons. It does not infer causal necessity,
validate expert authority, measure learning, establish physical skill or authorize
physical execution. The broader demonstration-to-learning journey remains open.
