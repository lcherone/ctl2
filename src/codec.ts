/**
 * Deterministic CTL2 encoding, strict CTL2/CTL1 decoding, and format helpers.
 *
 * The implementation keeps canonical ordering and resource accounting in one
 * module so the central invariant remains easy to audit:
 * `decode(encode(task))` must equal the validated input task.
 *
 * @packageDocumentation
 */

import {
  handoverTaskSchema,
  transferFormatSchema,
  type HandoverTask,
  type Operation,
  type TransferFormat
} from './schema.js';

/** Canonical field order for backwards-compatible CTL1 payloads. */
const V1_FIELD_ORDER = ['ID', 'T', 'O', 'G', 'X', 'R', 'A', 'C', 'V', 'U', 'E', 'K'] as const;

/** Canonical field order for CTL2 payloads, excluding the `C2` prefix. */
const V2_FIELD_ORDER = ['d', 'i', 't', 'o', 'g', 'x', 'r', 'a', 'c', 'v', 'u', 'e', 'k'] as const;

/** Mapping retained solely for decoding stored CTL1 operation tokens. */
const V1_OPERATION_TOKEN: Record<Operation, string> = {
  implement: 'IMP',
  fix: 'FIX',
  refactor: 'REF',
  review: 'REV',
  test: 'TST'
};

/** Canonical CTL2 operation-token mapping used by new payloads. */
const V2_OPERATION_TOKEN: Record<Operation, string> = {
  implement: 'i',
  fix: 'f',
  refactor: 'r',
  review: 'v',
  test: 't'
};

/** Reverse lookup for CTL1 operation tokens. */
const V1_TOKEN_OPERATION = reverse(V1_OPERATION_TOKEN) as Record<string, Operation>;

/** Reverse lookup for CTL2 operation tokens. */
const V2_TOKEN_OPERATION = reverse(V2_OPERATION_TOKEN) as Record<string, Operation>;

/** Mapping retained solely for decoding stored CTL1 classification tokens. */
const V1_CLASSIFICATION_TOKEN = {
  public: 'PUB',
  'internal-approved': 'INT',
  restricted: 'RES'
} as const;

/** Canonical CTL2 classification-token mapping used by new payloads. */
const V2_CLASSIFICATION_TOKEN = {
  public: 'p',
  'internal-approved': 'a',
  restricted: 's'
} as const;

/** Reverse lookup for CTL1 classification tokens. */
const V1_TOKEN_CLASSIFICATION = reverse(V1_CLASSIFICATION_TOKEN) as Record<
  string,
  HandoverTask['contextClassification']
>;

/** Reverse lookup for CTL2 classification tokens. */
const V2_TOKEN_CLASSIFICATION = reverse(V2_CLASSIFICATION_TOKEN) as Record<
  string,
  HandoverTask['contextClassification']
>;

/** Unicode-aware definition of a dictionary-eligible word. */
const WORD_PATTERN = /[\p{L}\p{N}_-]+/gu;

/** CTL2 dictionary reference: a tilde followed by a lower-case base-36 code. */
const DICTIONARY_REFERENCE_PATTERN = /~([0-9a-z]+)/g;

/** Shared stateless UTF-8 encoder used for browser-compatible byte counts. */
const UTF8_ENCODER = new TextEncoder();

/** Public shape of the fixed resource limits applied by the codec. */
export interface CtlLimits {
  /** Maximum UTF-8 byte length accepted for one encoded payload. */
  readonly maxPayloadBytes: number;
  /** Maximum aggregate UTF-8 bytes allowed after decoding task text. */
  readonly maxDecodedBytes: number;
  /** Maximum number of entries accepted in a payload-local dictionary. */
  readonly maxDictionaryEntries: number;
  /** Maximum number of items accepted in each task-list field. */
  readonly maxListItems: number;
  /** Maximum dictionary references expanded across one CTL2 payload. */
  readonly maxDictionaryReferences: number;
}

/**
 * Fixed safety limits enforced during both encoding and decoding.
 *
 * These values prevent a small payload from causing unbounded dictionary,
 * list, or decoded-text growth. Changing them can alter interoperability and
 * therefore requires a versioned compatibility decision.
 */
export const CTL_LIMITS: CtlLimits = Object.freeze({
  maxPayloadBytes: 1_000_000,
  maxDecodedBytes: 1_000_000,
  maxDictionaryEntries: 4_096,
  maxListItems: 4_096,
  maxDictionaryReferences: 65_536
});

/** Dictionary strategy used when producing a CTL2 payload. */
export type DictionaryMode = 'compact' | 'abstract';

/** Optional controls for {@link encode}. */
export interface EncodeOptions {
  /**
   * `compact` includes only words that reduce the complete payload size.
   * `abstract` assigns deterministic shuffled codes to repeated words.
   * Defaults to `compact`.
   */
  dictionaryMode?: DictionaryMode;
}

/** Successful result returned by {@link validate}. */
export interface ValidationSuccess {
  /** Discriminator indicating that decoding and schema validation passed. */
  valid: true;
  /** Fully decoded and schema-validated task. */
  task: HandoverTask;
  /** Always empty for a successful result. */
  errors: [];
}

/** Failed result returned by {@link validate}. */
export interface ValidationFailure {
  /** Discriminator indicating that decoding or schema validation failed. */
  valid: false;
  /** Never present for a failed result. */
  task?: undefined;
  /** Human-readable error messages. Currently contains one entry. */
  errors: string[];
}

/** Non-throwing result returned by {@link validate}. */
export type ValidationResult = ValidationSuccess | ValidationFailure;

/** Result returned by {@link compareFormats}. */
export interface FormatComparison {
  /** Canonical size-optimized CTL2 payload. */
  ctl: string;
  /** Canonical abstract-dictionary CTL2 payload. */
  abstractCtl: string;
  /** Canonical task serialized as minified JSON. */
  json: string;
  /** UTF-8 byte length of {@link FormatComparison.ctl}. */
  ctlBytes: number;
  /** UTF-8 byte length of {@link FormatComparison.abstractCtl}. */
  abstractCtlBytes: number;
  /** UTF-8 byte length of {@link FormatComparison.json}. */
  jsonBytes: number;
}

/** Mutable counters shared across one decode operation. */
interface DecodeBudget {
  /** Aggregate UTF-8 bytes emitted so far. */
  bytes: number;
  /** Dictionary references expanded so far. */
  references: number;
}

/**
 * Reverses a string-to-string record for constant-time token lookup.
 *
 * @param value - Mapping whose values are unique protocol tokens.
 * @returns A new record mapping each token back to its original key.
 */
function reverse(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).map(([key, token]) => [token, key]));
}

/**
 * Calculates a string's UTF-8 byte length without relying on Node globals.
 *
 * @param value - Text to measure.
 * @returns UTF-8 byte length of `value`.
 */
function byteLength(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

/**
 * Counts a one-character delimiter without allocating an array of segments.
 *
 * @param value - Text to inspect.
 * @param delimiter - One-character delimiter to count.
 * @returns Number of delimiter occurrences.
 */
function countDelimiter(value: string, delimiter: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === delimiter) count += 1;
  }
  return count;
}

/**
 * Rejects a payload that exceeds the encoded UTF-8 byte limit.
 *
 * @param payload - Complete CTL payload.
 * @throws {Error} When the payload is not a string or exceeds
 * `maxPayloadBytes`.
 */
function assertPayloadWithinLimit(payload: string): void {
  if (typeof payload !== 'string') {
    throw new Error('CTL payload must be a string.');
  }
  if (payload.length > CTL_LIMITS.maxPayloadBytes) {
    throw new Error(`CTL payload has more than ${CTL_LIMITS.maxPayloadBytes} characters.`);
  }
  const bytes = byteLength(payload);
  if (bytes > CTL_LIMITS.maxPayloadBytes) {
    throw new Error(`CTL payload is ${bytes} bytes; maximum is ${CTL_LIMITS.maxPayloadBytes}.`);
  }
}

/**
 * Rejects a task-list field that exceeds the per-list item limit.
 *
 * @param field - Human-readable field name used in the error.
 * @param itemCount - Number of items in the list.
 * @throws {Error} When `itemCount` exceeds `maxListItems`.
 */
function assertListWithinLimit(field: string, itemCount: number): void {
  if (itemCount > CTL_LIMITS.maxListItems) {
    throw new Error(`CTL ${field} list has ${itemCount} items; maximum is ${CTL_LIMITS.maxListItems}.`);
  }
}

/**
 * Accounts for newly decoded text before returning it to the caller.
 *
 * @param budget - Request-local resource counters.
 * @param value - Newly decoded text.
 * @returns `value` when it remains inside the decoded-size budget.
 * @throws {Error} When aggregate decoded text exceeds `maxDecodedBytes`.
 */
function consumeDecodedBytes(budget: DecodeBudget, value: string): string {
  budget.bytes += byteLength(value);
  if (budget.bytes > CTL_LIMITS.maxDecodedBytes) {
    throw new Error(`Decoded CTL content exceeds ${CTL_LIMITS.maxDecodedBytes} bytes.`);
  }
  return value;
}

/**
 * Returns task text in canonical field order for hashing and resource checks.
 *
 * @param task - Validated task.
 * @returns A flattened array containing every free-text value.
 */
function taskTextValues(task: HandoverTask): string[] {
  return [
    task.id,
    task.title,
    task.objective,
    ...task.targets,
    ...task.requirements,
    ...task.acceptanceCriteria,
    ...task.constraints,
    ...task.verification,
    ...task.assumptions,
    ...task.exclusions
  ];
}

/**
 * Applies list and aggregate decoded-text limits before encoding.
 *
 * @param task - Schema-validated task.
 * @throws {Error} When the task exceeds a codec resource limit.
 */
function assertTaskWithinLimits(task: HandoverTask): void {
  const lists: Array<[string, string[]]> = [
    ['targets', task.targets],
    ['requirements', task.requirements],
    ['acceptance criteria', task.acceptanceCriteria],
    ['constraints', task.constraints],
    ['verification', task.verification],
    ['assumptions', task.assumptions],
    ['exclusions', task.exclusions]
  ];
  for (const [field, values] of lists) assertListWithinLimit(field, values.length);

  let bytes = 0;
  for (const value of taskTextValues(task)) {
    bytes += byteLength(value);
    if (bytes > CTL_LIMITS.maxDecodedBytes) {
      throw new Error(`Handover task text exceeds ${CTL_LIMITS.maxDecodedBytes} bytes.`);
    }
  }
}

/**
 * Decodes one CTL1 percent-encoded value.
 *
 * @param value - Encoded CTL1 text.
 * @returns Decoded text.
 * @throws {Error} When `value` contains malformed percent escapes.
 */
function decodeV1Text(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid CTL1 escape sequence: ${value}`);
  }
}

/**
 * Encodes literal CTL2 text while preserving readable spaces and path slashes.
 *
 * Literal tildes are always escaped so they cannot be confused with dictionary
 * references during decoding.
 *
 * @param value - Literal text to encode.
 * @returns Canonically escaped CTL2 literal text.
 * @throws {Error} When `value` contains malformed UTF-16.
 */
function encodeLiteral(value: string): string {
  try {
    return encodeURIComponent(value)
      .replace(/~/g, '%7E')
      .replace(/%20/g, '+')
      .replace(/%2F/gi, '/');
  } catch (error) {
    throw new Error('CTL2 source text contains malformed UTF-16.', { cause: error });
  }
}

/**
 * Decodes one CTL2 literal segment.
 *
 * @param value - Canonically escaped literal text.
 * @returns Decoded text.
 * @throws {Error} When `value` contains malformed percent escapes.
 */
function decodeLiteral(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    throw new Error(`Invalid CTL2 escape sequence: ${value}`);
  }
}

/**
 * Validates and resolves the requested dictionary mode for JavaScript callers.
 *
 * TypeScript catches invalid modes statically; this runtime check prevents an
 * untyped caller from silently falling back to compact behaviour.
 *
 * @param options - Caller-supplied encode options.
 * @returns Explicit `compact` or `abstract` mode.
 * @throws {Error} When the options object or dictionary mode is unsupported.
 */
function resolveDictionaryMode(options: EncodeOptions): DictionaryMode {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('CTL2 encode options must be an object.');
  }
  const mode = options.dictionaryMode ?? 'compact';
  if (mode !== 'compact' && mode !== 'abstract') {
    throw new Error(`Unsupported CTL2 dictionary mode: ${String(mode)}.`);
  }
  return mode;
}

/**
 * Derives a stable, non-cryptographic seed from every semantic task value.
 *
 * @param task - Validated task.
 * @returns Unsigned 32-bit seed for the abstract dictionary shuffle.
 */
function shuffleSeed(task: HandoverTask): number {
  let hash = 0x811C9DC5;
  const values = [task.operation, task.contextClassification, ...taskTextValues(task)];
  for (const value of values) {
    hash = Math.imul(hash ^ value.length, 0x01000193) >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
    }
  }
  return hash || 0x9E3779B9;
}

/**
 * Applies a seeded Fisher-Yates shuffle without mutating caller input.
 *
 * The xorshift sequence is deterministic, not cryptographically secure. Its
 * only purpose is stable abstract-code assignment.
 *
 * @param words - Repeated words eligible for dictionary assignment.
 * @param task - Task used to derive the stable shuffle seed.
 * @returns A deterministically shuffled copy of `words`.
 */
function deterministicallyShuffle(words: string[], task: HandoverTask): string[] {
  const shuffled = [...words];
  let state = shuffleSeed(task);
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = random() % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

/**
 * Builds a canonical payload-local dictionary for one task.
 *
 * Compact candidates are ranked by gross repeated-text savings, then by word
 * value for deterministic ties. A candidate is retained only when its entry
 * and every reference are smaller than the original text. Abstract mode uses
 * every repeated word up to the fixed entry limit.
 *
 * @param task - Validated task.
 * @param mode - Dictionary construction strategy.
 * @returns Dictionary words in canonical code-assignment order.
 */
function buildDictionary(task: HandoverTask, mode: DictionaryMode): string[] {
  const counts = new Map<string, number>();
  for (const value of taskTextValues(task)) {
    for (const match of value.matchAll(WORD_PATTERN)) {
      const word = match[0];
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  if (mode === 'abstract') {
    return deterministicallyShuffle(
      [...counts].filter(([, count]) => count > 1).map(([word]) => word),
      task
    ).slice(0, CTL_LIMITS.maxDictionaryEntries);
  }

  const candidates = [...counts]
    .filter(([word, count]) => count > 1 && encodeLiteral(word).length > 2)
    .sort(([leftWord, leftCount], [rightWord, rightCount]) => {
      const left = (leftCount - 1) * encodeLiteral(leftWord).length;
      const right = (rightCount - 1) * encodeLiteral(rightWord).length;
      if (left !== right) return right - left;
      return leftWord < rightWord ? -1 : leftWord > rightWord ? 1 : 0;
    });

  const dictionary: string[] = [];
  for (const [word, count] of candidates) {
    const code = dictionary.length.toString(36);
    const encodedLength = encodeLiteral(word).length;
    const rawCost = count * encodedLength;
    const dictionaryCost = code.length + 1 + encodedLength + (dictionary.length > 0 ? 1 : 0);
    const referenceCost = count * (code.length + 1);
    if (rawCost > dictionaryCost + referenceCost) {
      dictionary.push(word);
      if (dictionary.length === CTL_LIMITS.maxDictionaryEntries) break;
    }
  }
  return dictionary;
}

/**
 * Encodes text while substituting dictionary words with their base-36 codes.
 *
 * @param value - Source text.
 * @param codes - Word-to-code dictionary for the current payload.
 * @returns Canonically escaped CTL2 text containing zero or more references.
 */
function encodeV2Text(value: string, codes: Map<string, string>): string {
  let encoded = '';
  let offset = 0;
  for (const match of value.matchAll(WORD_PATTERN)) {
    const index = match.index;
    encoded += encodeLiteral(value.slice(offset, index));
    const word = match[0];
    const code = codes.get(word);
    encoded += code === undefined ? encodeLiteral(word) : `~${code}`;
    offset = index + word.length;
  }
  return encoded + encodeLiteral(value.slice(offset));
}

/**
 * Decodes literal text and dictionary references with shared resource limits.
 *
 * @param value - Encoded CTL2 field or list item.
 * @param dictionary - Code-to-word dictionary decoded from the payload.
 * @param budget - Request-local byte and reference counters.
 * @returns Fully decoded text.
 * @throws {Error} For malformed, unknown, or excessive references and escapes.
 */
function decodeV2Text(value: string, dictionary: Map<string, string>, budget: DecodeBudget): string {
  const decoded: string[] = [];
  let offset = 0;
  for (const match of value.matchAll(DICTIONARY_REFERENCE_PATTERN)) {
    budget.references += 1;
    if (budget.references > CTL_LIMITS.maxDictionaryReferences) {
      throw new Error(`CTL2 has more than ${CTL_LIMITS.maxDictionaryReferences} dictionary references.`);
    }
    const literal = value.slice(offset, match.index);
    if (literal.includes('~')) throw new Error('Malformed CTL2 dictionary reference.');
    decoded.push(consumeDecodedBytes(budget, decodeLiteral(literal)));
    const code = match[1]!;
    const word = dictionary.get(code);
    if (word === undefined) throw new Error(`Unknown CTL2 dictionary token: ${code}`);
    decoded.push(consumeDecodedBytes(budget, word));
    offset = match.index + match[0].length;
  }
  const trailing = value.slice(offset);
  if (trailing.includes('~')) throw new Error('Malformed CTL2 dictionary reference.');
  decoded.push(consumeDecodedBytes(budget, decodeLiteral(trailing)));
  return decoded.join('');
}

/**
 * Encodes one task-list field.
 *
 * @param values - List items in source order.
 * @param codes - Word-to-code dictionary for the current payload.
 * @returns Comma-separated encoded items, or an empty string for an empty list.
 */
function encodeV2List(values: string[], codes: Map<string, string>): string {
  return values.map((value) => encodeV2Text(value, codes)).join(',');
}

/**
 * Decodes one CTL2 task-list field after checking its cardinality.
 *
 * @param value - Comma-separated encoded items.
 * @param dictionary - Code-to-word dictionary for the current payload.
 * @param budget - Request-local byte and reference counters.
 * @param field - Human-readable field name used in limit errors.
 * @returns Decoded list items in source order.
 */
function decodeV2List(
  value: string,
  dictionary: Map<string, string>,
  budget: DecodeBudget,
  field: string
): string[] {
  if (value === '') return [];
  const itemCount = countDelimiter(value, ',') + 1;
  assertListWithinLimit(field, itemCount);
  return value.split(',').map((item) => decodeV2Text(item, dictionary, budget));
}

/**
 * Parses a versioned payload into canonical named fields.
 *
 * Exact delimiter count and field order are checked before a map is returned,
 * so downstream decoding never accepts missing, extra, duplicated, or
 * reordered fields.
 *
 * @param payload - Complete CTL payload.
 * @param version - Expected prefix (`C2` or `CTL1`).
 * @param order - Required field keys in canonical order.
 * @returns Map containing the encoded value for every expected field.
 * @throws {Error} When shape, version, syntax, or field order is invalid.
 */
function parseSegments(payload: string, version: string, order: readonly string[]): Map<string, string> {
  if (countDelimiter(payload, '|') !== order.length) {
    throw new Error(`${version} requires ${order.length} fields in canonical order.`);
  }
  const segments = payload.split('|');
  if (segments.shift() !== version) throw new Error(`Unsupported CTL version. Expected ${version}.`);
  const values = new Map<string, string>();
  segments.forEach((segment, index) => {
    const separator = segment.indexOf(':');
    if (separator < 1) throw new Error(`Malformed ${version} segment at position ${index + 1}.`);
    const key = segment.slice(0, separator);
    const expected = order[index];
    if (key !== expected) throw new Error(`Unknown or out-of-order CTL token ${key}; expected ${expected}.`);
    values.set(key, segment.slice(separator + 1));
  });
  return values;
}

/**
 * Decodes and validates the CTL2 payload-local dictionary.
 *
 * Codes must be sequential lower-case base-36 values beginning at `0`, words
 * must match the same Unicode word grammar used by the encoder, and duplicate
 * words are rejected.
 *
 * @param value - Encoded dictionary field without the `d:` prefix.
 * @returns Code-to-word dictionary.
 * @throws {Error} When an entry, order, escape, word, or limit is invalid.
 */
function decodeDictionary(value: string): Map<string, string> {
  const dictionary = new Map<string, string>();
  if (!value) return dictionary;
  const entryCount = countDelimiter(value, ',') + 1;
  if (entryCount > CTL_LIMITS.maxDictionaryEntries) {
    throw new Error(`CTL2 dictionary has ${entryCount} entries; maximum is ${CTL_LIMITS.maxDictionaryEntries}.`);
  }
  const decodedWords = new Set<string>();
  value.split(',').forEach((entry, index) => {
    const separator = entry.indexOf('=');
    const code = entry.slice(0, separator);
    if (separator < 1 || code !== index.toString(36)) {
      throw new Error(`Malformed or out-of-order CTL2 dictionary entry at position ${index + 1}.`);
    }
    const word = decodeLiteral(entry.slice(separator + 1));
    const words = word.match(WORD_PATTERN);
    if (!word || words?.length !== 1 || words[0] !== word) {
      throw new Error(`Invalid CTL2 dictionary word for token ${code}.`);
    }
    if (decodedWords.has(word)) throw new Error(`Duplicate CTL2 dictionary word for token ${code}.`);
    decodedWords.add(word);
    dictionary.set(code, word);
  });
  return dictionary;
}

/**
 * Encodes a structured task as canonical CTL2.
 *
 * The task is schema-validated before limits and dictionary construction are
 * applied. This function never returns a payload that exceeds the decoder's
 * own dictionary-entry or dictionary-reference limits.
 *
 * @param task - Complete task matching {@link HandoverTask}.
 * @param options - Optional dictionary strategy. Defaults to compact mode.
 * @returns Canonical CTL2 beginning with `C2|`.
 * @throws {import('zod').ZodError} When `task` does not match the strict schema.
 * @throws {Error} When task content, options, output size, or references exceed
 * supported limits.
 *
 * @example
 * ```ts
 * const payload = encode(task);
 * // C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|...
 * ```
 */
export function encode(task: HandoverTask, options: EncodeOptions = {}): string {
  const value = handoverTaskSchema.parse(task);
  assertTaskWithinLimits(value);
  const mode = resolveDictionaryMode(options);
  const dictionary = buildDictionary(value, mode);
  const codes = new Map(dictionary.map((word, index) => [word, index.toString(36)]));
  const text = (input: string) => encodeV2Text(input, codes);
  const list = (input: string[]) => encodeV2List(input, codes);
  const payload = [
    'C2',
    `d:${dictionary.map((word, index) => `${index.toString(36)}=${encodeLiteral(word)}`).join(',')}`,
    `i:${text(value.id)}`,
    `t:${text(value.title)}`,
    `o:${V2_OPERATION_TOKEN[value.operation]}`,
    `g:${text(value.objective)}`,
    `x:${list(value.targets)}`,
    `r:${list(value.requirements)}`,
    `a:${list(value.acceptanceCriteria)}`,
    `c:${list(value.constraints)}`,
    `v:${list(value.verification)}`,
    `u:${list(value.assumptions)}`,
    `e:${list(value.exclusions)}`,
    `k:${V2_CLASSIFICATION_TOKEN[value.contextClassification]}`
  ].join('|');

  const referenceCount = countDelimiter(payload, '~');
  if (referenceCount > CTL_LIMITS.maxDictionaryReferences) {
    throw new Error(
      `Encoded CTL2 has ${referenceCount} dictionary references; maximum is ${CTL_LIMITS.maxDictionaryReferences}.`
    );
  }
  assertPayloadWithinLimit(payload);
  return payload;
}

/**
 * Decodes a canonical CTL2 payload.
 *
 * @param payload - Size-checked payload beginning with `C2|`.
 * @returns Strictly validated task.
 */
function decodeV2(payload: string): HandoverTask {
  const values = parseSegments(payload, 'C2', V2_FIELD_ORDER);
  const dictionary = decodeDictionary(values.get('d') ?? '');
  const budget: DecodeBudget = { bytes: 0, references: 0 };
  const operationToken = values.get('o') ?? '';
  const classificationToken = values.get('k') ?? '';
  if (!V2_TOKEN_OPERATION[operationToken]) throw new Error(`Unknown CTL2 operation token: ${operationToken}`);
  if (!V2_TOKEN_CLASSIFICATION[classificationToken]) {
    throw new Error(`Unknown CTL2 classification token: ${classificationToken}`);
  }
  return handoverTaskSchema.parse({
    version: 1,
    id: decodeV2Text(values.get('i') ?? '', dictionary, budget),
    title: decodeV2Text(values.get('t') ?? '', dictionary, budget),
    operation: V2_TOKEN_OPERATION[operationToken],
    objective: decodeV2Text(values.get('g') ?? '', dictionary, budget),
    targets: decodeV2List(values.get('x') ?? '', dictionary, budget, 'targets'),
    requirements: decodeV2List(values.get('r') ?? '', dictionary, budget, 'requirements'),
    acceptanceCriteria: decodeV2List(values.get('a') ?? '', dictionary, budget, 'acceptance criteria'),
    constraints: decodeV2List(values.get('c') ?? '', dictionary, budget, 'constraints'),
    verification: decodeV2List(values.get('v') ?? '', dictionary, budget, 'verification'),
    assumptions: decodeV2List(values.get('u') ?? '', dictionary, budget, 'assumptions'),
    exclusions: decodeV2List(values.get('e') ?? '', dictionary, budget, 'exclusions'),
    contextClassification: V2_TOKEN_CLASSIFICATION[classificationToken]
  });
}

/**
 * Decodes a canonical legacy CTL1 payload into the current task schema.
 *
 * CTL1 support is decode-only. New payloads are always emitted as CTL2.
 *
 * @param payload - Size-checked payload beginning with `CTL1|`.
 * @returns Strictly validated current task.
 */
function decodeV1(payload: string): HandoverTask {
  const values = parseSegments(payload, 'CTL1', V1_FIELD_ORDER);
  const budget: DecodeBudget = { bytes: 0, references: 0 };
  const operationToken = values.get('O') ?? '';
  const classificationToken = values.get('K') ?? '';
  if (!V1_TOKEN_OPERATION[operationToken]) throw new Error(`Unknown CTL1 operation token: ${operationToken}`);
  if (!V1_TOKEN_CLASSIFICATION[classificationToken]) {
    throw new Error(`Unknown CTL1 classification token: ${classificationToken}`);
  }
  const text = (value: string) => consumeDecodedBytes(budget, decodeV1Text(value));
  const list = (value: string, field: string) => {
    if (value === '-') return [];
    const itemCount = countDelimiter(value, ',') + 1;
    assertListWithinLimit(field, itemCount);
    return value.split(',').map(text);
  };
  return handoverTaskSchema.parse({
    version: 1,
    id: text(values.get('ID') ?? ''),
    title: text(values.get('T') ?? ''),
    operation: V1_TOKEN_OPERATION[operationToken],
    objective: text(values.get('G') ?? ''),
    targets: list(values.get('X') ?? '-', 'targets'),
    requirements: list(values.get('R') ?? '-', 'requirements'),
    acceptanceCriteria: list(values.get('A') ?? '-', 'acceptance criteria'),
    constraints: list(values.get('C') ?? '-', 'constraints'),
    verification: list(values.get('V') ?? '-', 'verification'),
    assumptions: list(values.get('U') ?? '-', 'assumptions'),
    exclusions: list(values.get('E') ?? '-', 'exclusions'),
    contextClassification: V1_TOKEN_CLASSIFICATION[classificationToken]
  });
}

/**
 * Decodes and validates canonical CTL2 or legacy CTL1.
 *
 * @param payload - Complete serialized task.
 * @returns Fully decoded task matching {@link HandoverTask}.
 * @throws {Error} For unsupported versions, malformed syntax, invalid tokens,
 * bad escapes, unknown dictionary references, or resource-limit violations.
 * @throws {import('zod').ZodError} When decoded values violate the task schema.
 *
 * @example
 * ```ts
 * const task = decode('C2|d:|i:demo-1|t:Fix+parser|o:f|...');
 * ```
 */
export function decode(payload: string): HandoverTask {
  assertPayloadWithinLimit(payload);
  if (payload.startsWith('C2|')) return decodeV2(payload);
  if (payload.startsWith('CTL1|')) return decodeV1(payload);
  throw new Error('Unsupported CTL version. Expected C2 or CTL1.');
}

/**
 * Decodes one of the supported handover transport representations.
 *
 * Both CTL modes share the same CTL2 decoder because dictionary mode affects
 * encoding only. JSON is parsed and then passed through the same strict task
 * schema as CTL output.
 *
 * @param format - `ctl`, `ctl-abstract`, or `json`.
 * @param payload - Serialized task in the declared format.
 * @returns Strictly validated task.
 * @throws {Error} For an unsupported format or malformed JSON/CTL payload.
 * @throws {import('zod').ZodError} When the decoded task violates the schema.
 */
export function decodeTransferPayload(format: TransferFormat, payload: string): HandoverTask {
  const parsedFormat = transferFormatSchema.safeParse(format);
  if (!parsedFormat.success) {
    throw new Error(`Unsupported transfer format: ${String(format)}.`);
  }
  if (parsedFormat.data !== 'json') return decode(payload);
  try {
    return handoverTaskSchema.parse(JSON.parse(payload));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON task payload: ${error.message}`, { cause: error });
    }
    throw error;
  }
}

/**
 * Validates a CTL payload without throwing.
 *
 * Use this helper at user-input boundaries. Use {@link decode} when a thrown
 * error is more natural for the surrounding control flow.
 *
 * @param payload - Canonical CTL2 or legacy CTL1 payload.
 * @returns A discriminated success or failure result.
 *
 * @example
 * ```ts
 * const result = validate(payload);
 * if (result.valid) {
 *   console.log(result.task.objective);
 * } else {
 *   console.error(result.errors[0]);
 * }
 * ```
 */
export function validate(payload: string): ValidationResult {
  try {
    return { valid: true, task: decode(payload), errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

/**
 * Serializes a task in compact CTL2, abstract CTL2, and minified JSON.
 *
 * Byte counts use UTF-8 in every supported runtime. This helper is intended
 * for payload previews and measurement, not as a claim that CTL2 is always
 * smaller than JSON for every possible task.
 *
 * @param task - Complete task to compare.
 * @returns All three payloads and their exact UTF-8 byte lengths.
 * @throws {Error} When any representation cannot be encoded within limits.
 */
export function compareFormats(task: HandoverTask): FormatComparison {
  const ctl = encode(task);
  const abstractCtl = encode(task, { dictionaryMode: 'abstract' });
  const json = JSON.stringify(task);
  return {
    ctl,
    abstractCtl,
    json,
    ctlBytes: byteLength(ctl),
    abstractCtlBytes: byteLength(abstractCtl),
    jsonBytes: byteLength(json)
  };
}
