/** Canonical encoding, dictionary strategy, portability, and round-trip tests. */
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

  it('caps compact dictionaries at the decoder entry limit', () => {
    const words = Array.from({ length: 4_097 }, (_, index) => `dictionaryword${index.toString(36).padStart(4, '0')}`);
    const objective = `${words.join(' ')} ${words.join(' ')}`;
    const payload = encode({ ...task, id: 'dictionary-limit', objective });
    const dictionary = payload.split('|')[1]!.slice(2).split(',');

    expect(dictionary).toHaveLength(4_096);
    expect(decode(payload)).toEqual({ ...task, id: 'dictionary-limit', objective });
  });

  it('never emits more dictionary references than the decoder accepts', () => {
    const objective = 'referenceword '.repeat(65_537).trim();
    expect(() => encode({ ...task, id: 'reference-limit', objective })).toThrow(
      /Encoded CTL2 has \d+ dictionary references; maximum is 65536/
    );
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

  it('reports malformed UTF-16 source text explicitly', () => {
    expect(() => encode({ ...task, objective: '\uD800' })).toThrow(/source text contains malformed UTF-16/);
  });

  it('rejects invalid runtime options from untyped JavaScript callers', () => {
    expect(() => encode(task, { dictionaryMode: 'opaque' } as never)).toThrow(/Unsupported CTL2 dictionary mode/);
    expect(() => encode(task, null as never)).toThrow(/encode options must be an object/);
    expect(() => encode(task, [] as never)).toThrow(/encode options must be an object/);
  });
});
