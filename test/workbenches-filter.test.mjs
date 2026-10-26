import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../web/workbenches.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../web/workbenches.mjs', import.meta.url), 'utf8');

function mount(href, source = script) {
  const listeners = new Map();
  const windows = new Map();
  const input = {value: '', focused: false, addEventListener(event, callback) {listeners.set('input:' + event, callback);}, focus() {this.focused = true;}};
  const clear = {hidden: true, addEventListener(event, callback) {listeners.set('clear:' + event, callback);}};
  const count = {textContent: ''};
  const sections = [...html.matchAll(/<section class="workbench-section"[^>]*>[\s\S]*?<\/section>/g)].map(found => {
    const items = [...found[0].matchAll(/<li data-workbench>[\s\S]*?<\/li>/g)].map(link => ({
      textContent: link[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '),
      hidden: false,
    }));
    return {items, hidden: false, querySelector(selector) {
      assert.equal(selector, '[data-workbench]:not([hidden])');
      return items.find(item => !item.hidden) ?? null;
    }};
  });
  const entries = sections.flatMap(section => section.items);
  assert.equal(entries.length, 74, 'actual maintained directory is the test population');
  let current = new URL(href);
  const location = {get href() {return current.href;}};
  const history = {state: {from: 'directory'}, replacements: [], replaceState(state, unused, target) {
    assert.equal(state, this.state);
    assert.equal(unused, '');
    this.replacements.push(target);
    current = new URL(target, current);
  }};
  const document = {
    getElementById(id) {return {workbenchFilter: input, workbenchCount: count, workbenchClear: clear}[id] ?? null;},
    querySelectorAll(query) {return {'[data-workbench-section]': sections, '[data-workbench]': entries}[query] ?? [];}
  };
  const window = {location, history, addEventListener(type, callback) {windows.set(type, callback);}};
  vm.runInNewContext(source, {document, window, URL}, {filename: 'workbenches.mjs'});
  return {
    input, clear, count, entries, sections, history,
    get url() {return new URL(current);},
    type(value) {input.value = value; listeners.get('input:input')();},
    clickClear() {listeners.get('clear:click')();},
    navigate(value, event = 'popstate') {current = new URL(value, current); windows.get(event)();},
  };
}

test('shared query restores a filtered original 74-route catalog without changing browser history', () => {
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
  assert.equal(h.count.textContent, '74 workbenches available.');
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
