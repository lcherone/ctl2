/** Runtime schema strictness and human-readable metadata tests. */
import { describe, expect, it } from 'vitest';
import {
  classificationSchema,
  handoverTaskSchema,
  operationSchema,
  transferFormatSchema
} from '../src/index.js';
import { task } from './fixtures.js';

describe('public runtime schemas', () => {
  it('accepts the documented canonical task without cloning or defaults', () => {
    expect(handoverTaskSchema.parse(task)).toEqual(task);
  });

  it('rejects missing, empty, extra, and out-of-range task fields', () => {
    const missingObjective: Record<string, unknown> = { ...task };
    delete missingObjective.objective;
    expect(() => handoverTaskSchema.parse(missingObjective)).toThrow();
    expect(() => handoverTaskSchema.parse({ ...task, requirements: [''] })).toThrow();
    expect(() => handoverTaskSchema.parse({ ...task, extra: true })).toThrow();
    expect(() => handoverTaskSchema.parse({ ...task, id: 'x'.repeat(161) })).toThrow();
  });

  it('exposes human-readable descriptions for generated tooling', () => {
    expect(operationSchema.description).toMatch(/action/);
    expect(classificationSchema.description).toMatch(/sensitivity/);
    expect(transferFormatSchema.description).toMatch(/representation/);
    expect(handoverTaskSchema.description).toMatch(/handover task/);
    expect(handoverTaskSchema.shape.objective.description).toMatch(/objective/);
  });
});
