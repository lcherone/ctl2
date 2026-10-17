/** Compile-only fixture for the CommonJS conditional declaration export. */
import {
  CTL_LIMITS,
  decode,
  encode,
  validate,
  type HandoverTask,
  type ValidationResult
} from '@lcherone/ctl2';

const task: HandoverTask = {
  version: 1,
  id: 'cjs-types',
  title: 'Verify CommonJS declarations',
  objective: 'Resolve public values and types through the require condition.',
  operation: 'test',
  targets: [],
  requirements: [],
  acceptanceCriteria: ['TypeScript passes'],
  constraints: [],
  verification: ['npm run test:types'],
  assumptions: [],
  exclusions: [],
  contextClassification: 'public'
};

const payload: string = encode(task);
const decoded: HandoverTask = decode(payload);
const result: ValidationResult = validate(payload);
const maximumPayloadBytes: number = CTL_LIMITS.maxPayloadBytes;

void decoded;
void result;
void maximumPayloadBytes;
