// Built only for the immutable cue arrays admitted by validateManifest.
// Each interval belongs to one centered tree node. Its two ordered views let
// a source-time lookup visit one tree path and only matching intervals.
function treeFor(ordered) {
  if (!ordered.length) return null;
  const center = ordered[ordered.length >> 1].cue.start;
  const left = [], middle = [], right = [];
  for (const entry of ordered) {
    if (entry.cue.end <= center) left.push(entry);
    else if (entry.cue.start > center) right.push(entry);
    else middle.push(entry);
  }
  return { center, starts: middle,
    ends: [...middle].sort((a, b) => b.cue.end - a.cue.end || a.order - b.order),
    left: treeFor(left), right: treeFor(right) };
}

export function createCueLookup(cues) {
  const ordered = cues.map((cue, order) => ({ cue, order }))
    .sort((a, b) => a.cue.start - b.cue.start || a.order - b.order);
  const tree = treeFor(ordered);
  const boundaries = [...new Set(cues.flatMap(cue => [cue.start, cue.end]))].sort((a, b) => a - b);
  let lower = Infinity, upper = -Infinity, cached = [];
  // Dense overlap needs a full output anyway. Stop the tree walk early and
  // preserve source order with the original scan instead of sorting a huge hit list.
  const sparseLimit = Math.max(32, cues.length >> 3);
  return time => {
    if (!Number.isFinite(time)) return [];
    if (lower <= time && time < upper) return cached.slice();
    let low = 0, high = boundaries.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (boundaries[mid] <= time) low = mid + 1;
      else high = mid;
    }
    lower = low ? boundaries[low - 1] : -Infinity;
    upper = low < boundaries.length ? boundaries[low] : Infinity;
    const hits = [];
    let node = tree;
    while (node && hits.length <= sparseLimit) {
      if (time < node.center) {
        for (const entry of node.starts) {
          if (entry.cue.start > time || hits.length > sparseLimit) break;
          hits.push(entry);
        }
        node = node.left;
      } else {
        for (const entry of node.ends) {
          if (entry.cue.end <= time || hits.length > sparseLimit) break;
          hits.push(entry);
        }
        node = node.right;
      }
    }
    cached = hits.length > sparseLimit
      ? cues.filter(cue => cue.start <= time && time < cue.end)
      : hits.sort((a, b) => a.order - b.order).map(entry => entry.cue);
    // Callers historically receive their own mutable result array. Never expose
    // the cached array: sorting/removing one result must not alter later frames.
    return cached.slice();
  };
}
