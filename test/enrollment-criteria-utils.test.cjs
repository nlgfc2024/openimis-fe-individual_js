const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  createEnrollmentCriteriaState,
  enrollmentOperatorConditions,
  normalizeAdvancedCriteria,
  normalizeCriterion,
  safeParseJsonObject,
  toCustomFilterConditions,
  toGraphQLStringLiterals,
  updateEnrollmentJsonExt,
  enrollmentCandidateFilter,
  parseEnrollmentRanking,
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

test('operator string values are quoted and escaped for backend casting', () => {
  assert.deepEqual(toCustomFilterConditions([{
    field: 'district',
    filter: 'exact',
    type: 'string',
    value: 'Nkhata "Bay"',
  }]), [String.raw`district__exact__string="Nkhata \"Bay\""`]);
});

test('operator non-string values remain unquoted', () => {
  assert.deepEqual(toCustomFilterConditions([{
    field: 'household_size',
    filter: 'gte',
    type: 'integer',
    value: 5,
  }]), ['household_size__gte__integer=5']);
});

test('operator string serialization is idempotent across reloads', () => {
  let criterion = {
    field: 'district', filter: 'exact', type: 'string', value: 'Karonga',
  };
  const expected = 'district__exact__string="Karonga"';
  for (let generation = 0; generation < 3; generation += 1) {
    const condition = toCustomFilterConditions([criterion])[0];
    assert.equal(condition, expected);
    criterion = normalizeCriterion({ custom_filter_condition: condition });
  }
});

test('operator strings with embedded quotes round-trip without adding layers', () => {
  const original = {
    field: 'district', filter: 'exact', type: 'string', value: 'Nkhata "Bay"',
  };
  const condition = toCustomFilterConditions([original])[0];
  const reloaded = normalizeCriterion({ custom_filter_condition: condition });
  assert.equal(reloaded.value, original.value);
  assert.equal(toCustomFilterConditions([reloaded])[0], condition);
});

test('normalization preserves legacy unquoted strings', () => {
  const result = normalizeCriterion({
    custom_filter_condition: 'district__exact__string=Karonga',
  });
  assert.equal(result.value, 'Karonga');
});

test('normalization supports legacy two-part criteria with exact as default', () => {
  const result = normalizeCriterion({
    custom_filter_condition: 'district__string="Karonga"',
  });
  assert.deepEqual(result, {
    custom_filter_condition: 'district__string="Karonga"',
    field: 'district',
    filter: 'exact',
    type: 'string',
    value: 'Karonga',
  });
});

test('ranking metadata parses object and serialized GraphQL representations', () => {
  const ranking = { order_by: ['-dob'], limit: { percentage: 20 } };
  assert.deepEqual(parseEnrollmentRanking(ranking), ranking);
  assert.deepEqual(parseEnrollmentRanking(JSON.stringify(ranking)), ranking);
  assert.equal(parseEnrollmentRanking('{invalid'), null);
});

test('authoritative enrollment candidate filters preserve capped cohort order', () => {
  assert.equal(
    enrollmentCandidateFilter(['ranked-2', 'ranked-1']),
    'enrollmentCandidateIds: ["ranked-2","ranked-1"]',
  );
  assert.equal(enrollmentCandidateFilter(undefined), null);
});
