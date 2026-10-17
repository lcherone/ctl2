/**
 * CTL2 public API.
 *
 * CTL2 provides deterministic, reversible serialization for explicit task
 * handovers. The package exports its codec, resource limits, runtime Zod
 * schemas, and TypeScript types from this single entry point. It has no hidden
 * subpath API.
 *
 * @example Encode and decode a task
 * ```ts
 * import { decode, encode, type HandoverTask } from '@lcherone/ctl2';
 *
 * const payload = encode(task);
 * const decoded: HandoverTask = decode(payload);
 * ```
 *
 * @packageDocumentation
 */

export {
  CTL_LIMITS,
  compareFormats,
  decode,
  decodeTransferPayload,
  encode,
  validate,
  type CtlLimits,
  type DictionaryMode,
  type EncodeOptions,
  type FormatComparison,
  type ValidationFailure,
  type ValidationResult,
  type ValidationSuccess
} from './codec.js';

export {
  classificationSchema,
  handoverTaskSchema,
  operationSchema,
  transferFormatSchema,
  type ContextClassification,
  type HandoverTask,
  type Operation,
  type TransferFormat
} from './schema.js';
