/**
 * Non-throwing validation example for an untrusted CTL2 input boundary.
 *
 * Run after `npm run build`:
 *   node examples/validation.mjs
 */

import { validate } from '@lcherone/ctl2';

const incoming = 'C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|x:src/parser.ts|r:Preserve+API|a:Tests+pass|c:|v:npm+test|u:|e:|k:p';
const result = validate(incoming);

if (result.valid) {
  console.log(`Accepted task ${result.task.id}: ${result.task.title}`);
} else {
  console.error(`Rejected payload: ${result.errors.join('; ')}`);
  process.exitCode = 1;
}
