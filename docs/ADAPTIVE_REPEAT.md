# Adaptive repeated cue readings

Open `/cue-adaptive-repeat` from the workbench directory. Load a complete original v1/v2 cue bundle, an existing reading-withdrawal account, or a saved adaptive inquiry. Later count/effort bundle formats remain in their maintained workflows; their metadata is not discarded.

Declare one total hypothetical mismatch allowance, an assumption basis, a future-reading horizon from zero to six and a planning basis. Start a policy from the imported baseline. The next cue depends on the answers supplied so far. Each answer is a new reading with explicit provenance and spends one position from the original horizon. A transcript correction is not another inspection: revise the baseline in its correction/withdrawal workflow and start a separate inquiry.

## What the policy guarantees

The bounded search considers all next cues, including repeated cues, and every retained category plus a distinct outside-category branch. Each known-value disagreement consumes that example's residual total allowance. Unknown source cells remain compatible without confirming the supplied answer. A compatible unknown decision prevents a represented-decision guarantee. Answers that eliminate every example remain outside evidence.

The result minimizes worst remaining question count within the admitted finite family: at most six examples, eight cues and six future readings, with residual allowances from zero to two. Search charges memo calls and answer transitions against a 200,000-operation limit; exhaustion refuses without returning a partial policy. It is not a weighted-effort policy or a physical instruction. Repeated readings are not assumed statistically independent or more reliable.

The unchanged event reducer retains at most 30 introduced reading identities and 90 events. Withdrawn identities still count toward retention capacity. A mathematical policy is executable only if its worst depth fits both remaining capacities. A horizon of six may still admit a one-step policy when only one slot remains; the viewer refuses a policy whose possible continuation cannot be recorded. No original event is dropped to make room.

## Source and replay

Saved files contain only the original complete PNG bundle, baseline inputs, planning declaration and ordered answer inputs. They do not trust a cached decision or policy tree. Reopening independently recomputes the policy, validates every requested cue and provenance, and checks original PNG custody before adoption. A failed replacement preserves accepted work. Planning edits retire execution and export; they do not refill an ongoing horizon.

## Discriminating control

Four explicitly authored categorical rows `000`, `010`, `100`, `101`, with different declared decisions and one total mismatch, need three repetitions of each cue in a fixed schedule: nine readings. The maintained fixed scheduler therefore correctly refuses its six-reading horizon. Adaptive branching admits a minimum worst-case five-reading policy. A no-error all-zero path resolves its represented decision after four answers, leaving two unused positions from a declared horizon of six.

The software fixture uses the maintained authored PNG samples with explicitly authored distinct clip identities and category/decision accounts. Those are decoder and policy controls, not additional observed demonstrations or a claim that categories were perceived from pixels. Keep these controls separate from any attributed real demonstration receiving.

## Reproduce

```sh
node test/adaptive-repeat-oracle.test.mjs
ADAPTIVE_FIXTURE_PATH=/absolute/path/to/new/authored-policy.json \
node test/adaptive-repeat-execution.test.mjs
BROWSER_HELPER=/absolute/path/to/maintained/browser-session.mjs \
CHROME_BINARY=/absolute/path/to/ordinary/sandboxed/chrome \
ADAPTIVE_FIXTURE_PATH=/absolute/path/to/new/authored-policy.json \
QA_OUTPUT=/absolute/path/to/fresh/output \
node tools/browser-adaptive-repeat.mjs
```

The independent oracle recounts every supplied answer position against each original row. Execution controls cover frozen-horizon replay, source immutability, wrong-cue and forged-anchor refusal, prior error debit, and retained identity/event boundaries. Browser receiving uses the actual maintained server and verifies real PNG intake, answer-by-answer debit, actual download/fresh reopen and asynchronous replacement retirement.

## Licensed original-source course

The separate original course downloads the unchanged Wikimedia Commons video “Aerra’s Films of the Ordinary IV — Scissors Cutting Card Stock” by Aerra Carnicom / Aerrapc, licensed CC BY-SA 4.0. The source page and license URL are retained in SOURCE.json and the actual sequence context. Original video SHA-256 is `06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe` (1,006,547 bytes). Frame extraction and added observer annotations are declared changes; media-derived outputs retain the source license. No endorsement is implied.

```sh
python3 tools/acquire-adaptive-original.py /absolute/new/source-directory
BROWSER_HELPER=/absolute/path/to/maintained/browser-session.mjs \
CHROME_BINARY=/absolute/path/to/ordinary/sandboxed/chrome \
ORIGINAL_VIDEO=/absolute/new/source-directory/original.webm \
QA_OUTPUT=/absolute/path/to/fresh/original-output \
node tools/browser-adaptive-original.mjs
```

This course operates the maintained sequence, comparison and cue editors. It preserves four actual presented frames at 3.012, 4.978, 7.012 and 9.012 seconds, matching the earlier original-source PNG hashes. “Inspect curved notch” and “Inspect separated offcut” are declared observer review decisions, not inferred demonstrator intentions. The supplied answer sequence is explicitly hypothetical: separate offcut, curved notch, curved notch. With one total hypothetical disagreement, the first decision remains and its exact disagreement is position 1; the other decision disagrees at positions 2 and 3. Actual download and fresh replay preserve the original media and inputs.

The three browser helper files are available at Jacob-Met/experimental-earth commit `c20a357e4e34c0f6de30fb942ae9ed4b08b975c2`, under `tests/support/`: browser-session.mjs (SHA-256 `3224fff20b68149ce08e541d68cf145c7d5c0e1751a1ac1758d2a80f56c9255b`), chromium-session.mjs (`c38f888fadff89877cebc9f05bb57c12153c12bf419e2b6d660cc425945927ff`) and chromium-sandbox.mjs (`4607c67b360596ee06b36e41a6b5d3a8a6da70defb04292d955f609dcef05ead`). Keep them together. The helper uses Node’s built-in WebSocket/CDP and verifies the actual browser sandbox; it does not require Playwright.
