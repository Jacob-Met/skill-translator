# Questions across demonstrated accounts

In the existing `/decision-comparison` workspace, retain two to six original
demonstrations and explicitly match their steps. Under **Ask about a specific
account difference**, choose intent, visible change, sensory cue or recovery cue,
and select at least two examples. Supply your own shared/different/unresolved
judgment, its basis and a question for the author. Retain the question to inspect
the exact source text, original clip identity and before/after frame identities.
An omitted account stays **Not supplied — unknown**. The application does not
infer a difference from missing text or infer agreement from similar words.

Save the complete comparison and the separate question. Reopen the comparison
first, then the question; the complete normalized comparison must match. Source
and interpretation changes retire the question rather than silently reanchor it.
Question edits require explicit retention again. Bad or late imports preserve
accepted work. Raw question files contain the comparison binding and declared
inputs; displayed evidence is recomputed, never trusted from saved findings.
Both save and reopen enforce a 1 MiB bound. No source notes are amended and no
author answer, physical cause, invariant, skill or teaching effect is established.

Native checks: `node --test test/account-question.test.mjs`.
Actual consumer receiving: `PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=...
node tools/browser-account-question.mjs`. The browser course checks original
PNG admission, explicit retention, actual download/fresh reopen, missing versus
supplied accounts, mismatch retention, keyboard revision and narrow layout.
