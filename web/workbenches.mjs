const filter = document.getElementById('workbenchFilter');
const count = document.getElementById('workbenchCount');
const clear = document.getElementById('workbenchClear');
const sections = [...document.querySelectorAll('[data-workbench-section]')];
const entries = [...document.querySelectorAll('[data-workbench]')];

function applyFilter() {
  const query = filter.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const item of entries) {
    const match = item.textContent.toLocaleLowerCase().includes(query);
    item.hidden = !match;
    if (match) visible++;
  }
  for (const section of sections) {
    section.hidden = !section.querySelector('[data-workbench]:not([hidden])');
  }
  count.textContent = !query ? `${visible} workbenches available.`
    : visible === 0 ? 'No workbenches match this search.'
    : visible === 1 ? '1 workbench found.' : `${visible} workbenches found.`;
  clear.hidden = filter.value.length === 0;
}

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
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  applyFilter();
}

filter.addEventListener('input', filterAndRemember);
clear.addEventListener('click', () => {
  filter.value = '';
  filterAndRemember();
  filter.focus();
});
window.addEventListener('popstate', restoreFromUrl);
window.addEventListener('pageshow', restoreFromUrl);
restoreFromUrl();
