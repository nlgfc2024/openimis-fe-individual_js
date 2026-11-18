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
  assert.deepEqual(getGroupExportFields(undefined), ['id', 'code']);
  assert.deepEqual(DEFAULT_GROUP_EXPORT_FIELDS, ['id', 'code']);
  assert.deepEqual(getGroupExportFields(['id', 'location__name']), ['id', 'location__name']);
  assert.deepEqual(getGroupExportFields('id'), ['id', 'code']);
});

test('KYC group export is available only with configured fields', () => {
  assert.equal(hasConfiguredKycGroupExport(null), false);
  assert.equal(hasConfiguredKycGroupExport({ fields: [] }), false);
  assert.equal(hasConfiguredKycGroupExport({ fields: ['kyc_phase'] }), true);
});
