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
  const spanView=createVisualSpanView({host:$('scan-results'),isBusy,canSelect,onSelect:selectFrame});
  const say = text => { $('scan-status').textContent = text; };

  function sync() {
    const busy = isBusy();
    spanView.sync();
    $('scan-start').disabled = busy || !getClip();
    $('scan-cancel').disabled = !active || !isCurrent(active);
    for (const id of ['scan-from', 'scan-until', 'scan-count', 'scan-order']) $(id).disabled = busy;
    for (const button of $('scan-intervals').querySelectorAll('button')) button.disabled = busy || !canSelect();
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
    $('scan-intervals').replaceChildren();
    $('scan-results').hidden = !report;
    spanView.receive(report);
    if (!report) { $('scan-preview').replaceChildren(); return; }
    const result = inspectVisualScan(report.plan, report.samples);
    const {plan} = result;
    $('scan-summary').textContent = `${result.sampledCount} of ${plan.sampleCount} requested images sampled from ${seconds(plan.startSeconds)} to ${seconds(plan.endSeconds)}; ${result.comparedCount} of ${result.intervals.length} adjacent intervals compared. Intervening frames were not inspected.`;
    const metric = $('scan-order').value;
    const intervals = [...result.intervals];
    if (metric !== 'time') intervals.sort((a, b) => {
      if (a.status !== 'compared' || b.status !== 'compared') return (b.status === 'compared') - (a.status === 'compared') || a.index - b.index;
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
      item.append(actions); $('scan-intervals').append(item);
    }
    sync();
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
