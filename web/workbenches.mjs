const filter = document.getElementById('workbenchFilter');
const count = document.getElementById('workbenchCount');
const clear = document.getElementById('workbenchClear');
const favoriteOnly = document.getElementById('workbenchFavoriteOnly');
const favoriteCount = document.getElementById('workbenchFavoriteCount');
const sections = [...document.querySelectorAll('[data-workbench-section]')];
const entries = [...document.querySelectorAll('[data-workbench]')];
const storageKey = 'skill-translator:workbench-pins:v1';
const linkByEntry = new Map(entries.map(item => [item, item.querySelector('[data-workbench-link]')]));
const knownRoutes = new Set([...linkByEntry.values()].map(link => link.getAttribute('href')));
let storageWorks = true;
let pins = new Set();
try {
  const retained = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(retained)) pins = new Set(retained.filter(route => typeof route === 'string' && knownRoutes.has(route)));
} catch {
  storageWorks = false;
}

function savePins() {
  if (!storageWorks) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...pins]));
  } catch {
    storageWorks = false;
  }
}

const pinButtons = new Map();
function updatePins() {
  for (const [item, button] of pinButtons) {
    const link = linkByEntry.get(item);
    const saved = pins.has(link.getAttribute('href'));
    button.textContent = saved ? '★ Pinned' : '☆ Pin';
    button.setAttribute('aria-pressed', String(saved));
    const title = link.querySelector('strong')?.textContent || link.textContent.trim();
    button.setAttribute('aria-label', (saved ? 'Unpin ' : 'Pin ') + title);
  }
  favoriteCount.textContent = pins.size + (pins.size === 1 ? ' workbench pinned' : ' workbenches pinned') +
    (storageWorks ? ' in this browser.' : ' for this page only; browser storage is unavailable.');
}

function applyFilter() {
  const query = filter.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const item of entries) {
    const link = linkByEntry.get(item);
    const route = link.getAttribute('href');
    const matchesText = link.textContent.toLocaleLowerCase().includes(query);
    const matchesPinned = !favoriteOnly.checked || pins.has(route);
    item.hidden = !(matchesText && matchesPinned);
    if (!item.hidden) visible++;
  }
  for (const section of sections) {
    section.hidden = !section.querySelector('[data-workbench]:not([hidden])');
  }
  count.textContent = visible === 0 && favoriteOnly.checked && pins.size === 0
    ? 'No pinned workbenches yet. Use Pin beside a workbench.'
    : visible === 0 ? (favoriteOnly.checked ? 'No pinned workbenches match this search.' : 'No workbenches match this search.')
    : !query && !favoriteOnly.checked ? visible + ' workbenches available.'
    : visible === 1 ? '1 workbench found.' : visible + ' workbenches found.';
  clear.hidden = filter.value.length === 0;
}

for (const item of entries) {
  const link = linkByEntry.get(item);
  const button = document.createElement('button');
  button.className = 'workbench-pin';
  button.type = 'button';
  button.addEventListener('click', () => {
    const route = link.getAttribute('href');
    if (pins.has(route)) pins.delete(route);
    else pins.add(route);
    savePins();
    updatePins();
    if (favoriteOnly.checked && !pins.has(route)) favoriteOnly.focus();
    applyFilter();
  });
  pinButtons.set(item, button);
  item.append(button);
}
updatePins();

function restoreFromUrl() {
  filter.value = new URL(window.location.href).searchParams.get('q') ?? '';
  applyFilter();
}

function filterAndRemember() {
  const url = new URL(window.location.href);
  const query = filter.value.trim();
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  // Replace, do not push, so every keystroke does not consume a Back step.
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  applyFilter();
}

filter.addEventListener('input', filterAndRemember);
favoriteOnly.addEventListener('change', applyFilter);
clear.addEventListener('click', () => {
  filter.value = '';
  filterAndRemember();
  filter.focus();
});
window.addEventListener('popstate', restoreFromUrl);
window.addEventListener('pageshow', restoreFromUrl);
restoreFromUrl();
