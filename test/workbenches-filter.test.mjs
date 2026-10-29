import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../web/workbenches.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../web/workbenches.mjs', import.meta.url), 'utf8');

function mount(href, source = script, options = {}) {
  const listeners = new Map();
  const windows = new Map();
  const input = {value: '', focused: false, addEventListener(event, callback) {listeners.set('input:' + event, callback);}, focus() {this.focused = true;}};
  const clear = {hidden: true, addEventListener(event, callback) {listeners.set('clear:' + event, callback);}};
  const count = {textContent: ''};
  const favoriteCount = {textContent: ''};
  const favoriteOnly = {checked: false, focused: false, addEventListener(event, callback) {listeners.set('favorite:' + event, callback);}, focus() {this.focused = true;}};
  const storage = options.storage ?? new Map();
  const localStorage = {
    getItem(key) {if (options.blockStorage) throw Error('storage unavailable'); return storage.get(key) ?? null;},
    setItem(key, value) {if (options.blockStorage) throw Error('storage unavailable'); storage.set(key, value);}
  };
  const sections = [...html.matchAll(/<section class="workbench-section"[^>]*>[\s\S]*?<\/section>/g)].map(found => {
    const items = [...found[0].matchAll(/<li data-workbench>[\s\S]*?<\/li>/g)].map(foundLink => {
      const markup = foundLink[0];
      const route = markup.match(/href="([^"]+)"/)?.[1];
      const name = markup.match(/<strong>([^<]+)<\/strong>/)?.[1];
      assert.ok(route && name);
      const link = {
        textContent: markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '),
        getAttribute(attr) {assert.equal(attr, 'href'); return route;},
        querySelector(selector) {assert.equal(selector, 'strong'); return {textContent: name};}
      };
      return {hidden: false, link, textContent: link.textContent, button: null, querySelector(selector) {
        assert.equal(selector, '[data-workbench-link]'); return link;
      }, append(button) {this.button = button;}};
    });
    return {items, hidden: false, querySelector(selector) {
      assert.equal(selector, '[data-workbench]:not([hidden])');
      return items.find(item => !item.hidden) ?? null;
    }};
  });
  const entries = sections.flatMap(section => section.items);
  assert.equal(entries.length, 87, 'actual maintained directory is the test population');
  let current = new URL(href);
  const location = {get href() {return current.href;}};
  const history = {state: {from: 'directory'}, replacements: [], replaceState(state, unused, target) {
    assert.equal(state, this.state);
    assert.equal(unused, '');
    this.replacements.push(target);
    current = new URL(target, current);
  }};
  const document = {
    getElementById(id) {return {workbenchFilter: input, workbenchCount: count, workbenchClear: clear, workbenchFavoriteOnly: favoriteOnly, workbenchFavoriteCount: favoriteCount}[id] ?? null;},
    querySelectorAll(query) {return {'[data-workbench-section]': sections, '[data-workbench]': entries}[query] ?? [];},
    createElement(tag) {
      assert.equal(tag, 'button');
      const listeners = new Map(), attrs = new Map();
      return {type: '', textContent: '', className: '',
        setAttribute(key, value) {attrs.set(key, value);},
        getAttribute(key) {return attrs.get(key);},
        addEventListener(event, callback) {listeners.set(event, callback);},
        click() {listeners.get('click')();}
      };
    }
  };
  const window = {location, history, localStorage, addEventListener(type, callback) {windows.set(type, callback);}};
  vm.runInNewContext(source, {document, window, URL}, {filename: 'workbenches.mjs'});
  return {
    input, clear, count, favoriteCount, favoriteOnly, entries, sections, history, storage,
    pin(index) {entries[index].button.click();},
    showPinned(checked) {favoriteOnly.checked = checked; listeners.get('favorite:change')();},
    get url() {return new URL(current);},
    type(value) {input.value = value; listeners.get('input:input')();},
    clickClear() {listeners.get('clear:click')();},
    navigate(value, event = 'popstate') {current = new URL(value, current); windows.get(event)();},
  };
}

test('shared query restores a filtered original 87-route catalog without changing browser history', () => {
  const h = mount('https://workbench.example/workbenches?mode=inspect&q=calibration#workbenchGroups');
  assert.equal(h.input.value, 'calibration');
  const visible = h.entries.filter(item => !item.hidden);
  assert.ok(visible.length >= 3 && visible.length < h.entries.length);
  assert.ok(visible.every(item => item.textContent.toLowerCase().includes('calibration')));
  assert.equal(h.count.textContent, `${visible.length} workbenches found.`);
  assert.equal(h.history.replacements.length, 0);
  assert.equal(h.clear.hidden, false);
});

test('typing preserves unrelated params and anchor without a history entry per character', () => {
  const h = mount('https://workbench.example/workbenches?mode=inspect#workbenchGroups');
  h.type('path');
  assert.equal(h.url.searchParams.get('q'), 'path');
  assert.equal(h.url.searchParams.get('mode'), 'inspect');
  assert.equal(h.url.hash, '#workbenchGroups');
  assert.equal(h.history.replacements.length, 1);
  assert.ok(h.entries.filter(item => !item.hidden).length > 0);
  h.type('FEEDBACK');
  assert.equal(h.url.searchParams.get('q'), 'FEEDBACK');
  assert.ok(h.entries.filter(item => !item.hidden).length > 0);
  assert.ok(h.entries.filter(item => !item.hidden).every(item => item.textContent.toLowerCase().includes('feedback')));
});

test('empty and unsupported terms keep the complete catalog recoverable', () => {
  const h = mount('https://workbench.example/workbenches?from=project');
  h.type('not-a-workbench-' + 'x'.repeat(40));
  assert.equal(h.count.textContent, 'No workbenches match this search.');
  assert.ok(h.entries.every(item => item.hidden));
  assert.ok(h.sections.every(section => section.hidden));
  assert.equal(h.clear.hidden, false);
  h.clickClear();
  assert.equal(h.input.value, '');
  assert.ok(h.input.focused);
  assert.equal(h.url.searchParams.has('q'), false);
  assert.equal(h.url.searchParams.get('from'), 'project');
  assert.ok(h.entries.every(item => !item.hidden));
  assert.ok(h.sections.every(section => !section.hidden));
  assert.equal(h.count.textContent, '87 workbenches available.');
  assert.equal(h.clear.hidden, true);
});

test('history traversal and page restore rehydrate the actual search', () => {
  const h = mount('https://workbench.example/workbenches');
  h.type('path');
  h.navigate('https://workbench.example/workbenches?q=feedback&from=share');
  assert.equal(h.input.value, 'feedback');
  assert.ok(h.entries.filter(item => !item.hidden).every(item => item.textContent.toLowerCase().includes('feedback')));
  h.navigate('https://workbench.example/workbenches?q=calibration', 'pageshow');
  assert.equal(h.input.value, 'calibration');
  assert.ok(h.entries.filter(item => !item.hidden).every(item => item.textContent.toLowerCase().includes('calibration')));
});

test('untrusted query text remains text, not rendered markup', () => {
  const h = mount('https://workbench.example/workbenches');
  h.type('<img src=x onerror=alert(1)>&foo=2');
  assert.equal(h.count.textContent, 'No workbenches match this search.');
  assert.equal(h.url.searchParams.get('q'), '<img src=x onerror=alert(1)>&foo=2');
  assert.equal(h.url.searchParams.has('foo'), false);
  assert.equal(h.entries.filter(item => !item.hidden).length, 0);
});


test('explicit pins persist across reload and only genuine original routes are restored', () => {
  const storage = new Map();
  const first = mount('https://workbench.example/workbenches', script, {storage});
  first.pin(2);
  first.pin(4);
  assert.equal(first.favoriteCount.textContent, '2 workbenches pinned in this browser.');
  assert.equal(first.entries[2].button.getAttribute('aria-pressed'), 'true');
  assert.equal(first.entries[4].button.getAttribute('aria-pressed'), 'true');
  const retained = JSON.parse(storage.get('skill-translator:workbench-pins:v1'));
  assert.equal(retained.length, 2);
  const second = mount('https://workbench.example/workbenches?q=calibration', script, {storage});
  assert.equal(second.favoriteCount.textContent, '2 workbenches pinned in this browser.');
  assert.equal(second.entries[2].button.getAttribute('aria-pressed'), 'true');
  second.showPinned(true);
  assert.ok(second.entries.filter(item => !item.hidden).every(item => retained.includes(item.link.getAttribute('href'))));
  assert.equal(second.url.searchParams.get('q'), 'calibration');
  assert.equal(second.history.replacements.length, 0);
  second.pin(2);
  assert.equal(second.favoriteCount.textContent, '1 workbench pinned in this browser.');
  assert.equal(second.favoriteOnly.focused, true);
});

test('search sees original link copy but not the appended pin button', () => {
  const h = mount('https://workbench.example/workbenches');
  h.type('pinned');
  assert.equal(h.count.textContent, 'No workbenches match this search.');
  h.clickClear();
  h.showPinned(true);
  assert.equal(h.count.textContent, 'No pinned workbenches yet. Use Pin beside a workbench.');
  assert.ok(h.entries.every(item => item.hidden));
  h.showPinned(false);
  assert.equal(h.entries.filter(item => !item.hidden).length, 87);
});

test('hostile stored routes are never admitted as pins', () => {
  const storage = new Map([['skill-translator:workbench-pins:v1',
    JSON.stringify(['/not-a-real-workbench', 'javascript:alert(1)', '/capture', '/capture', {}, 42])]]);
  const h = mount('https://workbench.example/workbenches', script, {storage});
  assert.equal(h.favoriteCount.textContent, '1 workbench pinned in this browser.');
  h.showPinned(true);
  const shown = h.entries.filter(item => !item.hidden);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].link.getAttribute('href'), '/capture');
});

test('blocked browser storage degrades to functional in-session pins', () => {
  const h = mount('https://workbench.example/workbenches', script, {blockStorage: true});
  h.pin(0);
  h.showPinned(true);
  assert.equal(h.entries.filter(item => !item.hidden).length, 1);
  assert.match(h.favoriteCount.textContent, /browser storage is unavailable/);
  assert.equal(h.url.searchParams.has('q'), false);
});

test('pin toggle and text search intersect without rewriting shared URL params', () => {
  const h = mount('https://workbench.example/workbenches?mode=inspect&q=path#workbenchGroups');
  const match = h.entries.findIndex(item => item.link.textContent.toLowerCase().includes('path'));
  assert.ok(match >= 0);
  h.pin(match);
  h.showPinned(true);
  assert.equal(h.entries.filter(item => !item.hidden).length, 1);
  assert.equal(h.url.searchParams.get('q'), 'path');
  assert.equal(h.url.searchParams.get('mode'), 'inspect');
  assert.equal(h.url.hash, '#workbenchGroups');
  h.type('calibration');
  assert.equal(h.entries.filter(item => !item.hidden).length, 0);
  assert.equal(h.count.textContent, 'No pinned workbenches match this search.');
  h.showPinned(false);
  assert.ok(h.entries.filter(item => !item.hidden).length > 0);
});

