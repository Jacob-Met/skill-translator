// An authored presentation path, never an estimate of a sound's physical source.
// Coordinates use the same normalized video space as the cue's starting anchor.
export function validateSoundMotion(raw, cue, prefix = "soundMotion") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.mode !== "linear" ||
      Object.keys(raw).some(key => key !== "mode" && key !== "to"))
    throw new Error(`${prefix} must contain a linear mode and an end point`);
  if (cue.kind !== "sound" || !cue.anchor)
    throw new Error(`${prefix} needs a positioned sound cue`);
  const to = raw.to;
  if (!to || typeof to !== "object" || Array.isArray(to) ||
      Object.keys(to).some(key => key !== "x" && key !== "y") ||
      [to.x, to.y].some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1))
    throw new Error(`${prefix}.to coordinates must be finite numbers between 0 and 1`);
  return Object.freeze({ mode: "linear", to: Object.freeze({ x: to.x, y: to.y }) });
}

export function soundMotionDocument(motion) {
  return { mode: motion.mode, to: { x: motion.to.x, y: motion.to.y } };
}

// Stateless media-clock sampling also makes pause, seek and retiming deterministic.
// Readability fitting can displace this preferred point; it is not localization.
export function soundAnchorAtTime(cue, time, { enabled = false, reducedMotion = false } = {}) {
  if (!enabled || reducedMotion || cue.kind !== "sound" || !cue.anchor || !cue.soundMotion ||
      !Number.isFinite(time) || !(cue.end > cue.start)) return cue.anchor;
  const progress = Math.max(0, Math.min(1, (time - cue.start) / (cue.end - cue.start)));
  return {
    x: cue.anchor.x + (cue.soundMotion.to.x - cue.anchor.x) * progress,
    y: cue.anchor.y + (cue.soundMotion.to.y - cue.anchor.y) * progress
  };
}
