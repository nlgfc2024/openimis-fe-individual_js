const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  BASE_INDIVIDUAL_EXPORT_FIELDS,
  getIndividualExportParameters,
  getIndividualSchemaExportFields,
} = loadEsModule(
  path.join(__dirname, '../src/util/individual-export.js'),
);

test('normal Individual export retains its standard base fields', () => {
  assert.ok(BASE_INDIVIDUAL_EXPORT_FIELDS.includes('id'));
});

test('selected fields are exported exactly as selected', () => {
  const parameters = getIndividualExportParameters(
    ['parentLocation: "district-uuid", parentLocationLevel: 0', 'fileFormat: "csv"'],
    ['id', 'first_name', 'json_ext__form_number'],
    { id: 'ID', first_name: 'first_name' },
  );

  assert.ok(parameters.includes('parentLocation: "district-uuid", parentLocationLevel: 0'));
  assert.deepEqual(
    JSON.parse(parameters.find((parameter) => parameter.startsWith('fields: ')).slice(8)),
    ['id', 'first_name', 'json_ext__form_number'],
  );
  assert.deepEqual(
    getIndividualExportParameters([], ['id', 'first_name'], { id: 'ID', first_name: 'First Name' })
      .filter((parameter) => parameter.startsWith('fields: ')),
    ['fields: ["id","first_name"]'],
  );
});

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

test('invalid Individual schema JSON has no extra export fields', () => {
  assert.deepEqual(getIndividualSchemaExportFields('{invalid'), []);
});
