# Maintained exact half-plane geometry

`exact-halfplanes.mjs` is an unmodified source copy from [CHRONOS VISION](https://github.com/Jacob-Met/chronos-vision/blob/4cd60f5d9bca75065cbc4c47c3562156b1c69364/app/exact-halfplanes.mjs), commit `4cd60f5d9bca75065cbc4c47c3562156b1c69364` (PR72). `source-lock.json` binds the path and SHA-256 bytes.

CHRONOS owns the rational arithmetic, outward binary64 enclosure and bounded convex half-plane clipping. SKILL TRANSLATOR consumes it for source-conditioned affine response constraints. There are no local algorithm modifications. The consumer does not import motion replay, forecasting, video, UI or source-file dependencies.

Update this file from the maintained source only after receiving its exact changed bytes and both projects' relevant consumer tests. Run `node test/response-family-pin.test.mjs` and `node test/response-family.test.mjs` to check the pin and affine consumer. The shared source's mathematical qualification is separate from physical validity of supplied response assumptions.
