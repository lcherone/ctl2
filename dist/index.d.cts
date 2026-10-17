import { z } from 'zod';

/**
 * Runtime schemas and TypeScript types for CTL2 task handovers.
 *
 * The schemas are exported so applications can validate a task before it
 * reaches the encoder, use the same contract at API boundaries, and inspect
 * human-readable schema descriptions in generated tooling.
 *
 * @packageDocumentation
 */

/**
 * Runtime validator for the action an implementation agent should perform.
 *
 * - `implement`: add new behaviour.
 * - `fix`: correct defective behaviour.
 * - `refactor`: change structure without intentionally changing behaviour.
 * - `review`: inspect and report rather than mutate.
 * - `test`: add or execute verification work.
 */
declare const operationSchema: z.ZodEnum<["implement", "fix", "refactor", "review", "test"]>;
/** A supported task operation inferred from {@link operationSchema}. */
type Operation = z.infer<typeof operationSchema>;
/**
 * Runtime validator for the sensitivity of the context included in a task.
 *
 * This label is descriptive metadata. CTL2 does not enforce an organisation's
 * authorization policy and does not make restricted content private.
 */
declare const classificationSchema: z.ZodEnum<["public", "internal-approved", "restricted"]>;
/** A task-context classification inferred from {@link classificationSchema}. */
type ContextClassification = z.infer<typeof classificationSchema>;
/**
 * Runtime validator for payload representations supported by
 * {@link decodeTransferPayload}.
 */
declare const transferFormatSchema: z.ZodEnum<["ctl", "ctl-abstract", "json"]>;
/** A supported transfer representation inferred from {@link transferFormatSchema}. */
type TransferFormat = z.infer<typeof transferFormatSchema>;
/**
 * The complete, canonical input accepted by the CTL2 encoder.
 *
 * Every array is explicit, including when it is empty. Keeping assumptions
 * and exclusions separate from requirements prevents a receiver from having
 * to infer which statements are mandatory.
 */
interface HandoverTask {
    /** Version of the structured task schema. CTL2 currently accepts only `1`. */
    version: 1;
    /** Stable task identifier, between 1 and 160 characters. */
    id: string;
    /** Short human-readable task title, between 1 and 240 characters. */
    title: string;
    /** Complete statement of the result the receiver should achieve. */
    objective: string;
    /** Action the receiver should perform. */
    operation: Operation;
    /** Explicit files, modules, repositories, URLs, or systems in scope. */
    targets: string[];
    /** Behaviour and implementation requirements that must be preserved. */
    requirements: string[];
    /** Observable conditions used to decide whether the task is complete. */
    acceptanceCriteria: string[];
    /** Boundaries such as compatibility, safety, or change-scope restrictions. */
    constraints: string[];
    /** Commands or human checks expected to verify the outcome. */
    verification: string[];
    /** Unverified facts the task currently relies on. */
    assumptions: string[];
    /** Work explicitly excluded from the task. */
    exclusions: string[];
    /** Caller-assigned sensitivity label for the included context. */
    contextClassification: ContextClassification;
}
/**
 * Strict runtime validator for {@link HandoverTask}.
 *
 * Unknown object properties are rejected. List cardinality and aggregate byte
 * limits are enforced by {@link encode} and {@link decode}, because those
 * checks depend on the serialized representation rather than one field.
 *
 * @example Validate input before encoding
 * ```ts
 * const task = handoverTaskSchema.parse(untrustedInput);
 * const payload = encode(task);
 * ```
 */
declare const handoverTaskSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    id: z.ZodString;
    title: z.ZodString;
    objective: z.ZodString;
    operation: z.ZodEnum<["implement", "fix", "refactor", "review", "test"]>;
    targets: z.ZodArray<z.ZodString, "many">;
    requirements: z.ZodArray<z.ZodString, "many">;
    acceptanceCriteria: z.ZodArray<z.ZodString, "many">;
    constraints: z.ZodArray<z.ZodString, "many">;
    verification: z.ZodArray<z.ZodString, "many">;
    assumptions: z.ZodArray<z.ZodString, "many">;
    exclusions: z.ZodArray<z.ZodString, "many">;
    contextClassification: z.ZodEnum<["public", "internal-approved", "restricted"]>;
}, "strict", z.ZodTypeAny, {
    version: 1;
    id: string;
    title: string;
    objective: string;
    operation: "implement" | "fix" | "refactor" | "review" | "test";
    targets: string[];
    requirements: string[];
    acceptanceCriteria: string[];
    constraints: string[];
    verification: string[];
    assumptions: string[];
    exclusions: string[];
    contextClassification: "public" | "internal-approved" | "restricted";
}, {
    version: 1;
    id: string;
    title: string;
    objective: string;
    operation: "implement" | "fix" | "refactor" | "review" | "test";
    targets: string[];
    requirements: string[];
    acceptanceCriteria: string[];
    constraints: string[];
    verification: string[];
    assumptions: string[];
    exclusions: string[];
    contextClassification: "public" | "internal-approved" | "restricted";
}>;

/**
 * Deterministic CTL2 encoding, strict CTL2/CTL1 decoding, and format helpers.
 *
 * The implementation keeps canonical ordering and resource accounting in one
 * module so the central invariant remains easy to audit:
 * `decode(encode(task))` must equal the validated input task.
 *
 * @packageDocumentation
 */

/** Public shape of the fixed resource limits applied by the codec. */
interface CtlLimits {
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
declare const CTL_LIMITS: CtlLimits;
/** Dictionary strategy used when producing a CTL2 payload. */
type DictionaryMode = 'compact' | 'abstract';
/** Optional controls for {@link encode}. */
interface EncodeOptions {
    /**
     * `compact` includes only words that reduce the complete payload size.
     * `abstract` assigns deterministic shuffled codes to repeated words.
     * Defaults to `compact`.
     */
    dictionaryMode?: DictionaryMode;
}
/** Successful result returned by {@link validate}. */
interface ValidationSuccess {
    /** Discriminator indicating that decoding and schema validation passed. */
    valid: true;
    /** Fully decoded and schema-validated task. */
    task: HandoverTask;
    /** Always empty for a successful result. */
    errors: [];
}
/** Failed result returned by {@link validate}. */
interface ValidationFailure {
    /** Discriminator indicating that decoding or schema validation failed. */
    valid: false;
    /** Never present for a failed result. */
    task?: undefined;
    /** Human-readable error messages. Currently contains one entry. */
    errors: string[];
}
/** Non-throwing result returned by {@link validate}. */
type ValidationResult = ValidationSuccess | ValidationFailure;
/** Result returned by {@link compareFormats}. */
interface FormatComparison {
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
declare function encode(task: HandoverTask, options?: EncodeOptions): string;
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
declare function decode(payload: string): HandoverTask;
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
declare function decodeTransferPayload(format: TransferFormat, payload: string): HandoverTask;
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
declare function validate(payload: string): ValidationResult;
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
declare function compareFormats(task: HandoverTask): FormatComparison;

export { CTL_LIMITS, classificationSchema, compareFormats, decode, decodeTransferPayload, encode, handoverTaskSchema, operationSchema, transferFormatSchema, validate };
export type { ContextClassification, CtlLimits, DictionaryMode, EncodeOptions, FormatComparison, HandoverTask, Operation, TransferFormat, ValidationFailure, ValidationResult, ValidationSuccess };
