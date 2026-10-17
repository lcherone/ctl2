import { describe, expect, it } from 'vitest';
import { sampleTask } from '../data.js';
import { compactSavings, decodePlaygroundPayload, formatTask, parseTaskJson } from './playground.js';

describe('playground codec boundary', () => {
  it('validates and compares a complete task with the public CTL2 API', () => {
    const result = parseTaskJson(formatTask(sampleTask));

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.task).toEqual(sampleTask);
    expect(result.comparison.ctl).toMatch(/^C2\|/u);
    expect(result.comparison.abstractCtl).toMatch(/^C2\|/u);
    expect(result.comparison.jsonBytes).toBeGreaterThan(0);
    expect(compactSavings(result.comparison)).toBeGreaterThanOrEqual(0);
  });

  it('reports JSON syntax and strict schema failures', () => {
    expect(parseTaskJson('{').valid).toBe(false);

    const extraField = JSON.stringify({ ...sampleTask, unexpected: true });
    const result = parseTaskJson(extraField);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/unrecognized key/iu);
  });

  it('decodes compact, abstract, and JSON transfer representations', () => {
    const parsed = parseTaskJson(formatTask(sampleTask));
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;

    const cases = [
      ['ctl', parsed.comparison.ctl],
      ['ctl-abstract', parsed.comparison.abstractCtl],
      ['json', parsed.comparison.json]
    ] as const;

    for (const [format, payload] of cases) {
      const result = decodePlaygroundPayload(format, payload);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.task).toEqual(sampleTask);
    }
  });

  it('returns a useful error instead of throwing for malformed payloads', () => {
    const result = decodePlaygroundPayload('ctl', 'not-ctl');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
  });
});
