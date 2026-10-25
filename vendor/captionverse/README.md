# Pinned CAPTIONVERSE subtitle admission

These six modules are byte-exact copies of their maintained source in `Jacob-Met/captionverse`, commit `aedd749b9a8eb43af5be838aa4c438d7772956fd`, under `app/`: subtitles.mjs, core.mjs, cue-index.mjs, word-timing.mjs, sound-motion.mjs and review-vtt.mjs. CAPTIONVERSE retains algorithm ownership.

SKILL TRANSLATOR uses `parseSubtitles` for syntax, timing, metadata and declared-source provenance. Its small narration adapter retains literal payloads for attributed quotations, adds narrower resource limits, refuses styling/regions, and compares recognized producer source digests with the selected demonstration clip. It does not copy CAPTIONVERSE's display flattening, inference pipeline or spatial caption model. The reviewed WebVTT serializer is exercised as a maintained producer in native integration tests.

Keep the complete source pin. Upgrade all required dependency files together, verify their Git blob identities and rerun narration plus full native/browser receiving. Do not silently edit the vendored algorithm. Any reusable subtitle correction belongs with CAPTIONVERSE's native owner.
