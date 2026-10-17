import type { HandoverTask } from '../../src/index.js';

/** Rich example used by the live playground and its interaction tests. */
export const sampleTask: HandoverTask = {
  version: 1,
  id: 'demo-1',
  title: 'Fix parser error handling',
  objective: 'Reject invalid parser input without changing the public API.',
  operation: 'fix',
  targets: ['src/parser.ts', 'test/parser.test.ts'],
  requirements: [
    'Preserve the public API',
    'Keep error messages deterministic',
    'Support Unicode input'
  ],
  acceptanceCriteria: [
    'Invalid input fails closed',
    'Existing callers still pass',
    'Regression tests cover the fix'
  ],
  constraints: ['Avoid unrelated changes'],
  verification: ['npm test', 'npm run typecheck'],
  assumptions: [],
  exclusions: ['No parser rewrite'],
  contextClassification: 'public'
};

/** Minimal valid task used by the playground reset action. */
export const resetTask: HandoverTask = {
  version: 1,
  id: 'new-task',
  title: 'New task',
  objective: 'Describe the required outcome.',
  operation: 'implement',
  targets: [],
  requirements: [],
  acceptanceCriteria: [],
  constraints: [],
  verification: [],
  assumptions: [],
  exclusions: [],
  contextClassification: 'public'
};

export const workflowSteps = [
  {
    number: '01',
    title: 'Validate',
    description: 'A strict Zod schema rejects missing, invalid, or unknown fields.',
    code: "handoverTaskSchema.parse(task);\n// throws on missing, invalid, or unknown fields"
  },
  {
    number: '02',
    title: 'Encode',
    description: 'Canonical field order and deterministic dictionaries produce stable output.',
    code: "const payload = encode(task);\n// stable, deterministic output"
  },
  {
    number: '03',
    title: 'Decode',
    description: 'The same payload restores the complete validated task.',
    code: "const restored = decode(payload);\n// complete, validated task"
  }
] as const;

export const guarantees = [
  ['Deterministic', 'Equal input and options produce byte-for-byte equal output.'],
  ['Lossless', 'All validated task data is preserved through encode and decode.'],
  ['Strict', 'Unknown versions, fields, tokens, and malformed escapes fail closed.'],
  ['Bounded', 'Fixed limits prevent oversized payloads and unbounded structures.'],
  ['Unicode-safe', 'Text and byte counts use Unicode-aware matching and UTF-8.'],
  ['CTL1 compatible', 'Stored canonical CTL1 payloads remain decodable.']
] as const;

export interface ApiEntry {
  name: string;
  signature: string;
  description: string;
  code: string;
}

export const apiEntries: ApiEntry[] = [
  {
    name: 'encode',
    signature: 'encode(task, options?)',
    description: 'Validates a task and returns a deterministic canonical CTL2 payload.',
    code: "import { encode } from '@lcherone/ctl2';\n\nconst payload = encode(task);\nconst abstract = encode(task, { dictionaryMode: 'abstract' });"
  },
  {
    name: 'decode',
    signature: 'decode(payload)',
    description: 'Decodes canonical CTL2 or stored CTL1 and validates the restored task.',
    code: "import { decode } from '@lcherone/ctl2';\n\nconst task = decode(payload);\nconsole.log(task.objective);"
  },
  {
    name: 'validate',
    signature: 'validate(payload)',
    description: 'Decodes without throwing and returns a discriminated success or failure result.',
    code: "import { validate } from '@lcherone/ctl2';\n\nconst result = validate(payload);\nif (result.valid) console.log(result.task);\nelse console.error(result.errors);"
  },
  {
    name: 'compareFormats',
    signature: 'compareFormats(task)',
    description: 'Produces compact CTL2, abstract CTL2, JSON, and exact UTF-8 byte counts.',
    code: "import { compareFormats } from '@lcherone/ctl2';\n\nconst formats = compareFormats(task);\nconsole.log(formats.ctlBytes, formats.jsonBytes);"
  },
  {
    name: 'decodeTransferPayload',
    signature: 'decodeTransferPayload(format, payload)',
    description: 'Accepts compact CTL2, abstract CTL2, or strict JSON through one boundary.',
    code: "import { decodeTransferPayload } from '@lcherone/ctl2';\n\nconst task = decodeTransferPayload('json', jsonPayload);"
  },
  {
    name: 'handoverTaskSchema',
    signature: 'handoverTaskSchema.parse(input)',
    description: 'Shares CTL2’s strict Zod task contract with forms, APIs, and persistence layers.',
    code: "import { handoverTaskSchema } from '@lcherone/ctl2';\n\nconst task = handoverTaskSchema.parse(untrustedInput);"
  },
  {
    name: 'CTL_LIMITS',
    signature: 'CTL_LIMITS',
    description: 'Exposes the fixed payload, decoded-text, dictionary, list, and reference limits.',
    code: "import { CTL_LIMITS } from '@lcherone/ctl2';\n\nconsole.log(CTL_LIMITS.maxPayloadBytes);\n// 1000000"
  }
];
