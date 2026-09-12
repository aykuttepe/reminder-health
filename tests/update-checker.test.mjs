import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from '../mobile-app/src/updateChecker.ts';

test('compareVersions correctly handles semver with and without v prefix', () => {
  // Newer versions
  assert.equal(compareVersions('0.3.0', '0.2.2'), 1);
  assert.equal(compareVersions('v0.3.0', '0.2.2'), 1);
  assert.equal(compareVersions('1.0.0', '0.9.9'), 1);
  assert.equal(compareVersions('0.2.3', '0.2.2'), 1);
  assert.equal(compareVersions('0.2.2.1', '0.2.2'), 1);

  // Equal versions
  assert.equal(compareVersions('0.2.2', '0.2.2'), 0);
  assert.equal(compareVersions('v0.2.2', '0.2.2'), 0);
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0);

  // Older versions
  assert.equal(compareVersions('0.2.1', '0.2.2'), -1);
  assert.equal(compareVersions('v0.1.9', '0.2.2'), -1);
  assert.equal(compareVersions('0.2.0', '0.3.0'), -1);
});
