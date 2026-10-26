const filter = document.getElementById('workbenchFilter');
const count = document.getElementById('workbenchCount');
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
  count.textContent = visible === 1 ? '1 workbench found.' : `${visible} workbenches found.`;
}
filter.addEventListener('input', applyFilter);
applyFilter();
