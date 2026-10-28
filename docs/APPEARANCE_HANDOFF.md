# Compare retained originals directly from the sequence studio

The sequence studio can send two or more retained original frames directly to the appearance comparison page. An authored skill step is not required. This closes the capture-to-comparison path without exporting and reopening an intermediate file.

## User path

1. Open a local original clip in the sequence studio and retain at least two frames, or reopen an original sequence that already contains them.
2. Choose **Compare retained frames in a new tab** in the retained-evidence section.
3. The comparison page verifies the complete original sequence and PNG bytes before offering the pair controls.
4. Compare the selected frames, then save the original evidence and comparison settings. Reopening that file recomputes the appearance result.

An unfinished step draft stays in the studio. Comparison neither commits nor clears it. Two retained moments with zero authored steps are sufficient, while the ordinary lesson export keeps its existing step requirement. If the studio changes after a snapshot has been sent, its status explains that the comparison received the earlier retained snapshot and that later edits remain in the studio.

## Source and lifecycle

The producer takes an immutable snapshot of the current sequence title/context and saved original source/assets. It uses the existing transient tab-to-tab transport through a separate appearance namespace. The receiver accepts an original sequence bundle through this channel and verifies source admission before acknowledging it. Saved appearance comparison bundles can still be reopened through the normal file input; the channel does not admit them as fresh originals.

The shared transport retains the existing decision-practice route, namespace, messages and handshake. Each appearance transfer uses a fresh random token, a bounded timeout and a dedicated BroadcastChannel. The popup clears its opener. No server upload, database or localStorage persistence is introduced.

Manual input, cancellation and page exit retire an in-flight transfer. Revision and source-admission guards prevent a late transfer from replacing newer input. Superseded assets are released. A blocked popup reports the failure while keeping the retained frames and draft available for retry.

The comparison remains a bounded image-appearance measurement. Source hashes bind retained bytes and declared identities; they do not authenticate physical provenance. Image shifts and residuals do not establish object motion, contact, physical correspondence or skill quality. See `APPEARANCE_PAIR.md` for the numerical and persistence contract.

## Exact change and integration order

Apply this additive change after the qualified ordinary appearance-pair feature on maintained head `e9a29b3ead307ea2e79aaeb0ffdf1f8a47da6cfd`. The four product paths are `web/decision-handoff.mjs`, `web/appearance-pair-app.mjs`, `web/sequence.mjs` and `web/sequence.html`. Existing server routes and CSP are unchanged. Baseline bytes and SHA256 values are retained in the source packet so later integration can reconcile against current main without replacing unrelated work.

This downstream handoff does not implement or claim automatic moment acquisition, the separately owned pair-acquisition work, or physical-action classification. The source and execution evidence is local; no repository commit, merge, deployment or installed application is confirmed by this packet.

## Qualification

Independent source review found no blocking issue in the shared transport, producer snapshot, draft preservation or receiver cancellation/custody lifecycle. The review's historical note that browser receiving remained pending is resolved by the separate later browser receipt, not by changing the review's original scope.

Four actual browser groups passed on Chrome 156.0.8078.73 with non-root Namespace and Seccomp sandboxing:

- Two ordinary original captures with zero steps were received, compared, saved and reopened with exact original PNG custody and the unsaved draft retained.
- A real source message was held while a manual four-frame source was opened; releasing the old callback did not replace the newer source.
- A blocked popup preserved source and draft, and an actual retry received successfully.
- The existing four-frame, one-step decision-practice handoff retained its complete original source through the shared transport.

A separate narrow-screen visit reopened the already captured two-frame original sequence, retained an unsaved title draft, confirmed the ordinary export disabled and comparison enabled, and found no horizontal overflow at 390 px. The root inspected the producer and receiver screenshots. Screenshots, original clip bytes and PNG payloads remain private and are excluded from the source packet.

The browser harness is `tools/browser-appearance-handoff.mjs`; it uses the unchanged `appearance-browser-helpers.mjs` from the appearance-pair packet. Supply `PLAYWRIGHT_PATH`, `CHROME_BINARY`, `HANDOFF_ORIGIN`, `ACQUIRE_VIDEO`, `ACQUIRE_ATTRIBUTION`, `HANDOFF_LEGACY_SOURCE` and a private `QA_OUTPUT` directory. The harness requires actual sandbox status and original licensed source bytes; it does not manufacture image observations or answers. The producer visual visit is recorded separately and was not a repeat of the four-group course.
