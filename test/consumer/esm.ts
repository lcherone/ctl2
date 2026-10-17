/** Compile-only fixture for the ESM conditional declaration export. */
import {
  CTL_LIMITS,
  compareFormats,
  decode,
  decodeTransferPayload,
  encode,
  handoverTaskSchema,
  validate,
  type CtlLimits,
  type DictionaryMode,
  type EncodeOptions,
  type FormatComparison,
  type HandoverTask,
  type ValidationResult
} from '@lcherone/ctl2';

const task: HandoverTask = {
  version: 1,
  id: 'esm-types',
  title: 'Verify ESM declarations',
  objective: 'Resolve every primary public type through the import condition.',
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

const mode: DictionaryMode = 'compact';
const options: EncodeOptions = { dictionaryMode: mode };
const payload: string = encode(task, options);
const decoded: HandoverTask = decode(payload);
const transferred: HandoverTask = decodeTransferPayload('ctl', payload);
const result: ValidationResult = validate(payload);
const comparison: FormatComparison = compareFormats(task);
const limits: CtlLimits = CTL_LIMITS;

handoverTaskSchema.parse(decoded);
void transferred;
void result;
void comparison;
void limits;
