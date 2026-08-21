const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  createEnrollmentCriteriaState,
  enrollmentOperatorConditions,
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  toGraphQLStringLiterals,
  updateEnrollmentJsonExt,
} = loadEsModule(path.join(__dirname, '../src/utils.js'), {
  '@openimis/fe-core': { baseApiUrl: '/api' },
});

const phaseCriterion = {
  field: 'validation_status', filter: 'exact', type: 'string', value: 'VERIFIED',
};
const operatorCriterion = {
  field: 'number_of_children', filter: 'gte', type: 'integer', value: 3,
};

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

test('keeps Phase criteria and operator filters in separate physical collections', () => {
  const state = createEnrollmentCriteriaState([phaseCriterion], [operatorCriterion]);
  assert.deepEqual(state.phaseCriteria, [{ ...phaseCriterion, locked: true }]);
  assert.deepEqual(state.operatorFilters, [{ ...operatorCriterion, locked: false }]);
});

test('changing Phase or status replaces prior Phase state without carrying stale rules', () => {
  const potential = createEnrollmentCriteriaState([phaseCriterion], [operatorCriterion]);
  const activeCriterion = {
    field: 'chronic_illness', filter: 'exact', type: 'boolean', value: true,
  };
  const active = createEnrollmentCriteriaState([activeCriterion], potential.operatorFilters);
  assert.deepEqual(active.phaseCriteria, [{ ...activeCriterion, locked: true }]);
  assert.equal(active.phaseCriteria.some((criterion) => criterion.field === 'validation_status'), false);
});

test('Clear can empty operator state without mutating Phase state', () => {
  const state = createEnrollmentCriteriaState([phaseCriterion], [operatorCriterion]);
  const cleared = { ...state, operatorFilters: [] };
  assert.deepEqual(cleared.phaseCriteria, state.phaseCriteria);
  assert.deepEqual(cleared.operatorFilters, []);
});

test('the shared state and payload helpers give Individual and Household enrollment parity', () => {
  const individualState = createEnrollmentCriteriaState([phaseCriterion], [operatorCriterion]);
  const householdState = createEnrollmentCriteriaState([phaseCriterion], [operatorCriterion]);
  assert.deepEqual(householdState, individualState);
  assert.deepEqual(
    enrollmentOperatorConditions(householdState.operatorFilters),
    enrollmentOperatorConditions(individualState.operatorFilters),
  );
});

test('GraphQL string literals escape operator values safely', () => {
  assert.deepEqual(toGraphQLStringLiterals(['name__exact__string=A"B']), [
    '"name__exact__string=A\\"B"',
  ]);
});
