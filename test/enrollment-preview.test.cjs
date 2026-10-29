const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.cancelAnimationFrame = clearTimeout;
global.MessageChannel = undefined;
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('react-dom/test-utils');
const load = require('./load-es-module.cjs');
const usePreview = load(path.join(__dirname, '../src/components/dialogs/useEnrollmentPreview.js')).default;
const response = (id) => ({ payload: { data: { groupEnrollmentSummary: { id, willEnrol: 1 } } } });

test('preview invalidates on inputs, rejects late responses and failures, and cannot revive an old key', async () => {
  const container = document.createElement('div');
  let preview;
  const Harness = ({ criteria }) => { preview = usePreview(criteria); return null; };
  const render = (criteria) => act(() => { ReactDOM.render(React.createElement(Harness, { criteria }), container); });
  render('phase1:ACTIVE:A');
  let finishOld;
  act(() => { preview.load(() => new Promise((resolve) => { finishOld = resolve; })); });
  assert.equal(preview.loading, true);
  render('phase1:ACTIVE:B');
  assert.equal(preview.summary, null);
  assert.equal(preview.loading, false);
  await act(async () => preview.load(async () => response('B')));
  assert.equal(preview.summary.id, 'B');
  await act(async () => { finishOld(response('A')); });
  assert.equal(preview.summary.id, 'B');
  render('phase1:ACTIVE:A');
  assert.equal(preview.summary, null);
  await act(async () => preview.load(async () => response('A')));
  for (const key of ['phase1:ACTIVE:empty', 'phase1:POTENTIAL:empty', 'phase2:POTENTIAL:empty']) {
    render(key);
    assert.equal(preview.summary, null);
    await act(async () => preview.load(async () => response(key)));
    assert.equal(preview.summary.id, key);
  }
  for (const failed of [undefined, { error: true }, { payload: { errors: ['denied'] } }]) {
    await act(async () => preview.load(async () => failed));
    assert.equal(preview.summary, null);
    assert.equal(preview.loading, false);
  }
  await act(async () => preview.load(async () => { throw new Error('network'); }));
  assert.equal(preview.summary, null);
  let first;
  act(() => { preview.load(() => new Promise((resolve) => { first = resolve; })); });
  await act(async () => preview.load(async () => response('newest')));
  await act(async () => { first(response('older-same-inputs')); });
  assert.equal(preview.summary.id, 'newest');
  act(() => { ReactDOM.unmountComponentAtNode(container); });
});
test.after(() => dom.window.close());
