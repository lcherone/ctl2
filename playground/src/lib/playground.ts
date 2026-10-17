import {
  compareFormats,
  decodeTransferPayload,
  handoverTaskSchema,
  type FormatComparison,
  type HandoverTask,
  type TransferFormat
} from '../../../src/index.js';

export type ParsedTask =
  | { valid: true; task: HandoverTask; comparison: FormatComparison }
  | { valid: false; error: string };

export type DecodedTask =
  | { valid: true; task: HandoverTask; formatted: string }
  | { valid: false; error: string };

/** Serializes task JSON for the editable example and decoded output. */
export function formatTask(task: HandoverTask): string {
  return JSON.stringify(task, null, 2);
}

/** Parses, validates, and compares an editable task document. */
export function parseTaskJson(value: string): ParsedTask {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = handoverTaskSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.length ? `${issue.path.join('.')}: ` : '';
      return { valid: false, error: `${path}${issue?.message ?? 'Task validation failed.'}` };
    }
    return {
      valid: true,
      task: result.data,
      comparison: compareFormats(result.data)
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Task input is not valid JSON.'
    };
  }
}

/** Decodes any transfer representation supported by the public package API. */
export function decodePlaygroundPayload(format: TransferFormat, payload: string): DecodedTask {
  try {
    const task = decodeTransferPayload(format, payload);
    return { valid: true, task, formatted: formatTask(task) };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unable to decode this payload.'
    };
  }
}

/** Returns the percentage reduction from minified JSON to compact CTL2. */
export function compactSavings(comparison: FormatComparison): number {
  if (comparison.jsonBytes === 0) return 0;
  return Math.max(0, Math.round((1 - comparison.ctlBytes / comparison.jsonBytes) * 100));
}
