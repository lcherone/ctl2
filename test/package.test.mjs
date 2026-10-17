/** Direct smoke tests for generated ESM and CommonJS build artifacts. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '../dist/index.js';

const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');

/** Public task used to smoke-test both generated module formats. */
const sample = {
  version: 1,
  id: 'package-smoke',
  title: 'Package smoke test',
  objective: 'Prove both module formats expose a working codec.',
  operation: 'test',
  targets: [],
  requirements: [],
  acceptanceCriteria: ['Both formats work'],
  constraints: [],
  verification: [],
  assumptions: [],
  exclusions: [],
  contextClassification: 'public'
};

test('ES module export works', () => {
  assert.deepEqual(esm.decode(esm.encode(sample)), sample);
});

test('CommonJS export works', () => {
  assert.deepEqual(cjs.decode(cjs.encode(sample)), sample);
});
