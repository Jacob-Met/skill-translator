const node = (tag, text, className) => {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
};

export function renderTranslationComparison(comparison) {
  const host = node('div', undefined, 'scan-translation');
  host.dataset.state = comparison.status;
  if (comparison.status === 'insufficient-common-support') {
    host.append(node('p', 'Image-shift comparison unavailable: this sample is too small for common interior support.', 'note'));
    return host;
  }
  const residual = (comparison.meanAdjustedChange * 255).toFixed(2);
  const original = (comparison.zero.meanAdjustedChange * 255).toFixed(2);
  host.append(node('p', `After fitting image shift · ${residual} levels remain, compared with ${original} without translation on the same interior pixels.`, 'scan-measures'));
  const best = comparison.alternatives;
  const description = best.length > 1
    ? `${best.length} equally best image shifts; no unique translation is identified.`
    : `Best sampled shift: x ${best[0].dx >= 0 ? '+' : ''}${best[0].dx}, y ${best[0].dy >= 0 ? '+' : ''}${best[0].dy} pixels.${best[0].searchBoundary ? ' It reaches the search edge; larger shifts were not compared.' : ''}`;
  host.append(node('p', description, 'note'));
  const details = node('details');
  details.append(node('summary', 'Image-shift alternatives and coverage'));
  const {support} = comparison;
  details.append(node('p', `${comparison.candidateCount} integer shifts within ±${comparison.radius} sampled pixels use the same ${support.width} × ${support.height} interior. ${support.omittedPixels} border pixels are excluded from this comparison; the original whole-image scores above retain them.`, 'note'));
  const list = node('ul');
  for (const alternative of best) list.append(node('li', `x ${alternative.dx}, y ${alternative.dy}; brightness shift ${alternative.uniformBrightnessShift >= 0 ? '+' : ''}${alternative.uniformBrightnessShift} levels${alternative.searchBoundary ? '; search edge' : ''}`));
  details.append(list, node('p', comparison.boundary, 'note'));
  host.append(details);
  return host;
}
