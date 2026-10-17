import { z } from 'zod';

// src/schema.ts
var operationSchema = z.enum(["implement", "fix", "refactor", "review", "test"]).describe("The action the receiving agent should perform.");
var classificationSchema = z.enum(["public", "internal-approved", "restricted"]).describe("The caller-assigned sensitivity classification for task context.");
var transferFormatSchema = z.enum(["ctl", "ctl-abstract", "json"]).describe("The serialized representation used to transfer a task.");
var handoverTaskSchema = z.object({
  version: z.literal(1).describe("Structured task schema version."),
  id: z.string().min(1).max(160).describe("Stable task identifier."),
  title: z.string().min(1).max(240).describe("Short human-readable task title."),
  objective: z.string().min(1).describe("Complete objective the receiver should achieve."),
  operation: operationSchema,
  targets: z.array(z.string().min(1)).describe("Explicit files, modules, repositories, URLs, or systems in scope."),
  requirements: z.array(z.string().min(1)).describe("Required behaviour and implementation requirements."),
  acceptanceCriteria: z.array(z.string().min(1)).describe("Observable completion conditions."),
  constraints: z.array(z.string().min(1)).describe("Compatibility, safety, and change-scope boundaries."),
  verification: z.array(z.string().min(1)).describe("Commands or human checks expected to verify the outcome."),
  assumptions: z.array(z.string().min(1)).describe("Unverified facts on which the task relies."),
  exclusions: z.array(z.string().min(1)).describe("Work explicitly outside the task scope."),
  contextClassification: classificationSchema
}).strict().describe("A complete version 1 CTL2 handover task");

// src/codec.ts
var V1_FIELD_ORDER = ["ID", "T", "O", "G", "X", "R", "A", "C", "V", "U", "E", "K"];
var V2_FIELD_ORDER = ["d", "i", "t", "o", "g", "x", "r", "a", "c", "v", "u", "e", "k"];
var V1_OPERATION_TOKEN = {
  implement: "IMP",
  fix: "FIX",
  refactor: "REF",
  review: "REV",
  test: "TST"
};
var V2_OPERATION_TOKEN = {
  implement: "i",
  fix: "f",
  refactor: "r",
  review: "v",
  test: "t"
};
var V1_TOKEN_OPERATION = reverse(V1_OPERATION_TOKEN);
var V2_TOKEN_OPERATION = reverse(V2_OPERATION_TOKEN);
var V1_CLASSIFICATION_TOKEN = {
  public: "PUB",
  "internal-approved": "INT",
  restricted: "RES"
};
var V2_CLASSIFICATION_TOKEN = {
  public: "p",
  "internal-approved": "a",
  restricted: "s"
};
var V1_TOKEN_CLASSIFICATION = reverse(V1_CLASSIFICATION_TOKEN);
var V2_TOKEN_CLASSIFICATION = reverse(V2_CLASSIFICATION_TOKEN);
var WORD_PATTERN = /[\p{L}\p{N}_-]+/gu;
var DICTIONARY_REFERENCE_PATTERN = /~([0-9a-z]+)/g;
var UTF8_ENCODER = new TextEncoder();
var CTL_LIMITS = Object.freeze({
  maxPayloadBytes: 1e6,
  maxDecodedBytes: 1e6,
  maxDictionaryEntries: 4096,
  maxListItems: 4096,
  maxDictionaryReferences: 65536
});
function reverse(value) {
  return Object.fromEntries(Object.entries(value).map(([key, token]) => [token, key]));
}
function byteLength(value) {
  return UTF8_ENCODER.encode(value).byteLength;
}
function countDelimiter(value, delimiter) {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === delimiter) count += 1;
  }
  return count;
}
function assertPayloadWithinLimit(payload) {
  if (typeof payload !== "string") {
    throw new Error("CTL payload must be a string.");
  }
  if (payload.length > CTL_LIMITS.maxPayloadBytes) {
    throw new Error(`CTL payload has more than ${CTL_LIMITS.maxPayloadBytes} characters.`);
  }
  const bytes = byteLength(payload);
  if (bytes > CTL_LIMITS.maxPayloadBytes) {
    throw new Error(`CTL payload is ${bytes} bytes; maximum is ${CTL_LIMITS.maxPayloadBytes}.`);
  }
}
function assertListWithinLimit(field, itemCount) {
  if (itemCount > CTL_LIMITS.maxListItems) {
    throw new Error(`CTL ${field} list has ${itemCount} items; maximum is ${CTL_LIMITS.maxListItems}.`);
  }
}
function consumeDecodedBytes(budget, value) {
  budget.bytes += byteLength(value);
  if (budget.bytes > CTL_LIMITS.maxDecodedBytes) {
    throw new Error(`Decoded CTL content exceeds ${CTL_LIMITS.maxDecodedBytes} bytes.`);
  }
  return value;
}
function taskTextValues(task) {
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
function assertTaskWithinLimits(task) {
  const lists = [
    ["targets", task.targets],
    ["requirements", task.requirements],
    ["acceptance criteria", task.acceptanceCriteria],
    ["constraints", task.constraints],
    ["verification", task.verification],
    ["assumptions", task.assumptions],
    ["exclusions", task.exclusions]
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
function decodeV1Text(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid CTL1 escape sequence: ${value}`);
  }
}
function encodeLiteral(value) {
  try {
    return encodeURIComponent(value).replace(/~/g, "%7E").replace(/%20/g, "+").replace(/%2F/gi, "/");
  } catch (error) {
    throw new Error("CTL2 source text contains malformed UTF-16.", { cause: error });
  }
}
function decodeLiteral(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"));
  } catch {
    throw new Error(`Invalid CTL2 escape sequence: ${value}`);
  }
}
function resolveDictionaryMode(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("CTL2 encode options must be an object.");
  }
  const mode = options.dictionaryMode ?? "compact";
  if (mode !== "compact" && mode !== "abstract") {
    throw new Error(`Unsupported CTL2 dictionary mode: ${String(mode)}.`);
  }
  return mode;
}
function shuffleSeed(task) {
  let hash = 2166136261;
  const values = [task.operation, task.contextClassification, ...taskTextValues(task)];
  for (const value of values) {
    hash = Math.imul(hash ^ value.length, 16777619) >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
    }
  }
  return hash || 2654435769;
}
function deterministicallyShuffle(words, task) {
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
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
function buildDictionary(task, mode) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of taskTextValues(task)) {
    for (const match of value.matchAll(WORD_PATTERN)) {
      const word = match[0];
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  if (mode === "abstract") {
    return deterministicallyShuffle(
      [...counts].filter(([, count]) => count > 1).map(([word]) => word),
      task
    ).slice(0, CTL_LIMITS.maxDictionaryEntries);
  }
  const candidates = [...counts].filter(([word, count]) => count > 1 && encodeLiteral(word).length > 2).sort(([leftWord, leftCount], [rightWord, rightCount]) => {
    const left = (leftCount - 1) * encodeLiteral(leftWord).length;
    const right = (rightCount - 1) * encodeLiteral(rightWord).length;
    if (left !== right) return right - left;
    return leftWord < rightWord ? -1 : leftWord > rightWord ? 1 : 0;
  });
  const dictionary = [];
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
function encodeV2Text(value, codes) {
  let encoded = "";
  let offset = 0;
  for (const match of value.matchAll(WORD_PATTERN)) {
    const index = match.index;
    encoded += encodeLiteral(value.slice(offset, index));
    const word = match[0];
    const code = codes.get(word);
    encoded += code === void 0 ? encodeLiteral(word) : `~${code}`;
    offset = index + word.length;
  }
  return encoded + encodeLiteral(value.slice(offset));
}
function decodeV2Text(value, dictionary, budget) {
  const decoded = [];
  let offset = 0;
  for (const match of value.matchAll(DICTIONARY_REFERENCE_PATTERN)) {
    budget.references += 1;
    if (budget.references > CTL_LIMITS.maxDictionaryReferences) {
      throw new Error(`CTL2 has more than ${CTL_LIMITS.maxDictionaryReferences} dictionary references.`);
    }
    const literal = value.slice(offset, match.index);
    if (literal.includes("~")) throw new Error("Malformed CTL2 dictionary reference.");
    decoded.push(consumeDecodedBytes(budget, decodeLiteral(literal)));
    const code = match[1];
    const word = dictionary.get(code);
    if (word === void 0) throw new Error(`Unknown CTL2 dictionary token: ${code}`);
    decoded.push(consumeDecodedBytes(budget, word));
    offset = match.index + match[0].length;
  }
  const trailing = value.slice(offset);
  if (trailing.includes("~")) throw new Error("Malformed CTL2 dictionary reference.");
  decoded.push(consumeDecodedBytes(budget, decodeLiteral(trailing)));
  return decoded.join("");
}
function encodeV2List(values, codes) {
  return values.map((value) => encodeV2Text(value, codes)).join(",");
}
function decodeV2List(value, dictionary, budget, field) {
  if (value === "") return [];
  const itemCount = countDelimiter(value, ",") + 1;
  assertListWithinLimit(field, itemCount);
  return value.split(",").map((item) => decodeV2Text(item, dictionary, budget));
}
function parseSegments(payload, version, order) {
  if (countDelimiter(payload, "|") !== order.length) {
    throw new Error(`${version} requires ${order.length} fields in canonical order.`);
  }
  const segments = payload.split("|");
  if (segments.shift() !== version) throw new Error(`Unsupported CTL version. Expected ${version}.`);
  const values = /* @__PURE__ */ new Map();
  segments.forEach((segment, index) => {
    const separator = segment.indexOf(":");
    if (separator < 1) throw new Error(`Malformed ${version} segment at position ${index + 1}.`);
    const key = segment.slice(0, separator);
    const expected = order[index];
    if (key !== expected) throw new Error(`Unknown or out-of-order CTL token ${key}; expected ${expected}.`);
    values.set(key, segment.slice(separator + 1));
  });
  return values;
}
function decodeDictionary(value) {
  const dictionary = /* @__PURE__ */ new Map();
  if (!value) return dictionary;
  const entryCount = countDelimiter(value, ",") + 1;
  if (entryCount > CTL_LIMITS.maxDictionaryEntries) {
    throw new Error(`CTL2 dictionary has ${entryCount} entries; maximum is ${CTL_LIMITS.maxDictionaryEntries}.`);
  }
  const decodedWords = /* @__PURE__ */ new Set();
  value.split(",").forEach((entry, index) => {
    const separator = entry.indexOf("=");
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
function encode(task, options = {}) {
  const value = handoverTaskSchema.parse(task);
  assertTaskWithinLimits(value);
  const mode = resolveDictionaryMode(options);
  const dictionary = buildDictionary(value, mode);
  const codes = new Map(dictionary.map((word, index) => [word, index.toString(36)]));
  const text = (input) => encodeV2Text(input, codes);
  const list = (input) => encodeV2List(input, codes);
  const payload = [
    "C2",
    `d:${dictionary.map((word, index) => `${index.toString(36)}=${encodeLiteral(word)}`).join(",")}`,
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
  ].join("|");
  const referenceCount = countDelimiter(payload, "~");
  if (referenceCount > CTL_LIMITS.maxDictionaryReferences) {
    throw new Error(
      `Encoded CTL2 has ${referenceCount} dictionary references; maximum is ${CTL_LIMITS.maxDictionaryReferences}.`
    );
  }
  assertPayloadWithinLimit(payload);
  return payload;
}
function decodeV2(payload) {
  const values = parseSegments(payload, "C2", V2_FIELD_ORDER);
  const dictionary = decodeDictionary(values.get("d") ?? "");
  const budget = { bytes: 0, references: 0 };
  const operationToken = values.get("o") ?? "";
  const classificationToken = values.get("k") ?? "";
  if (!V2_TOKEN_OPERATION[operationToken]) throw new Error(`Unknown CTL2 operation token: ${operationToken}`);
  if (!V2_TOKEN_CLASSIFICATION[classificationToken]) {
    throw new Error(`Unknown CTL2 classification token: ${classificationToken}`);
  }
  return handoverTaskSchema.parse({
    version: 1,
    id: decodeV2Text(values.get("i") ?? "", dictionary, budget),
    title: decodeV2Text(values.get("t") ?? "", dictionary, budget),
    operation: V2_TOKEN_OPERATION[operationToken],
    objective: decodeV2Text(values.get("g") ?? "", dictionary, budget),
    targets: decodeV2List(values.get("x") ?? "", dictionary, budget, "targets"),
    requirements: decodeV2List(values.get("r") ?? "", dictionary, budget, "requirements"),
    acceptanceCriteria: decodeV2List(values.get("a") ?? "", dictionary, budget, "acceptance criteria"),
    constraints: decodeV2List(values.get("c") ?? "", dictionary, budget, "constraints"),
    verification: decodeV2List(values.get("v") ?? "", dictionary, budget, "verification"),
    assumptions: decodeV2List(values.get("u") ?? "", dictionary, budget, "assumptions"),
    exclusions: decodeV2List(values.get("e") ?? "", dictionary, budget, "exclusions"),
    contextClassification: V2_TOKEN_CLASSIFICATION[classificationToken]
  });
}
function decodeV1(payload) {
  const values = parseSegments(payload, "CTL1", V1_FIELD_ORDER);
  const budget = { bytes: 0};
  const operationToken = values.get("O") ?? "";
  const classificationToken = values.get("K") ?? "";
  if (!V1_TOKEN_OPERATION[operationToken]) throw new Error(`Unknown CTL1 operation token: ${operationToken}`);
  if (!V1_TOKEN_CLASSIFICATION[classificationToken]) {
    throw new Error(`Unknown CTL1 classification token: ${classificationToken}`);
  }
  const text = (value) => consumeDecodedBytes(budget, decodeV1Text(value));
  const list = (value, field) => {
    if (value === "-") return [];
    const itemCount = countDelimiter(value, ",") + 1;
    assertListWithinLimit(field, itemCount);
    return value.split(",").map(text);
  };
  return handoverTaskSchema.parse({
    version: 1,
    id: text(values.get("ID") ?? ""),
    title: text(values.get("T") ?? ""),
    operation: V1_TOKEN_OPERATION[operationToken],
    objective: text(values.get("G") ?? ""),
    targets: list(values.get("X") ?? "-", "targets"),
    requirements: list(values.get("R") ?? "-", "requirements"),
    acceptanceCriteria: list(values.get("A") ?? "-", "acceptance criteria"),
    constraints: list(values.get("C") ?? "-", "constraints"),
    verification: list(values.get("V") ?? "-", "verification"),
    assumptions: list(values.get("U") ?? "-", "assumptions"),
    exclusions: list(values.get("E") ?? "-", "exclusions"),
    contextClassification: V1_TOKEN_CLASSIFICATION[classificationToken]
  });
}
function decode(payload) {
  assertPayloadWithinLimit(payload);
  if (payload.startsWith("C2|")) return decodeV2(payload);
  if (payload.startsWith("CTL1|")) return decodeV1(payload);
  throw new Error("Unsupported CTL version. Expected C2 or CTL1.");
}
function decodeTransferPayload(format, payload) {
  const parsedFormat = transferFormatSchema.safeParse(format);
  if (!parsedFormat.success) {
    throw new Error(`Unsupported transfer format: ${String(format)}.`);
  }
  if (parsedFormat.data !== "json") return decode(payload);
  try {
    return handoverTaskSchema.parse(JSON.parse(payload));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON task payload: ${error.message}`, { cause: error });
    }
    throw error;
  }
}
function validate(payload) {
  try {
    return { valid: true, task: decode(payload), errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
function compareFormats(task) {
  const ctl = encode(task);
  const abstractCtl = encode(task, { dictionaryMode: "abstract" });
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

export { CTL_LIMITS, classificationSchema, compareFormats, decode, decodeTransferPayload, encode, handoverTaskSchema, operationSchema, transferFormatSchema, validate };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map