import { describe, expect, it } from 'vitest';
import {
  compareFormats,
  decode,
  decodeTransferPayload,
  encode,
  handoverTaskSchema,
  type HandoverTask
} from '../src/index.js';
import { canonicalTaskPayload, task } from './fixtures.js';

describe('CTL2 encoding and decoding', () => {
  it('is canonical, deterministic, and lossless', () => {
    expect(encode(task)).toBe(canonicalTaskPayload);
    expect(encode(structuredClone(task))).toBe(canonicalTaskPayload);
    expect(decode(canonicalTaskPayload)).toEqual(task);
    expect(encode(decode(canonicalTaskPayload))).toBe(canonicalTaskPayload);
  });

  it.each([
    ['implement', 'i'],
    ['fix', 'f'],
    ['refactor', 'r'],
    ['review', 'v'],
    ['test', 't']
  ] as const)('maps the %s operation to %s', (operation, token) => {
    const payload = encode({ ...task, operation });
    expect(payload).toContain(`|o:${token}|`);
    expect(decode(payload).operation).toBe(operation);
  });

  it.each([
    ['public', 'p'],
    ['internal-approved', 'a'],
    ['restricted', 's']
  ] as const)('maps the %s classification to %s', (contextClassification, token) => {
    const payload = encode({ ...task, contextClassification });
    expect(payload).toContain(`|k:${token}`);
    expect(decode(payload).contextClassification).toBe(contextClassification);
  });

  it('round-trips reserved characters, whitespace, paths, and Unicode', () => {
    const special: HandoverTask = {
      ...task,
      id: 'special',
      title: 'a+b % c ~ d | e, f / g : h = i',
      objective: 'line one\nline two\ttab\rreturn',
      targets: ['C:\\src\\thing.ts', '/tmp/東京/é.ts'],
      requirements: ['emoji 👩🏽‍💻 and astral 𠜎'],
      acceptanceCriteria: [],
      constraints: [],
      verification: [],
      assumptions: [],
      exclusions: []
    };
    expect(decode(encode(special))).toEqual(special);
  });

  it('uses a compact dictionary only when the complete payload gets smaller', () => {
    const repeated = {
      ...task,
      objective: 'Preserve compatibility and preserve behaviour.',
      requirements: ['Preserve compatibility.', 'Preserve behaviour.']
    };
    const payload = encode(repeated);
    expect(payload).toMatch(/^C2\|d:[^|]+/);
    expect(payload).toContain('~0');
    expect(decode(payload)).toEqual(repeated);

    const shortWords = encode({ ...task, id: 'short', title: 'a a a', objective: 'a a a' });
    expect(shortWords.split('|')[1]).not.toContain('=a');
  });

  it('uses deterministic abstract dictionaries for every repeated word', () => {
    const repeatedWords: HandoverTask = {
      ...task,
      id: 'abstract-stop-words',
      title: 'Review the agent result',
      objective: 'the agent and the reviewer check the result',
      requirements: ['the change helps the agent', 'and the result helps the reviewer']
    };
    const first = encode(repeatedWords, { dictionaryMode: 'abstract' });
    const second = encode(structuredClone(repeatedWords), { dictionaryMode: 'abstract' });
    const dictionary = first.split('|')[1]!;

    expect(dictionary).toContain('=the');
    expect(dictionary).toContain('=and');
    expect(first).toBe(second);
    expect(decode(first)).toEqual(repeatedWords);
    expect(encode(decode(first), { dictionaryMode: 'abstract' })).toBe(first);
  });

  it('changes an abstract dictionary when canonical input changes', () => {
    const repeated = { ...task, title: 'repeat repeat stable stable', objective: 'repeat repeat stable stable' };
    const changed = { ...repeated, objective: `${repeated.objective}!` };
    expect(encode(repeated, { dictionaryMode: 'abstract' })).not.toBe(encode(changed, { dictionaryMode: 'abstract' }));
  });

  it('compares both CTL modes with minified JSON without changing meaning', () => {
    const comparison = compareFormats(task);
    expect(JSON.parse(comparison.json)).toEqual(task);
    expect(decode(comparison.ctl)).toEqual(task);
    expect(decode(comparison.abstractCtl)).toEqual(task);
    expect(comparison.ctlBytes).toBe(new TextEncoder().encode(comparison.ctl).byteLength);
    expect(comparison.abstractCtlBytes).toBe(new TextEncoder().encode(comparison.abstractCtl).byteLength);
    expect(comparison.jsonBytes).toBe(new TextEncoder().encode(comparison.json).byteLength);
    expect(comparison.ctlBytes).toBeLessThan(comparison.jsonBytes);
  });

  it('decodes every transfer format', () => {
    const comparison = compareFormats(task);
    expect(decodeTransferPayload('ctl', comparison.ctl)).toEqual(task);
    expect(decodeTransferPayload('ctl-abstract', comparison.abstractCtl)).toEqual(task);
    expect(decodeTransferPayload('json', comparison.json)).toEqual(task);
  });

  it('does not depend on Node Buffer globals', () => {
    const original = globalThis.Buffer;
    // @ts-expect-error Verify that the public codec remains browser-compatible.
    globalThis.Buffer = undefined;
    try {
      expect(decode(encode(task))).toEqual(task);
      expect(compareFormats(task).ctlBytes).toBeGreaterThan(0);
    } finally {
      globalThis.Buffer = original;
    }
  });

  it('rejects invalid task shapes before encoding', () => {
    expect(() => encode({ ...task, extra: true } as HandoverTask)).toThrow();
    expect(() => encode({ ...task, id: '' })).toThrow();
    expect(() => encode({ ...task, title: 'x'.repeat(241) })).toThrow();
    expect(() => handoverTaskSchema.parse({ ...task, operation: 'deploy' })).toThrow();
  });
});
