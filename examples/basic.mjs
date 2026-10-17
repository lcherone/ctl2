/**
 * Minimal end-to-end CTL2 example.
 *
 * Run after `npm run build`:
 *   node examples/basic.mjs
 */

import { decode, encode } from '@lcherone/ctl2';

const task = {
  version: 1,
  id: 'demo-1',
  title: 'Fix parser',
  objective: 'Reject invalid input.',
  operation: 'fix',
  targets: ['src/parser.ts'],
  requirements: ['Preserve API'],
  acceptanceCriteria: ['Tests pass'],
  constraints: [],
  verification: ['npm test'],
  assumptions: [],
  exclusions: [],
  contextClassification: 'public'
};

const payload = encode(task);
const decoded = decode(payload);

console.log('Input task:');
console.log(JSON.stringify(task, null, 2));
console.log('\nCTL2 output:');
console.log(payload);
console.log('\nDecoded output:');
console.log(JSON.stringify(decoded, null, 2));
