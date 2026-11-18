const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  DEFAULT_GROUP_EXPORT_FIELDS,
  getGroupExportFields,
  hasConfiguredKycGroupExport,
} = loadEsModule(path.join(__dirname, '../src/util/group-export-config.js'));

test('group exports default to neutral fields and accept configured fields', () => {
  assert.deepEqual(getGroupExportFields(undefined), ['id', 'json_ext']);
  assert.deepEqual(DEFAULT_GROUP_EXPORT_FIELDS, ['id', 'json_ext']);
  assert.deepEqual(getGroupExportFields(['id', 'code']), ['id', 'code']);
  assert.deepEqual(getGroupExportFields('id'), ['id', 'json_ext']);
});

test('KYC group export is available only with configured fields', () => {
  assert.equal(hasConfiguredKycGroupExport(null), false);
  assert.equal(hasConfiguredKycGroupExport({ fields: [] }), false);
  assert.equal(hasConfiguredKycGroupExport({ fields: ['kyc_phase'] }), true);
});
