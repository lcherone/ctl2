/** Executes checked-in examples to prevent documentation output drift. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const expectedPayload = 'C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|x:src/parser.ts|r:Preserve+API|a:Tests+pass|c:|v:npm+test|u:|e:|k:p';

/** Executes a checked-in example exactly as a user would run it. */
function runExample(file) {
  return spawnSync(process.execPath, [file], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });
}

test('basic example documents exact input and output', () => {
  const result = runExample('examples/basic.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"id": "demo-1"/);
  assert.match(result.stdout, /CTL2 output:/);
  assert.ok(result.stdout.includes(expectedPayload));
  assert.match(result.stdout, /Decoded output:/);
});

test('validation example accepts the documented canonical payload', () => {
  const result = runExample('examples/validation.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'Accepted task demo-1: Fix parser');
});
