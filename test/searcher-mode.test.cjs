const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  searcherDefaultFilters,
  searcherModeProps,
  searcherOrderingProps,
} = loadEsModule(path.join(__dirname, '../src/util/searcher-mode.js'));

const FilterPane = () => null;
const onDoubleClick = () => {};
const exportFetch = () => {};

test('read-only searchers hide filters and export and disable edit navigation', () => {
  assert.deepEqual(searcherModeProps({
    readOnly: true,
    FilterPane,
    onDoubleClick,
    exportFetch,
    cacheFiltersKey: 'registryFilters',
  }), {
    FilterPane: undefined,
    onDoubleClick: undefined,
    exportable: false,
    exportFetch: undefined,
    cacheFiltersKey: undefined,
  });
});

test('normal Individual and Group searchers retain registry interactions', () => {
  assert.deepEqual(searcherModeProps({
    readOnly: false,
    FilterPane,
    onDoubleClick,
    exportFetch,
    cacheFiltersKey: 'registryFilters',
  }), {
    FilterPane,
    onDoubleClick,
    exportable: true,
    exportFetch,
    cacheFiltersKey: 'registryFilters',
  });
});

test('candidate previews only send their supported query filters', () => {
  const registryFilters = {
    isDeleted: { value: false, filter: 'isDeleted: false' },
    parentLocation: { value: 'district-id', filter: 'parentLocation: "district-id"' },
  };
  const candidateFilters = {
    customFilters: { value: [], filter: 'customFilters: []' },
    benefitPlanId: { value: 'plan-id', filter: 'benefitPlanId: "plan-id"' },
    status: { value: 'POTENTIAL', filter: 'status: "POTENTIAL"' },
  };

  assert.deepEqual(searcherDefaultFilters(true, registryFilters, candidateFilters), candidateFilters);
  assert.deepEqual(searcherDefaultFilters(false, registryFilters, candidateFilters), {
    ...registryFilters,
    ...candidateFilters,
  });
});

test('backend ordering is preserved without rewriting formatted GraphQL arguments', () => {
  const sorts = () => [['lastName', true]];
  assert.deepEqual(searcherOrderingProps(true, sorts, 'lastName'), {
    sorts: undefined,
    defaultOrderBy: undefined,
  });
  assert.deepEqual(searcherOrderingProps(false, sorts, 'lastName'), {
    sorts,
    defaultOrderBy: 'lastName',
  });
});
