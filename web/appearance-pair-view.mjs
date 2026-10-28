import {renderTranslationComparison} from './visual-translation-view.mjs';

const node = (doc, tag, text) => {
  const element = doc.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  return element;
};
const shown = value => value == null ? 'Not supplied'
  : typeof value === 'object' ? JSON.stringify(value) : String(value);

/** Present admitted worker output without fitting or promoting source claims.
 * Null retires the displayed result. Original request metadata is retained.
 */
export function renderAppearancePairResult(container, result) {
  container.replaceChildren();
  if (result == null) return;
  const doc = container.ownerDocument;
  const {source, comparison, boundary} = result;
  const request = source.request;
  const host = node(doc, 'section');
  host.className = 'appearance-pair-result';
  host.style.minWidth = '0';
  host.style.overflowWrap = 'anywhere';
  host.dataset.state = comparison.status;
  host.append(node(doc, 'h3', 'Retained-frame appearance comparison'));
  const labels = {
    unique: 'One minimum inside the searched shift range',
    ambiguous: 'Tied minima: no unique sampled shift',
    'search-boundary': 'Minimum at the search boundary',
    'insufficient-common-support': 'Unavailable: insufficient common interior support',
  };
  const status = node(doc, 'p', labels[comparison.status] ?? shown(comparison.status));
  status.className = 'appearance-pair-status';
  status.setAttribute('role', 'status');
  host.append(status);
  if (comparison.status === 'ambiguous') {
    const count = comparison.alternatives.filter(item => item.searchBoundary).length;
    host.append(node(doc, 'p', count + ' of the retained tied minima reach the search boundary. Larger shifts were not searched.'));
  } else if (comparison.status === 'search-boundary') {
    host.append(node(doc, 'p', 'Larger shifts were not searched; this is not an interior optimum.'));
  }

  const metadata = node(doc, 'dl');
  metadata.className = 'appearance-pair-settings';
  const row = (label, value) => metadata.append(node(doc, 'dt', label), node(doc, 'dd', shown(value)));
  row('Retained clip SHA-256', request.clipSha256);
  for (const [index, frame] of request.frames.entries()) {
    const label = index === 0 ? 'Before' : 'After';
    row(label + ' moment ID', frame.momentId);
    row(label + ' retained frame SHA-256', frame.sha256);
    row(label + ' presented source time (s)', frame.presentedSeconds);
  }
  row('Sample raster width × height (pixels)', shown(request.widthPx) + ' × ' + shown(request.heightPx));
  row('Sampler settings', request.sampler);
  row('Requested reference support (sample pixels)', request.support);
  row('Integer search radius (sample pixels)', comparison.radius);
  row('Brightness convention', request.brightnessConvention);
  const support = comparison.support;
  host.append(renderTranslationComparison(comparison, {
    heading: 'Same-support residual and all retained minima',
    expanded: true,
    coverageDescription: support
      ? comparison.candidateCount + ' integer shifts use the same reference support: left '
        + support.left + ', top ' + support.top + ', width ' + support.width + ', height '
        + support.height + ' sampled pixels. ' + support.pixelCount + ' pixels compared; '
        + support.omittedPixels + ' pixels omitted. No smaller-overlap candidate is favored.'
      : undefined,
  }));
  host.append(node(doc, 'p',
    'Shift x/y are integer sampled-pixel offsets: before(x,y) is compared with after(x+dx,y+dy). '
    + 'Brightness shift is one shared additive offset across RGB channels, in 8-bit channel levels. '
    + 'Adjusted mean residual is the mean absolute RGB difference after that offset; the displayed levels equal the normalized residual × 255. '
    + 'Neither the shift nor brightness adjustment establishes physical correspondence.'));
  const sourceDetails = node(doc, 'details');
  sourceDetails.className = 'appearance-pair-source-details';
  sourceDetails.append(node(doc, 'summary', 'Source identities and sampling settings'), metadata);
  host.append(sourceDetails);
  host.append(node(doc, 'p', boundary ?? comparison.boundary
    ?? 'Finite sampled-image appearance only; no action, category, camera motion or physical correspondence is established.'));
  container.append(host);
  return host;
}
