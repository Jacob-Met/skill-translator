# Separate completion checks in the maintained authoring experience

The readiness core already accepts 1–8 checks per demonstrated step, and the
lesson already handles separate manual and computed geometric evidence. The
authoring page previously emitted exactly one check per step. Selecting a
geometric binding therefore left no editor path to retain a separate physical
completion condition, despite the page explaining that such conditions need
their own reports.

The existing authoring page now adds and removes distinct check rows. Each row
retains its own prompt, author explanation and optional geometric binding and
dimensions. The first row keeps the legacy `completion` identity; additional
identities are monotone within the current draft and never reassigned after a
removal. One row must remain and at most eight can be present. Addition focuses
the new prompt; removal focuses a neighboring surviving prompt. Both operations
retire pending source replacements through the existing revision token.

No readiness schema, completion arithmetic, observation type, frozen study,
first prediction or prerequisite declaration changes. Reopening existing studies
uses their original definitions unchanged. The existing core requires all checks
to pass before a step receives completion credit. A geometric pass does not
supply a separately reported material/support condition; an authored report is
still only a report, not verified physical readiness or safe operation.

## Verification

```sh
node --test test/readiness-multiple-checks.test.mjs
node tools/browser-readiness-multiple-checks.mjs
```

The native control combines an actual calibrated-practice session with a separate
reported support check on the same step. Geometry passes while the other check
remains unobserved; readiness stays blocked. Unknown and failed reports remain
blocked; an explicit authored pass then satisfies the declared conjunction.
A later reported revision retires downstream completion while preserving both
original event history and the earlier judgment. Wrong-kind evidence cannot
bypass the geometric practice binding. Original ordering attempts and raw reopen
are unchanged.

The actual-browser course uses authored original PNGs and the maintained practice
consumer to create empty, failed and passing sessions. It exercises keyboard
addition/focus, 1–8 editor limits, stable identities after removal, a delayed
source-file read retired by a new check, geometry-pass/support-unknown behavior,
the separate explicit report, raw download/fresh reopen and 390px receiving.
It also retains the existing foreign-target and stale-practice-file controls.
The production rows are accessible groups inside the original per-step
fieldsets, preserving ordinary single-check authoring and existing browser
receivers. The browser command uses the same sandboxed Puppeteer/runtime
configuration as the maintained readiness courses.

Receiving on merged parent `5b72d4e09ca886e8190e9f106d5b7b5e6be422b1` passed
794 native tests and the actual multi-check browser course under Node 22.23.4
and sandboxed Chrome 156. The receiver initially held both the outer source
file and an internal demonstration read; narrowing its gate to the intended
outer upload fixed the receiver, while retaining all five stale-image disposal
assertions. Desktop and 390px rendered output were inspected. Exact published
and merged-source receiving is recorded on issue #263 and its pull request.
These are authored teaching controls, not a physical demonstration or measured
learning improvement.

Inspected original consumer blobs: `web/task-readiness.mjs`
`6ae00c8e7c613db35d635c76b8ef1c905134d097`, and HTML
`f1b5916f5881b895c45f0147663cb25197d50789`.
