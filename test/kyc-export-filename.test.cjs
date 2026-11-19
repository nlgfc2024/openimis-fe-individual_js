const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { kycExportFilename } = loadEsModule(
  path.join(__dirname, '../src/util/kyc-export-filename.js'),
);

const date = new Date(2026, 10, 19);

test('KYC export filename uses its single District value', () => {
  const csv = 'District,Full Name\nNeno,Paul Hawadi\nNeno,Christina Fulaye\n';
  assert.equal(kycExportFilename(csv, date), 'kyc-data-neno-2026-11-19.csv');
});

test('KYC export filename falls back for mixed or missing District values', () => {
  assert.equal(
    kycExportFilename('District,Full Name\nNeno,Paul\nBlantyre,Chisomo\n', date),
    'kyc-data-multiple-districts-2026-11-19.csv',
  );
  assert.equal(
    kycExportFilename('Full Name\nPaul\n', date),
    'kyc-data-multiple-districts-2026-11-19.csv',
  );
});
