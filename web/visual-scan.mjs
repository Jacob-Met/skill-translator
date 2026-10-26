import {renderChangeRegions} from '/web/scan-change-regions.mjs';
import {renderTranslationComparison} from '/web/visual-translation-view.mjs';
import {createVisualSpanView} from '/web/visual-span-view.mjs';
import {createVisualScanPlan, inspectVisualScan, MAX_SCAN_SAMPLES} from '/src/visual-scan.mjs';
import {samplePresentedFrame} from '/web/video-input.mjs';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
};
const seconds = value => `${value.toFixed(3)} s`;
const level = value => (value * 255).toFixed(2);
const statusLabels = {
  'missing-frame': 'An endpoint was not sampled; no comparison.',
  'same-presented-frame': 'Both requests returned the same presented frame; no time interval was observed.',
  'out-of-order-frame': 'Presented times did not increase; no comparison.',
  'changed-frame-size': 'The sample dimensions changed; no comparison.'
};

export function createVisualScanner({getClip, isBusy, canSelect, beginIO, isCurrent, endIO, cancelIO, onSelect}) {
  let active = null, report = null, pairedHash = null;
  let translationWorker = null, translationOwner = null;
  let translationRadius = null;
  let renderedReport = null;
  const spanView=createVisualSpanView({host:$('scan-results'),isBusy,canSelect,onSelect:selectFrame});
  const say = text => { $('scan-status').textContent = text; };

  function stopTranslation() {
    translationWorker?.terminate(); translationWorker = null; translationOwner = null;
    translationRadius = null;
  }

  function compareTranslations(radius) {
    if (!report || report.translations?.[radius] || report.translationErrors?.[radius]
      || (translationOwner === report && translationRadius === radius)) return;
    stopTranslation();
    const owner = report;
    owner.translations ??= {}; owner.translationErrors ??= {};
    try {
      const worker = new Worker('/web/visual-translation-worker.mjs', {type: 'module'});
      translationWorker = worker; translationOwner = owner; translationRadius = radius;
      const current = () => translationWorker === worker && report === owner
        && getClip()?.identity.sha256 === owner.plan.clip.sha256;
      const failed = message => {
        if (!current()) return;
        owner.translationErrors[radius] = message; stopTranslation(); renderReport();
      };
      worker.onmessage = ({data}) => {
        if (!current()) return;
        if (data.type === 'progress') {
          $('scan-translation-summary').textContent = `Comparing image shifts within ±${radius} sampled pixels · ${data.completed} of ${data.total} intervals. Original scores and images stay available.`;
        } else if (data.type === 'error') failed(data.message);
        else if (data.type === 'result') {
          owner.translations[radius] = data.result; stopTranslation();
          const focused = document.activeElement, sample = focused?.dataset.sample;
          const interval = focused?.closest('.scan-interval')?.dataset.index;
          const comparison = focused?.closest('.scan-translation');
          const paging = focused?.dataset.translationPage;
          const comparisonControl = paging ? `button[data-translation-page="${paging}"]`
            : focused?.tagName === 'SUMMARY' && comparison ? 'summary' : null;
          renderReport();
          if (sample !== undefined && interval !== undefined)
            $('scan-intervals').querySelector(`.scan-interval[data-index="${interval}"] button[data-sample="${sample}"]`)?.focus({preventScroll: true});
          else if (comparisonControl && interval !== undefined)
            $('scan-intervals').querySelector(`.scan-interval[data-index="${interval}"] .scan-translation[data-radius="${comparison.dataset.radius}"] ${comparisonControl}`)?.focus({preventScroll: true});
        }
      };
      worker.onerror = event => { event.preventDefault(); failed(event.message || 'Image-shift comparison failed.'); };
      // Clone into the worker. Never detach the accepted sample buffers.
      worker.postMessage({plan: owner.plan, samples: owner.samples, options: {radius}});
    } catch (error) {
      owner.translationErrors[radius] = String(error.message || error); stopTranslation();
    }
  }

  function sync() {
    const busy = isBusy();
    spanView.sync();
    $('scan-start').disabled = busy || !getClip();
    $('scan-cancel').disabled = !active || !isCurrent(active);
    for (const id of ['scan-from', 'scan-until', 'scan-count', 'scan-order']) $(id).disabled = busy;
    for (const button of $('scan-intervals').querySelectorAll('button:not([data-translation-page])')) button.disabled = busy || !canSelect();
  }

  function preview(frame) {
    const sample = report.samples[frame.index];
    const canvas = node('canvas');
    canvas.width = sample.widthPx; canvas.height = sample.heightPx;
    canvas.getContext('2d').putImageData(new ImageData(sample.rgba, sample.widthPx, sample.heightPx), 0, 0);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Small scan preview at presented ${seconds(frame.presentedSeconds)}`);
    const figure = node('figure');
    figure.append(canvas, node('figcaption', `Scan preview · presented ${seconds(frame.presentedSeconds)} · requested ${seconds(frame.requestedSeconds)}`));
    $('scan-preview').replaceChildren(figure);
  }

  function selectFrame(frame) {
    if (!report || isBusy() || !canSelect() || getClip()?.identity.sha256 !== report.plan.clip.sha256) return;
    preview(frame);
    onSelect(frame.presentedSeconds);
    say(`Inspect the clip around ${seconds(frame.presentedSeconds)}. Retain a moment below to save its original pixels and actual presented time.`);
  }

  function renderReport() {
    const viewStates = new Map();
    if (report && renderedReport === report) for (const view of $('scan-intervals').querySelectorAll('.scan-translation')) {
      const interval = view.closest('.scan-interval').dataset.index;
      viewStates.set(`${interval}/${view.dataset.radius}`, {expanded: view.querySelector('details')?.open === true, page: Number(view.dataset.page) || 0});
    }
    $('scan-intervals').replaceChildren();
    $('scan-results').hidden = !report;
    spanView.receive(report);
    if (!report) { renderedReport = null; $('scan-preview').replaceChildren(); $('scan-translation-summary').textContent = ''; return; }
    const result = inspectVisualScan(report.plan, report.samples);
    const {plan} = result;
    $('scan-summary').textContent = `${result.sampledCount} of ${plan.sampleCount} requested images sampled from ${seconds(plan.startSeconds)} to ${seconds(plan.endSeconds)}; ${result.comparedCount} of ${result.intervals.length} adjacent intervals compared. Intervening frames were not inspected.`;
    const metric = $('scan-order').value;
    const wide = metric === 'wideTranslationAdjustedChange';
    const fitted = wide || metric === 'translationAdjustedChange';
    const radius = wide ? 16 : 4;
    if (fitted) {
      // Keep the narrower search when requesting the wider search.
      // One worker runs at a time, and each completed radius belongs to this report.
      const needed = wide && !report.translations?.[4] && !report.translationErrors?.[4] ? 4 : radius;
      if (!wide || !report.translationErrors?.[4]) compareTranslations(needed);
      if (wide && report.translationErrors?.[4]) {
        report.translationErrors[16] ??= `The narrow comparison failed; the wider comparison is withheld. ${report.translationErrors[4]}`;
      }
    }
    const translatedReport = report.translations?.[radius];
    const translationError = report.translationErrors?.[radius];
    const fittedCount = translatedReport?.intervals.filter(interval => Number.isFinite(interval.comparison?.meanAdjustedChange)).length;
    $('scan-translation-summary').textContent = translatedReport
      ? `Image-shift comparison ready. ${fittedCount} of ${result.intervals.length} intervals have a fitted residual. ${wide ? 'Wide ranking uses ±16 sampled pixels; its smaller common interior can omit changes still visible in the retained ±4 comparison and whole-image scores. ' : ''}Ranking uses the remaining RGB difference on common interior pixels. A good fit can also describe real scene motion; compare the original scores and frames.`
      : translationError ? `Image-shift comparison unavailable: ${translationError} Original scores remain; no translated score is substituted.`
      : translationOwner === report ? `Comparing image shifts within ±${translationRadius} sampled pixels. Original scores and images stay available.` : '';
    const intervals = [...result.intervals];
    if (metric !== 'time') intervals.sort((a, b) => {
      if (a.status !== 'compared' || b.status !== 'compared') return (b.status === 'compared') - (a.status === 'compared') || a.index - b.index;
      if (fitted) {
        const score = interval => translatedReport?.intervals[interval.index]?.comparison?.meanAdjustedChange;
        const aa = score(a), bb = score(b), haveA = Number.isFinite(aa), haveB = Number.isFinite(bb);
        return Number(haveB) - Number(haveA) || (haveA && haveB ? bb - aa : 0) || a.index - b.index;
      }
      return b[metric] - a[metric] || a.index - b.index;
    });
    for (const interval of intervals) {
      const item = node('li', undefined, 'scan-interval');
      item.dataset.index = String(interval.index);
      item.dataset.state = interval.status;
      item.append(node('strong', `Requested ${seconds(interval.before.requestedSeconds)} → ${seconds(interval.after.requestedSeconds)}`));
      if (interval.status === 'compared') {
        item.append(node('p', `Mean channel change · raw ${level(interval.meanAbsoluteChange)} · adjusted ${level(interval.meanAdjustedChange)} levels. Uniform shift ${interval.uniformBrightnessShift >= 0 ? '+' : ''}${interval.uniformBrightnessShift}; ${(interval.changedPixelFraction * 100).toFixed(1)}% of sampled pixels have a residual channel change of at least 16 levels.`, 'scan-measures'));
        item.append(node('p', `Presented interval ${seconds(interval.before.presentedSeconds)} → ${seconds(interval.after.presentedSeconds)}`, 'note'));
        for (const shownRadius of wide ? [16, 4] : [4]) {
          const translated = report.translations?.[shownRadius]?.intervals[interval.index]?.comparison;
          if (translated) item.append(renderTranslationComparison(translated, {
            ...(wide ? {heading: shownRadius === 16 ? 'Wider search · ±16 sampled pixels' : 'Retained narrow search · ±4 sampled pixels'} : {}),
            ...viewStates.get(`${interval.index}/${shownRadius}`)}));
        }
        item.append(renderChangeRegions(report.samples[interval.before.index], report.samples[interval.after.index]));
      } else item.append(node('p', statusLabels[interval.status], 'note'));
      for (const frame of [interval.before, interval.after]) {
        if (frame.status === 'failed') item.append(node('p', `Frame request failed: ${frame.error}`, 'note'));
      }
      const actions = node('div', undefined, 'actions');
      for (const [label, frame] of [['Inspect earlier', interval.before], ['Inspect later', interval.after]]) {
        if (frame.status !== 'sampled') continue;
        const button = node('button', `${label} · ${seconds(frame.presentedSeconds)}`, 'quiet');
        button.type = 'button'; button.dataset.sample = String(frame.index);
        button.addEventListener('click', () => selectFrame(frame)); actions.append(button);
      }
      const comparisonHost = item.querySelector('.scan-translation');
      const comparisonDetails = comparisonHost?.querySelector('details');
      if (comparisonDetails) comparisonHost.insertBefore(actions, comparisonDetails);
      else item.append(actions);
      $('scan-intervals').append(item);
    }
    renderedReport = report; sync();
  }

  async function scan() {
    const clip = getClip();
    if (!clip || isBusy()) return;
    let plan;
    try {
      for (const id of ['scan-from', 'scan-until', 'scan-count']) if (!$(id).value.trim()) throw Error('Supply the scan interval and sample count.');
      plan = createVisualScanPlan(clip.identity, {startSeconds: Number($('scan-from').value),
        endSeconds: Number($('scan-until').value), sampleCount: Number($('scan-count').value)});
    } catch (error) { say(error.message); return; }
    const request = beginIO(); active = request;
    const samples = [];
    $('scan-progress').hidden = false; $('scan-progress').max = plan.sampleCount; $('scan-progress').value = 0;
    say('Sampling local presented frames. Existing retained moments stay in place.'); sync();
    try {
      for (const requestedSeconds of plan.requestedTimes) {
        try {
          const sample = await samplePresentedFrame(clip, requestedSeconds, {signal: request.signal});
          if (!isCurrent(request) || getClip() !== clip) return;
          samples.push(sample);
        } catch (error) {
          if (!isCurrent(request) || getClip() !== clip) return;
          samples.push({requestedSeconds, error: String(error.message || error).slice(0, 1200)});
          break; // Do not repeatedly drive a failing decoder or bridge its gap.
        }
        $('scan-progress').value = samples.length;
        say(`Sampled ${samples.length} of ${plan.sampleCount} requested frames…`);
      }
      if (!isCurrent(request) || getClip() !== clip) return;
      stopTranslation();
      report = {plan, samples};
      $('scan-preview').replaceChildren(); renderReport();
      say(samples.length === plan.sampleCount && !samples.at(-1)?.error
        ? 'Scan ready. Inspect a pair, then retain the original moments you need.'
        : 'The scan stopped at a decoder failure. Completed comparisons and all missing intervals remain visible.');
    } finally {
      if (active === request) {
        active = null; $('scan-progress').hidden = true;
        if (!isCurrent(request)) say('Scan interrupted. Retained moments and any earlier completed scan are preserved.');
      }
      endIO(request); sync();
    }
  }

  $('scan-start').addEventListener('click', scan);
  $('scan-cancel').addEventListener('click', () => {
    if (!active) return;
    cancelIO(active); active = null; $('scan-progress').hidden = true;
    say('Scan cancelled. Retained moments and any earlier completed scan are preserved.'); sync();
  });
  $('scan-order').addEventListener('change', renderReport);
  for (const id of ['scan-from', 'scan-until', 'scan-count']) $(id).addEventListener('input', () => {
    if (report && !isBusy()) say('Settings changed. Displayed results still use the completed scan; run again to sample the new interval.');
  });

  function clear() {
    stopTranslation();
    active = null; report = null; pairedHash = null;
    $('scan-progress').hidden = true; renderReport();
    say('Pair the original clip to scan its image changes.'); sync();
  }
  function receiveClip() {
    const clip = getClip();
    if (!clip) { clear(); return; }
    if (pairedHash === clip.identity.sha256) { sync(); return; }
    clear(); pairedHash = clip.identity.sha256;
    $('scan-from').value = '0';
    $('scan-until').value = String(Math.max(0, clip.identity.durationSeconds - Math.min(.001, clip.identity.durationSeconds / 2)));
    $('scan-count').value = '24'; $('scan-count').max = String(MAX_SCAN_SAMPLES);
    for (const id of ['scan-from', 'scan-until']) $(id).max = String(clip.identity.durationSeconds);
    say('Choose an interval and sample count. More samples inspect more of the clip.'); sync();
  }
  return {sync, clear, receiveClip};
}
