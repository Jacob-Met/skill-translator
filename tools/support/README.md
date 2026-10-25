# Browser admission helper

`chromium-sandbox.mjs` is reused byte-for-byte from the maintained SYNAPSE
`scripts/support/chromium-sandbox.mjs` helper. SHA-256:
`4607c67b360596ee06b36e41a6b5d3a8a6da70defb04292d955f609dcef05ead`.
Source repository: https://github.com/Jacob-Met/synapse .

The path-summary course enables Playwright's `chromiumSandbox` explicitly and
uses this helper on a separate caller-owned CDP page before product receiving.
It requires the actually observed Linux namespace and seccomp protections;
failed admission is retained in the receipt and fails the course. No sandbox
flags are relaxed. The helper owns this admission contract; do not duplicate
its parser inside product-specific browser courses.
