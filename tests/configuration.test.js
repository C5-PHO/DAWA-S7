import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/environment.js';

const valid = { MONGODB_URI: 'mongodb://127.0.0.1:27017/example', JWT_SECRET: 'test-secret' };
test('Configuration rejects missing values and invalid ranges before startup', () => {
    assert.throws(() => loadConfig({}));
    assert.throws(() => loadConfig({ ...valid, PORT: '-1' }));
    assert.throws(() => loadConfig({ ...valid, JWT_SECRET: 'replace_with_a_random_secret' }));
    assert.throws(() => loadConfig({ ...valid, BCRYPT_SALT_ROUNDS: '50' }));
    assert.equal(loadConfig(valid).port, 3000);
    assert.deepEqual(loadConfig({ ...valid, CORS_ORIGIN: 'http://localhost:3000, https://example.com' }).corsOrigins, ['http://localhost:3000', 'https://example.com']);
});
