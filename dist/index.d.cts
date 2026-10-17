import { z } from 'zod';

declare const operationSchema: z.ZodEnum<["implement", "fix", "refactor", "review", "test"]>;
declare const classificationSchema: z.ZodEnum<["public", "internal-approved", "restricted"]>;
declare const transferFormatSchema: z.ZodEnum<["ctl", "ctl-abstract", "json"]>;
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
type HandoverTask = z.infer<typeof handoverTaskSchema>;
type Operation = z.infer<typeof operationSchema>;
type ContextClassification = z.infer<typeof classificationSchema>;
type TransferFormat = z.infer<typeof transferFormatSchema>;

declare const CTL_LIMITS: Readonly<{
    maxPayloadBytes: 1000000;
    maxDecodedBytes: 1000000;
    maxDictionaryEntries: 4096;
    maxListItems: 4096;
    maxDictionaryReferences: 65536;
}>;
interface ValidationResult {
    valid: boolean;
    task?: HandoverTask;
    errors: string[];
}
interface EncodeOptions {
    dictionaryMode?: 'compact' | 'abstract';
}
interface FormatComparison {
    ctl: string;
    abstractCtl: string;
    json: string;
    ctlBytes: number;
    abstractCtlBytes: number;
    jsonBytes: number;
}
declare function encode(task: HandoverTask, options?: EncodeOptions): string;
declare function decode(payload: string): HandoverTask;
declare function decodeTransferPayload(format: TransferFormat, payload: string): HandoverTask;
declare function validate(payload: string): ValidationResult;
declare function compareFormats(task: HandoverTask): FormatComparison;

export { CTL_LIMITS, classificationSchema, compareFormats, decode, decodeTransferPayload, encode, handoverTaskSchema, operationSchema, transferFormatSchema, validate };
export type { ContextClassification, EncodeOptions, FormatComparison, HandoverTask, Operation, TransferFormat, ValidationResult };
