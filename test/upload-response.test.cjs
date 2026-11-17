const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  getUploadErrorMessage,
  readUploadResponse,
} = loadEsModule(path.join(__dirname, '../src/util/upload-response.js'));

test('upload response parser keeps server validation details readable', async () => {
  const response = {
    text: async () => JSON.stringify({
      success: false,
      error: { workflow: 'KYC upload is missing required columns: bank.' },
    }),
  };
  const payload = await readUploadResponse(response);

  assert.equal(
    getUploadErrorMessage(payload, 'Upload failed.'),
    'workflow: KYC upload is missing required columns: bank.',
  );
});

test('upload error formatter ignores technical metadata and uses a fallback when needed', () => {
  assert.equal(
    getUploadErrorMessage(
      { error: { error: 'Invalid entries', timestamp: 'now', upload_id: 'uuid' } },
      'Upload failed.',
    ),
    'error: Invalid entries',
  );
  assert.equal(getUploadErrorMessage({}, 'Upload failed.'), 'Upload failed.');
});
