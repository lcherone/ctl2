/**
 * Runtime schemas and TypeScript types for CTL2 task handovers.
 *
 * The schemas are exported so applications can validate a task before it
 * reaches the encoder, use the same contract at API boundaries, and inspect
 * human-readable schema descriptions in generated tooling.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * Runtime validator for the action an implementation agent should perform.
 *
 * - `implement`: add new behaviour.
 * - `fix`: correct defective behaviour.
 * - `refactor`: change structure without intentionally changing behaviour.
 * - `review`: inspect and report rather than mutate.
 * - `test`: add or execute verification work.
 */
export const operationSchema = z
  .enum(['implement', 'fix', 'refactor', 'review', 'test'])
  .describe('The action the receiving agent should perform.');

/** A supported task operation inferred from {@link operationSchema}. */
export type Operation = z.infer<typeof operationSchema>;

/**
 * Runtime validator for the sensitivity of the context included in a task.
 *
 * This label is descriptive metadata. CTL2 does not enforce an organisation's
 * authorization policy and does not make restricted content private.
 */
export const classificationSchema = z
  .enum(['public', 'internal-approved', 'restricted'])
  .describe('The caller-assigned sensitivity classification for task context.');

/** A task-context classification inferred from {@link classificationSchema}. */
export type ContextClassification = z.infer<typeof classificationSchema>;

/**
 * Runtime validator for payload representations supported by
 * {@link decodeTransferPayload}.
 */
export const transferFormatSchema = z
  .enum(['ctl', 'ctl-abstract', 'json'])
  .describe('The serialized representation used to transfer a task.');

/** A supported transfer representation inferred from {@link transferFormatSchema}. */
export type TransferFormat = z.infer<typeof transferFormatSchema>;

/**
 * The complete, canonical input accepted by the CTL2 encoder.
 *
 * Every array is explicit, including when it is empty. Keeping assumptions
 * and exclusions separate from requirements prevents a receiver from having
 * to infer which statements are mandatory.
 */
export interface HandoverTask {
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
export const handoverTaskSchema = z.object({
  version: z.literal(1).describe('Structured task schema version.'),
  id: z.string().min(1).max(160).describe('Stable task identifier.'),
  title: z.string().min(1).max(240).describe('Short human-readable task title.'),
  objective: z.string().min(1).describe('Complete objective the receiver should achieve.'),
  operation: operationSchema,
  targets: z.array(z.string().min(1)).describe('Explicit files, modules, repositories, URLs, or systems in scope.'),
  requirements: z.array(z.string().min(1)).describe('Required behaviour and implementation requirements.'),
  acceptanceCriteria: z.array(z.string().min(1)).describe('Observable completion conditions.'),
  constraints: z.array(z.string().min(1)).describe('Compatibility, safety, and change-scope boundaries.'),
  verification: z.array(z.string().min(1)).describe('Commands or human checks expected to verify the outcome.'),
  assumptions: z.array(z.string().min(1)).describe('Unverified facts on which the task relies.'),
  exclusions: z.array(z.string().min(1)).describe('Work explicitly outside the task scope.'),
  contextClassification: classificationSchema
}).strict().describe('A complete version 1 CTL2 handover task') satisfies z.ZodType<HandoverTask>;
