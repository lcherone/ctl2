import { z } from 'zod';

export const operationSchema = z.enum(['implement', 'fix', 'refactor', 'review', 'test']);
export const classificationSchema = z.enum(['public', 'internal-approved', 'restricted']);
export const transferFormatSchema = z.enum(['ctl', 'ctl-abstract', 'json']);

export const handoverTaskSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  objective: z.string().min(1),
  operation: operationSchema,
  targets: z.array(z.string().min(1)),
  requirements: z.array(z.string().min(1)),
  acceptanceCriteria: z.array(z.string().min(1)),
  constraints: z.array(z.string().min(1)),
  verification: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  exclusions: z.array(z.string().min(1)),
  contextClassification: classificationSchema
}).strict();

export type HandoverTask = z.infer<typeof handoverTaskSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type ContextClassification = z.infer<typeof classificationSchema>;
export type TransferFormat = z.infer<typeof transferFormatSchema>;
