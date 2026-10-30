import {mountExplanationRecorder} from '/web/explanation-recorder.mjs';
import {createSpokenExplanations, addSpokenExplanation, updateSpokenExplanation, removeSpokenExplanation, MAX_EXPLANATIONS} from '/src/spoken-explanations.mjs';
import {readSequenceBundle, releaseSequenceAssets} from '/web/sequence-input.mjs';
import {loadExplanationAudio, releaseExplanationAudio, releaseExplanationAssets,
  makeSpokenExplanationBundle, readSpokenExplanationBundle} from '/web/spoken-explanation-input.mjs';

const $ = id => document.getElementById(id);
let accepted = null, notebook = null, audioAssets = new Map(), draft = null;
let revision = 0, sourceGeneration = 0, audioGeneration = 0;
let receiving = null, loadingAudio = null, saving = null, recorder = null, recorderDraft = false, recorderLoading = false;
let editing = null;
const status = message => { $('status').textContent = message; };
const draftDirty = () => Boolean(draft || $('audio-file').value || $('attribution').value || $('description').value);

function resetRecorder() {
  recorder?.dispose(); recorder = null;
  const targetSource = sourceGeneration, targetStep = $('step').value;
  if (!notebook?.source.steps.some(step => step.id === targetStep) || receiving) return;
  recorder = mountExplanationRecorder($('record-explanation'), {
    limits: {maxBytes: 4 * 1024 * 1024},
    onKeep: (file, context) => receiveAudio(file, {...context, targetSource, targetStep, fromRecorder: true}),
  });
}

function pausePlayers() { for (const player of document.querySelectorAll('audio')) player.pause(); }
function clearPlayer(player) { player.pause(); player.removeAttribute('src'); player.load(); }

function changed() {
  revision++;
  saving?.abort(); saving = null;
  if (receiving) { receiving.abort(); receiving = null; status('The pending import was replaced by your edit. The accepted notebook is retained.'); }
}

function controls() {
  const step = notebook?.source.steps.find(value => value.id === $('step').value);
  const pending = Boolean(receiving || loadingAudio);
  $('attach').disabled = !step || !draft || !$('attribution').value.trim() || pending || Boolean(editing) || notebook.explanations.length >= MAX_EXPLANATIONS;
  $('discard').disabled = !draftDirty() && !loadingAudio;
  $('save').disabled = !notebook || draftDirty() || pending || Boolean(saving) || Boolean(editing);
  for (const button of $('explanations').querySelectorAll('[data-account-action]')) button.disabled = Boolean(editing || receiving);
  for (const id of ['audio-file', 'attribution', 'description']) $(id).disabled = !step;
  $('attachment-target').textContent = step ? 'Will attach to: ' + step.title : 'Add a before/after step in Demonstration studio first.';
  if (notebook) {
    $('explanation-count').textContent = notebook.explanations.length + ' / ' + MAX_EXPLANATIONS + ' explanations';
    const unique = new Map(notebook.explanations.map(value => [value.audio.sha256, value.audio]));
    const bytes = [...unique.values()].reduce((sum, audio) => sum + audio.sizeBytes, 0);
    $('save-summary').textContent = notebook.explanations.length + ' retained explanation(s), ' + (bytes / 1048576).toFixed(2) + ' / 8 MiB of audio, and every original frame. ' + (editing ? 'Save or cancel the text changes before downloading. ' : '') + (draftDirty() ? 'Attach or discard the current audio draft before saving.' : 'Reopening checks the original media again.');
  }
}

function clearDraft({release = true} = {}) {
  audioGeneration++;
  loadingAudio?.abort(); loadingAudio = null;
  clearPlayer($('draft-audio'));
  if (release) releaseExplanationAudio(draft);
  draft = null; recorderDraft = false;
  $('audio-file').value = ''; $('attribution').value = ''; $('description').value = '';
  $('draft-preview').hidden = true;
  $('audio-status').textContent = 'No audio selected.';
}

function renderStep() {
  pausePlayers();
  for (const player of $('explanations').querySelectorAll('audio')) clearPlayer(player);
  const step = notebook.source.steps.find(value => value.id === $('step').value);
  $('frames').replaceChildren(); $('original-account').replaceChildren(); $('explanations').replaceChildren();
  if (!step) {
    $('step-range').textContent = 'This sequence has no authored before/after steps yet.';
    controls(); return;
  }
  const moments = ['before', 'after'].map(role => notebook.source.moments.find(moment => moment.id === step[role + 'MomentId']));
  $('step-range').textContent = 'Retained presentation times: ' + moments[0].origin.mediaTimeSeconds + '–' + moments[1].origin.mediaTimeSeconds + ' seconds. The explanation has its own recording clock.';
  moments.forEach((moment, index) => {
    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption'), role = document.createElement('span'), link = document.createElement('a');
    image.src = accepted.assets.get(moment.id).media.url; image.alt = moment.label;
    role.className = 'frame-role'; role.textContent = index ? 'After' : 'Before';
    caption.append(role, document.createTextNode(moment.label + ' · ' + moment.origin.mediaTimeSeconds + ' s'));
    link.href = image.src; link.target = '_blank'; link.rel = 'noopener'; link.setAttribute('aria-label', 'Open full original frame: ' + moment.label); link.append(image);
    figure.append(link, caption); $('frames').append(figure);
  });
  for (const [key, label] of [['intent', 'Intended result'], ['visibleChange', 'Visible change'], ['sensoryCue', 'Supplied sensory cue'], ['recoveryCue', 'Recovery account']]) {
    const term = document.createElement('dt'), value = document.createElement('dd');
    term.textContent = label; value.textContent = step[key] || 'Not supplied'; $('original-account').append(term, value);
  }
  const explanations = notebook.explanations.filter(value => value.stepId === step.id);
  if (!explanations.length) {
    const empty = document.createElement('p'); empty.className = 'empty';
    empty.textContent = 'No separate spoken explanation is attached to this step yet.'; $('explanations').append(empty);
  }
  for (const explanation of explanations) {
    const asset = audioAssets.get(explanation.audio.sha256), card = document.createElement('article');
    const generation = sourceGeneration;
    card.className = 'explanation-card'; card.dataset.explanationId = explanation.id;
    const heading = document.createElement('h3'); heading.textContent = explanation.attribution;
    const description = document.createElement('p'); description.textContent = explanation.description || 'No written description supplied.';
    const player = document.createElement('audio'); player.controls = true; player.preload = 'metadata';
    player.src = asset.url; player.setAttribute('aria-label', 'Spoken explanation supplied by ' + explanation.attribution);
    const currentCard = () => card.isConnected && generation === sourceGeneration && !receiving &&
      player.getAttribute('src') === asset.url && notebook?.explanations.some(value =>
        value.id === explanation.id && value.audio.sha256 === explanation.audio.sha256);
    player.addEventListener('play', () => {
      if (!currentCard() || player.paused || player.currentSrc !== asset.url) return;
      for (const other of document.querySelectorAll('audio')) if (other !== player) other.pause();
    });
    player.addEventListener('error', () => {
      if (currentCard()) {
        status('Playback could not continue for ' + explanation.audio.name + '. Its retained bytes and the accepted notebook are unchanged.');
      }
    });
    const metadata = document.createElement('p'); metadata.className = 'audio-meta';
    metadata.textContent = explanation.audio.name + ' · ' + asset.durationSeconds.toFixed(2) + ' s · ' + explanation.audio.sizeBytes.toLocaleString() + ' bytes';
    const end = document.createElement('div'), label = document.createElement('span'), remove = document.createElement('button'), edit = document.createElement('button');
    end.className = 'card-end actions'; label.className = 'audio-meta'; label.textContent = 'Separately supplied account';
    remove.type = 'button'; remove.className = 'remove'; remove.textContent = 'Remove';
    remove.dataset.accountAction = 'remove';
    remove.setAttribute('aria-label', 'Remove explanation supplied by ' + explanation.attribution);
    edit.type = 'button'; edit.textContent = 'Edit text'; edit.dataset.accountAction = 'edit';
    edit.setAttribute('aria-label', 'Edit text for explanation supplied by ' + explanation.attribution);
    edit.onclick = () => {
      if (editing || !currentCard()) return;
      // Text correction has its own draft; it never borrows the audio attachment form.
      const current = notebook.explanations.find(value => value.id === explanation.id);
      const form = document.createElement('form'), attributionLabel = document.createElement('label'), attribution = document.createElement('input');
      const descriptionLabel = document.createElement('label'), written = document.createElement('textarea');
      const saveText = document.createElement('button'), cancel = document.createElement('button'), error = document.createElement('p');
      const actions = document.createElement('div'); actions.className = 'actions';
      form.dataset.correctionForm = ''; form.setAttribute('aria-label', 'Correct retained explanation text');
      const token = {id: current.id, stepId: current.stepId, generation, audio: {...current.audio}, form};
      attributionLabel.textContent = 'Who supplied this explanation'; attribution.type = 'text'; attribution.maxLength = 240;
      attribution.value = current.attribution; attributionLabel.append(attribution);
      attribution.name = 'correction-attribution';
      descriptionLabel.textContent = 'Written description'; written.maxLength = 1800; written.rows = 4;
      written.value = current.description; descriptionLabel.append(written);
      written.name = 'correction-description';
      for (const field of [attribution, written]) field.addEventListener('input', () => {
        if (editing !== token) return;
        changed(); controls();
      });
      saveText.type = 'submit'; saveText.textContent = 'Save text'; cancel.type = 'button'; cancel.textContent = 'Cancel';
      error.setAttribute('role', 'alert');
      const finish = () => {
        if (editing !== token) return;
        editing = null; form.remove(); edit.hidden = false; controls(); edit.focus();
      };
      const cancelEdit = () => { if (editing !== token) return; finish(); status('Text changes canceled. Retained explanations and the audio draft are unchanged.'); };
      cancel.onclick = cancelEdit;
      form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); cancelEdit(); } });
      form.onsubmit = event => {
        event.preventDefault();
        const retained = notebook?.explanations.find(value => value.id === token.id);
        if (editing !== token || !currentCard() || token.generation !== sourceGeneration ||
          token.stepId !== $('step').value || retained?.stepId !== token.stepId ||
          !['sha256', 'mimeType', 'sizeBytes', 'name'].every(key => retained?.audio[key] === token.audio[key])) {
          error.textContent = 'This explanation is no longer available for this edit. The accepted notebook is unchanged.';
          return;
        }
        try {
          const next = updateSpokenExplanation(notebook, accepted.sequence, token.id, {attribution: attribution.value, description: written.value});
          changed(); notebook = next;
          const updated = notebook.explanations.find(value => value.id === token.id);
          heading.textContent = updated.attribution; description.textContent = updated.description || 'No written description supplied.';
          player.setAttribute('aria-label', 'Spoken explanation supplied by ' + updated.attribution);
          edit.setAttribute('aria-label', 'Edit text for explanation supplied by ' + updated.attribution);
          remove.setAttribute('aria-label', 'Remove explanation supplied by ' + updated.attribution);
          finish(); status('Explanation text saved. The original demonstration and recording are unchanged. Download the notebook to keep the correction.');
        } catch (failure) { error.textContent = 'Text change refused: ' + failure.message + ' The accepted notebook is unchanged.'; }
      };
      actions.append(saveText, cancel); form.append(attributionLabel, descriptionLabel, actions, error);
      changed(); editing = token; edit.hidden = true; card.append(form); controls(); attribution.focus();
    };
    remove.onclick = () => {
      if (editing || !currentCard()) return;
      changed(); notebook = removeSpokenExplanation(notebook, explanation.id); clearPlayer(player);
      if (!notebook.explanations.some(value => value.audio.sha256 === explanation.audio.sha256)) {
        releaseExplanationAudio(audioAssets.get(explanation.audio.sha256)); audioAssets.delete(explanation.audio.sha256);
      }
      renderStep(); status('Explanation removed from this notebook. The original demonstration is unchanged.');
    };
    end.append(label, edit, remove); card.append(heading, description, player, metadata, end); $('explanations').append(card);
  }
  controls();
}

function install(next) {
  editing = null;
  pausePlayers(); clearDraft();
  if (accepted) releaseSequenceAssets(accepted.assets);
  releaseExplanationAssets(audioAssets);
  accepted = next.accepted; notebook = next.notebook; audioAssets = next.audioAssets;
  sourceGeneration++;
  $('source-title').textContent = notebook.source.title;
  $('source-context').textContent = notebook.source.context || 'No additional source context supplied.';
  $('step').replaceChildren(...notebook.source.steps.map(step => new Option(step.title, step.id)));
  $('workspace').hidden = false; $('keep-work').hidden = false;
  renderStep(); resetRecorder();
}

function releaseReceived(next) {
  if (!next) return;
  releaseSequenceAssets(next.accepted.assets); releaseExplanationAssets(next.audioAssets);
}

async function open(file, complete) {
  if (!file) return;
  changed(); pausePlayers();
  loadingAudio?.abort(); loadingAudio = null; audioGeneration++;
  const controller = new AbortController(), version = revision;
  receiving = controller; resetRecorder(); controls();
  status('Opening ' + file.name + '. The accepted notebook stays in place until all original media checks finish.');
  let next = null;
  try {
    if (complete) next = await readSpokenExplanationBundle(file, {signal: controller.signal});
    else {
      const source = await readSequenceBundle(file, {signal: controller.signal});
      next = {accepted: source, notebook: createSpokenExplanations(source.sequence), audioAssets: new Map()};
    }
    if (version !== revision || receiving !== controller || controller.signal.aborted) { releaseReceived(next); return; }
    receiving = null; install(next);
    status(complete ? 'Complete notebook reopened. Original frames and audio bytes checked; choose a step and press play when ready.' : 'Original frames checked. Choose a step and add a separately supplied explanation.');
  } catch (error) {
    if (version === revision && receiving === controller) status('Import refused: ' + error.message + ' The accepted notebook is unchanged.');
  } finally { if (receiving === controller) receiving = null; if (!recorder) resetRecorder(); controls(); }
}

for (const [id, complete] of [['source', false], ['notebook-file', true]]) {
  $(id).onchange = () => { const file = $(id).files[0]; $(id).value = ''; open(file, complete); };
}
$('step').onchange = () => {
  const canceledEdit = Boolean(editing); editing = null;
  changed();
  if (recorderDraft) {
    if (loadingAudio && !recorderLoading) {
      // Retire the old recorded preview without cancelling the newer ordinary file intake.
      clearPlayer($('draft-audio')); releaseExplanationAudio(draft); draft = null; recorderDraft = false;
      $('draft-preview').hidden = true;
    } else clearDraft();
  } else if (recorderLoading) { audioGeneration++; loadingAudio?.abort(); loadingAudio = null; }
  resetRecorder(); renderStep();
  if (canceledEdit) status('Unapplied text changes canceled when changing steps. Retained explanations are unchanged.');
};
for (const id of ['attribution', 'description']) $(id).addEventListener('input', () => { changed(); controls(); });

async function receiveAudio(file, {signal, isCurrent = () => true, targetSource = sourceGeneration, targetStep, fromRecorder = false} = {}) {
  const currentTarget = () => !signal?.aborted && isCurrent() && targetSource === sourceGeneration && (!fromRecorder || targetStep === $('step').value);
  if (!file || !notebook || !currentTarget()) throw Error('The recording target was replaced.');
  changed(); pausePlayers(); loadingAudio?.abort();
  const controller = new AbortController(), version = ++audioGeneration, source = sourceGeneration;
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, {once: true});
  loadingAudio = controller; recorderLoading = fromRecorder; controls(); $('audio-status').textContent = 'Checking ' + file.name + '…';
  try {
    const asset = await loadExplanationAudio(file, {signal: controller.signal});
    if (version !== audioGeneration || source !== sourceGeneration || loadingAudio !== controller || controller.signal.aborted || !currentTarget()) {
      releaseExplanationAudio(asset); throw Error('The audio selection or recording target was replaced.');
    }
    clearPlayer($('draft-audio')); releaseExplanationAudio(draft); draft = asset; recorderDraft = fromRecorder;
    $('draft-audio').src = draft.url; $('draft-preview').hidden = false;
    $('audio-status').textContent = draft.identity.name + ' · ' + draft.durationSeconds.toFixed(2) + ' seconds. Preview, add attribution, then attach explicitly.';
  } catch (error) {
    if (version === audioGeneration && loadingAudio === controller) $('audio-status').textContent = 'Audio refused: ' + error.message + (draft ? ' The previous audio draft is retained.' : '');
    throw error;
  } finally { signal?.removeEventListener('abort', abort); if (loadingAudio === controller) { loadingAudio = null; recorderLoading = false; } controls(); }
}
$('audio-file').onchange = () => {
  const file = $('audio-file').files[0]; if (!file || !notebook) return;
  resetRecorder(); void receiveAudio(file).catch(() => {});
};

$('draft-audio').addEventListener('play', () => {
  const player = $('draft-audio');
  if (!draft || receiving || loadingAudio || player.paused ||
      player.getAttribute('src') !== draft.url || player.currentSrc !== draft.url) return;
  for (const other of $('explanations').querySelectorAll('audio')) other.pause();
});
$('discard').onclick = () => { changed(); clearDraft(); resetRecorder(); controls(); status('Unattached draft discarded. Retained explanations are unchanged.'); };
$('attach-form').onsubmit = event => {
  event.preventDefault();
  if ($('attach').disabled) return;
  try {
    const next = addSpokenExplanation(notebook, {id: 'explanation-' + crypto.randomUUID(), stepId: $('step').value,
      attribution: $('attribution').value, description: $('description').value, audio: draft.identity});
    changed();
    const hash = draft.identity.sha256;
    if (audioAssets.has(hash)) releaseExplanationAudio(draft); else audioAssets.set(hash, draft);
    notebook = next; clearDraft({release: false}); resetRecorder(); renderStep();
    status('Spoken explanation attached to the selected original step. Download the notebook to keep the complete account.');
  } catch (error) { status('Attachment refused: ' + error.message + ' The accepted notebook is unchanged.'); controls(); }
};

$('save').onclick = async () => {
  if ($('save').disabled) return;
  const controller = new AbortController(), version = revision;
  saving = controller; controls();
  try {
    const blob = await makeSpokenExplanationBundle(notebook, accepted.assets, audioAssets, {signal: controller.signal});
    if (revision !== version || saving !== controller || controller.signal.aborted) return;
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'spoken-explanation-notebook.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    status('Complete explanation notebook downloaded. It includes the original retained PNGs and every attached audio file.');
  } catch (error) { if (revision === version && saving === controller) status('Save refused: ' + error.message); }
  finally { if (saving === controller) saving = null; controls(); }
};

window.addEventListener('pageshow', event => { if (event.persisted && !recorder) resetRecorder(); });
window.addEventListener('pagehide', event => {
  recorder?.dispose(); recorder = null;
  receiving?.abort(); loadingAudio?.abort(); saving?.abort(); pausePlayers();
  if (event.persisted) return;
  if (accepted) releaseSequenceAssets(accepted.assets);
  releaseExplanationAssets(audioAssets); releaseExplanationAudio(draft);
});
controls();

