const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { getIndividualSchemaExportFields } = loadEsModule(
  path.join(__dirname, '../src/util/individual-export.js'),
);

test('Individual schema export fields parse JSON, skip base fields, and use descriptions as labels', () => {
  const schema = JSON.stringify({
    properties: {
      id: { description: 'Identifier' },
      first_name: { description: 'First name' },
      last_name: { description: 'Last name' },
      dob: { description: 'Date of birth' },
      location_id: { description: 'Urban city' },
      requested_grant_amount_usd: { description: 'Requested Grant Amount ($USD)' },
      fallback_label: {},
    },
  });

  assert.deepEqual(getIndividualSchemaExportFields(schema), [
    { field: 'json_ext__location_id', label: 'Urban city' },
    { field: 'json_ext__requested_grant_amount_usd', label: 'Requested Grant Amount ($USD)' },
    { field: 'json_ext__fallback_label', label: 'fallback_label' },
  ]);
});

test('invalid Individual schema JSON returns no custom export fields', () => {
  assert.deepEqual(getIndividualSchemaExportFields('{invalid'), []);
});
