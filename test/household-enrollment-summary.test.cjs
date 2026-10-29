const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');
const Summary = load(path.join(__dirname, '../src/components/dialogs/HouseholdEnrollmentSummary.js'), {
  '@material-ui/core': {
    Grid: ({ children }) => React.createElement('div', null, children),
    Paper: ({ children }) => React.createElement('article', null, children),
    Typography: ({ children }) => React.createElement('span', null, children),
  },
  '@openimis/fe-core': { formatMessage: (_intl, _module, key) => messages[key] },
}).default;

function render(summary) {
  return renderToStaticMarkup(React.createElement(Summary, { intl: {}, summary }));
}

test('household preview renders exactly the three requested cards and values', () => {
  const html = render({ verifiedUnenrolledHouseholds: 39, phaseTarget: 500, enrolledHouseholds: 12 });
  assert.equal((html.match(/<article>/g) || []).length, 3);
  for (const key of ['verifiedUnenrolledHouseholds', 'phaseTarget', 'enrolledHouseholds']) {
    assert.ok(html.includes(messages[`individual.enrollment.${key}`]));
  }
  for (const value of [39, 500, 12]) assert.ok(html.includes(`<span>${value}</span>`));
  assert.ok(!html.includes('No enrollment limit'));
  assert.ok(!html.includes('All households in the registry'));
});

test('zero targets and counts stay numeric; missing targets are explicitly not configured', () => {
  const zero = render({ verifiedUnenrolledHouseholds: 0, phaseTarget: 0, enrolledHouseholds: 0 });
  assert.equal((zero.match(/<span>0<\/span>/g) || []).length, 3);
  for (const phaseTarget of [null, undefined]) {
    const html = render({ verifiedUnenrolledHouseholds: 0, phaseTarget, enrolledHouseholds: 0 });
    assert.ok(html.includes('Not configured'));
    assert.ok(!html.includes('No enrollment limit'));
  }
});
