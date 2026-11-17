const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  BASE_INDIVIDUAL_EXPORT_FIELDS,
  getIndividualExportParameters,
  getIndividualSchemaExportFields,
  KYC_EXPORT_SELECTED_FIELDS,
} = loadEsModule(
  path.join(__dirname, '../src/util/individual-export.js'),
);

test('KYC export uses the requested column order without changing the normal Individual export fields', () => {
  assert.deepEqual(KYC_EXPORT_SELECTED_FIELDS, [
    'location__parent__parent__parent__name',
    'location__parent__parent__name',
    'location__parent__name',
    'location__name',
    'kyc_catchment',
    'json_ext__form_number',
    'first_name',
    'last_name',
    'json_ext__national_id',
    'dob',
    'json_ext__account_number',
    'json_ext__account_name',
    'json_ext__bank',
  ]);
  assert.ok(BASE_INDIVIDUAL_EXPORT_FIELDS.includes('id'));
});

test('KYC field selection keeps location filters, removes ID, and enforces the KYC order', () => {
  const parameters = getIndividualExportParameters(
    ['parentLocation: "district-uuid", parentLocationLevel: 0', 'fileFormat: "csv"'],
    ['id', 'first_name', 'json_ext__form_number'],
    { id: 'ID', first_name: 'first_name' },
  );

  assert.ok(parameters.includes('parentLocation: "district-uuid", parentLocationLevel: 0'));
  assert.ok(parameters.includes('primaryRecipientOnly: true'));
  assert.deepEqual(
    JSON.parse(parameters.find((parameter) => parameter.startsWith('fields: ')).slice(8)),
    KYC_EXPORT_SELECTED_FIELDS,
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
    { field: 'json_ext__form_number', label: 'UBR household form number' },
    { field: 'location__parent__parent__parent__name', label: 'District' },
    { field: 'location__parent__parent__name', label: 'Traditional Authority' },
    { field: 'location__parent__name', label: 'Group Village Head' },
    { field: 'location__name', label: 'Village' },
    { field: 'kyc_catchment', label: 'Catchment' },
    { field: 'json_ext__national_id', label: 'National ID' },
    { field: 'json_ext__account_number', label: 'Account number' },
    { field: 'json_ext__account_name', label: 'Account name' },
    { field: 'json_ext__bank', label: 'Bank / provider' },
  ]);
});

test('invalid Individual schema JSON still exposes KYC export fields', () => {
  assert.deepEqual(
    getIndividualSchemaExportFields('{invalid').map(({ field }) => field),
    [
      'json_ext__form_number',
      'location__parent__parent__parent__name',
      'location__parent__parent__name',
      'location__parent__name',
      'location__name',
      'kyc_catchment',
      'json_ext__national_id',
      'json_ext__account_number',
      'json_ext__account_name',
      'json_ext__bank',
    ],
  );
});
