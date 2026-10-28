# Explicit restart after a missing observation

A stopped temporal proposal can now continue from a separately authored point. This reuses the existing grayscale producer and its unchanged matcher. It does not infer identity or continuity across a gap, recover an occluded point automatically, or change calibration.

## Ordinary workflow

1. Open a supplied temporal report in the sampled-path page. Review its original frames. Apply a correction at a later visible point, keep the intervening missing observation explicit, and accept the reviewed ordinary path.
2. In **Explicit restart after a missing observation**, choose that already applied anchor and supply its restart basis. Export the request. The complete original bundle, accepted prefix, explicit gaps, and independent corrections are retained.
3. Run:

   ```sh
   node tools/temporal-points/restart.mjs temporal-restart-request.json new-restart-report.json
   ```

   The wrapper invokes `produce.py` with `--profile grayscale-probe`. Use the dependencies and grayscale limitations documented in TEMPORAL_POINTS.md. `TEMPORAL_PYTHON` optionally selects the Python executable. Output must be a new path.
4. Open the resulting report in the same temporal input. Inspect every displayed suffix original and alternatives, edit or mark missing as necessary, and explicitly review before acceptance. The original accepted common-frame declaration is displayed in the ordinary form. Changing it prevents resumed acceptance. The displayed restart anchor is fixed by the accepted prefix: its coordinates and basis are read-only, and correction/missing actions are disabled. A changed anchor requires a new request; native admission also rejects changes to its point, basis, missing status or provenance rather than silently discarding them.
5. Save the resulting ordinary sampled path. Original PNGs and prior accepted samples through the anchor remain exact. The missing observation remains a gap. Later independently authored corrections remain exact and override inherited automatic suggestions.

Editing the accepted form retires the restart controls. Source replacement retires pending state. Typed corrections must be applied or marked missing before acceptance. A restart report retains its full request for source-bound reopening; an ordinary saved sampled path is an authored result, not a reconstructed native matching certificate. This first consumer exposes restart from a newly accepted temporal correction; it does not automatically recover restart authority from an arbitrary saved ordinary path.

## Source and computation boundaries

Requests and complete reports are bounded to 48 MiB. Admission binds the exact parent selection, original source/calibration and annotations, accepted point/basis, full original image bundle, suffix query, and explicit anchor. The unchanged producer performs PNG decode, local search and reverse-cycle checks. The wrapper rechecks request bytes and its own/core source before exclusive no-replace publication. These checks are not exhaustive transitive execution attestation. Native evidence supplied in a report remains supplied evidence, not independent identity certification.

The accepted prefix is retained rather than re-authored under the new suffix label. An independently authored later point or missing decision is preserved, and dependent automatic successors are retired. Neither a restart nor a fractional anchor creates observations inside the missing interval.

## Executed comparison and verification

The authored four-frame grayscale course contains a flat second original. The original producer yields anchor, insufficient texture, unresolved predecessor, unresolved predecessor. An explicit correction at frame 3 `(106.25, 101.75)` permits an independently reviewed suffix ending `(109.25, 104.75)` through the same native producer. This is an authored translational raster course, not arbitrary real-video robustness; the repeated-identical-distractor limitation still applies.

The baseline requires constructing a separate suffix selection/query and entering its anchor again, then reconciling prefix samples into an ordinary result. The new consumer exports the applied anchor and suffix directly and retains the accepted prefix exactly. It still requires an explicit restart basis, offline producer invocation, and per-frame human review. No reduction in semantic review or source-annotation cost is claimed.

Fresh candidate receiving:

- Five native restart groups: exact prefix/gap, changed source/anchor refusal, later independent correction, explicit anchor/accepted-parent/review requirements.
- Three actual offline CLI groups: unchanged native suffix production, exact retained prefix/gap, and existing-output/changed-source refusals.
- Eleven actual strict-sandbox browser groups: ordinary accepted-anchor export, source-bound suffix import, premise retirement, mandatory review, changed-frame refusal, ordinary save and narrow layout. The saved artifact preserves exact original PNG strings and accepted prefix samples/moments.
- Twelve retained temporal browser groups, including unapplied drafts, cross-row correction preservation and transferred-media custody.
- Seven byte-exact routes (including the concurrent rehearsal source module) through the maintained native HTTP server. The browser course uses a separate static test host; this route course independently verifies production serving.

Run `node test/temporal-point-restart.test.mjs`, `node tools/receive-temporal-restart.mjs`, and `node tools/receive-temporal-restart-routes.mjs`. The browser driver is `tools/browser-temporal-restart.py`, using the same separately launched nonroot sandboxed Chrome arrangement as `tools/browser-temporal.py`.

Independent source review found no scoped blocker in core/wrapper and UI lifecycle. Issue #454 preserves #64 pair matching, #388 midpoint acquisition and #400 exhaustive search ownership; none of those mechanisms is duplicated.
