const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  enrollmentOperatorConditions,
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  toGraphQLStringLiterals,
  updateEnrollmentJsonExt,
} = loadEsModule(path.join(__dirname, '../src/utils.js'), {
  '@openimis/fe-core': { baseApiUrl: '/api' },
});

test('normalizes canonical and legacy criteria representations', () => {
  const legacy = [{ custom_filter_condition: 'age__gte__integer=18' }];
  assert.deepEqual(normalizeAdvancedCriteria(legacy), {
    POTENTIAL: [{
      custom_filter_condition: 'age__gte__integer=18',
      field: 'age',
      filter: 'gte',
      type: 'integer',
      value: '18',
    }],
  });
});

test('malformed enrollment JSON is replaced safely while unrelated data is preserved', () => {
  assert.deepEqual(safeParseJsonObject('{invalid'), {});
  const result = JSON.parse(updateEnrollmentJsonExt(
    '{"preserved":true,"advanced_criteria":{"ACTIVE":[]}}',
    'POTENTIAL',
    ['age__gte__integer=18'],
  ));
  assert.equal(result.preserved, true);
  assert.deepEqual(result.advanced_criteria.ACTIVE, []);
  assert.deepEqual(result.advanced_criteria.POTENTIAL, [
    { custom_filter_condition: 'age__gte__integer=18' },
  ]);
});

test('locked Phase criteria are never emitted as operator filters', () => {
  const filters = [
    { field: 'district', filter: 'exact', type: 'string', value: 'MW-LL', locked: true },
    { field: 'age', filter: 'gte', type: 'integer', value: 18 },
  ];
  assert.deepEqual(enrollmentOperatorConditions(filters), ['age__gte__integer=18']);
  assert.deepEqual(enrollmentOperatorConditions(filters, false), []);
});

test('GraphQL string literals escape operator values safely', () => {
  assert.deepEqual(toGraphQLStringLiterals(['name__exact__string=A"B']), [
    '"name__exact__string=A\\"B"',
  ]);
});
