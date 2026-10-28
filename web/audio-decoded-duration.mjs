// Shared browser decoding only. Byte/duration policy belongs to each receiving caller.
// Timeout/abort retire adoption; they are not a hard decoder-memory bound.
export async function inspectDecodedAudio(file, {signal, timeoutMilliseconds = 15000} = {}) {
  if (signal?.aborted) throw Error('Audio operation replaced');
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Context) throw Error('This browser cannot decode recorded audio');
  let context = null, retired = false, timer;
  const current = () => { if (retired || signal?.aborted) throw Error('Audio operation replaced'); };
  let abort;
  const stopped = new Promise((_, reject) => {
    abort = () => { retired = true; reject(Error('Audio operation replaced')); };
    signal?.addEventListener('abort', abort, {once: true});
    timer = setTimeout(() => { retired = true; reject(Error('Audio duration decoding timed out')); }, timeoutMilliseconds);
  });
  const decode = (async () => {
    const bytes = await file.arrayBuffer(); current();
    context = new Context();
    const audio = await context.decodeAudioData(bytes.slice(0)); current();
    return {durationSeconds: audio.duration};
  })();
  try { return await Promise.race([decode, stopped]); }
  finally {
    retired = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
    // Request close without letting a stalled native close delay retirement.
    if (context) { try { Promise.resolve(context.close()).catch(() => {}); } catch {} }
  }
}
