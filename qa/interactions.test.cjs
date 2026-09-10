const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
test('Consent rejects malformed, expired and future choices', async () => {
  assert.ok(existsSync('dist/assets/state.mjs'), 'Consent state implementation missing');
  const { parseConsent } = await import(require('node:url').pathToFileURL(resolve('dist/assets/state.mjs')));
  const now = Date.now();
  assert.equal(parseConsent('{', now), null);
  assert.equal(parseConsent(JSON.stringify({version:1,necessary:true,timestamp:now-181*864e5}), now), null);
  assert.equal(parseConsent(JSON.stringify({version:1,necessary:true,timestamp:now+864e5}), now), null);
  assert.equal(parseConsent(JSON.stringify({version:1,necessary:true,timestamp:now}), now).necessary, true);
});
