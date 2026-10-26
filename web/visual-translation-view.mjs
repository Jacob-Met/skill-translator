const node = (tag, text, className) => {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
};

export function renderTranslationComparison(comparison, {heading, expanded = false, page = 0, coverageDescription} = {}) {
  const host = node('div', undefined, 'scan-translation');
  host.dataset.state = comparison.status;
  host.dataset.radius = String(comparison.radius);
  host.dataset.page = '0';
  if (heading !== undefined) host.append(node('h4', heading));
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
  details.dataset.totalAlternatives = String(best.length);
  details.append(node('summary', 'Image-shift alternatives and coverage'));
  const {support} = comparison;
  details.append(node('p', coverageDescription ?? `${comparison.candidateCount} integer shifts within ±${comparison.radius} sampled pixels use the same ${support.width} × ${support.height} interior. ${support.omittedPixels} border pixels are excluded from this comparison; the original whole-image scores above retain them.`, 'note'));
  const list = node('ul');
  list.setAttribute('aria-label', 'Equally best image-shift alternatives');
  const progress = node('p', `${best.length} alternatives retained. Open these details to inspect them in pages of 50.`, 'note');
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  const controls = node('div', undefined, 'actions');
  const previous = node('button', 'Previous alternatives', 'quiet');
  const next = node('button', 'Next alternatives', 'quiet');
  previous.type = next.type = 'button';
  previous.dataset.translationPage = 'previous';
  next.dataset.translationPage = 'next';
  controls.append(previous, next);
  controls.hidden = true;
  const pageSize = 50;
  const lastPage = Math.max(0, Math.ceil(best.length / pageSize) - 1);
  const restoredPage = Number.isFinite(page) ? Math.max(0, Math.min(lastPage, Math.floor(page))) : 0;
  let offset = restoredPage * pageSize, initialized = false;
  host.dataset.page = String(restoredPage);
  function renderPage() {
    host.dataset.page = String(Math.floor(offset / pageSize));
    const end = Math.min(best.length, offset + pageSize);
    const items = [];
    for (let index = offset; index < end; index++) {
      const alternative = best[index];
      const item = node('li', `x ${alternative.dx}, y ${alternative.dy}; brightness shift ${alternative.uniformBrightnessShift >= 0 ? '+' : ''}${alternative.uniformBrightnessShift} levels${alternative.searchBoundary ? '; search edge' : ''}`);
      item.dataset.translationAlternative = String(index);
      items.push(item);
    }
    list.replaceChildren(...items);
    progress.textContent = `Showing alternatives ${offset + 1}–${end} of ${best.length}. Page ${Math.floor(offset / pageSize) + 1} of ${Math.ceil(best.length / pageSize)}. Every tied alternative remains available.`;
    previous.disabled = offset === 0;
    next.disabled = end === best.length;
    controls.hidden = best.length <= pageSize;
  }
  details.addEventListener('toggle', () => {
    if (!details.open || initialized) return;
    initialized = true;
    renderPage();
  });
  previous.addEventListener('click', () => {
    if (!initialized || offset === 0) return;
    offset = Math.max(0, offset - pageSize); renderPage();
  });
  next.addEventListener('click', () => {
    if (!initialized || offset + pageSize >= best.length) return;
    offset += pageSize; renderPage();
  });
  details.append(progress, list, controls, node('p', comparison.boundary, 'note'));
  host.append(details);
  if (expanded === true) {
    initialized = true;
    details.open = true;
    renderPage();
  }
  return host;
}

