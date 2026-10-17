import { describe, expect, it } from 'vitest';
import { decode, validate } from '../src/index.js';

describe('CTL1 compatibility', () => {
  it('decodes canonical stored payloads', () => {
    const legacy = 'CTL1|ID:t1|T:Legacy%20task|O:FIX|G:Preserve%20old%20handover%20records|X:src%2Fparser.ts|R:Keep%20API|A:Tests%20pass|C:-|V:npm%20test|U:-|E:-|K:INT';
    expect(decode(legacy)).toEqual({
      version: 1,
      id: 't1',
      title: 'Legacy task',
      operation: 'fix',
      objective: 'Preserve old handover records',
      targets: ['src/parser.ts'],
      requirements: ['Keep API'],
      acceptanceCriteria: ['Tests pass'],
      constraints: [],
      verification: ['npm test'],
      assumptions: [],
      exclusions: [],
      contextClassification: 'internal-approved'
    });
  });

  it.each([
    ['IMP', 'implement'],
    ['FIX', 'fix'],
    ['REF', 'refactor'],
    ['REV', 'review'],
    ['TST', 'test']
  ] as const)('maps legacy operation %s', (token, operation) => {
    const payload = `CTL1|ID:t1|T:Title|O:${token}|G:Goal|X:-|R:-|A:-|C:-|V:-|U:-|E:-|K:PUB`;
    expect(decode(payload).operation).toBe(operation);
  });

  it.each([
    ['PUB', 'public'],
    ['INT', 'internal-approved'],
    ['RES', 'restricted']
  ] as const)('maps legacy classification %s', (token, classification) => {
    const payload = `CTL1|ID:t1|T:Title|O:IMP|G:Goal|X:-|R:-|A:-|C:-|V:-|U:-|E:-|K:${token}`;
    expect(decode(payload).contextClassification).toBe(classification);
  });

  it('fails closed for invalid legacy tokens and escapes', () => {
    const base = 'CTL1|ID:t1|T:Title|O:IMP|G:Goal|X:-|R:-|A:-|C:-|V:-|U:-|E:-|K:PUB';
    expect(validate(base.replace('O:IMP', 'O:BAD')).errors[0]).toMatch(/Unknown CTL1 operation token/);
    expect(validate(base.replace('K:PUB', 'K:BAD')).errors[0]).toMatch(/Unknown CTL1 classification token/);
    expect(validate(base.replace('T:Title', 'T:%E0%A4%A')).errors[0]).toMatch(/Invalid CTL1 escape sequence/);
  });
});
