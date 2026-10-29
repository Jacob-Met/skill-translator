# Continue a frozen reading run as an explicit history

Save a run from the fixed schedule or adaptive repeated-reading page, then follow its history link to the retained-reading editor. Import the downloaded run. The editor verifies the original cue bundle and PNGs before adopting it.

The original baseline, planning ceiling, supplied answers, total mismatch bound and assumption basis remain retained. The bound and basis cannot be edited in this continuation. A correction appends a reasoned revision; it does not add an inspection. A withdrawal retains the excluded reading and its reason. Later new readings belong to history after the original run and do not refill or extend its frozen schedule or adaptive horizon.

Save exports `skill-translator.cue-execution-history/v1`, containing the original source once, the frozen run inputs, and complete continued event log. Reopening recomputes both the original run and current history. Editing or shortening the derived original prefix is refused. These are input-only replay checks, not signatures or evidence that observer categories are physically true. Existing v1 withdrawal files keep their original workflow.

## Reproduce

Run `node --test test/cue-execution-history.test.mjs`. The authored categorical fixture covers both run types, corrections, withdrawals, prefix refusal, stale revisions, unchanged bounds, replay and nonmutation. It is separate from the licensed-image browser course.

For browser receiving, supply Experimental Earth's `tests/support/browser-session.mjs` and sibling `chromium-session.mjs` and `chromium-sandbox.mjs` from commit `c20a357e4e34c0f6de30fb942ae9ed4b08b975c2`. Use ordinary sandboxed Chrome and a fresh writable output directory:

```sh
BROWSER_HELPER=/absolute/helper/browser-session.mjs \
CHROME_BINARY=/absolute/chrome \
QA_OUTPUT=/absolute/new-output \
FIXED_RUN_FILE=/absolute/cue-fixed-execution.json \
ADAPTIVE_RUN_FILE=/absolute/cue-adaptive-repeat.json \
node test/cue-execution-history.browser.mjs
```

This browser course expects the separately retained scissors inputs: fixed ceiling 6, adaptive ceiling 3, total bound 1, and three supplied hypothetical answers `separate offcut`, `curved notch`, `curved notch`. The source retains four licensed PNG frames and Aerra Carnicom / CC BY-SA 4.0 attribution. Use maintained producers and their source-acquisition instructions; do not substitute authored pixels and call them original footage. The receiver starts the actual application server, follows both execution-entry links, corrects and withdraws an answer, downloads and reopens each history, refuses a forged prefix atomically, and captures 390px views. This course does not establish physical skill reliability or independent error rates.
