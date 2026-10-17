/** Malformed-input, runtime-boundary, and resource-limit regression tests. */
import { describe, expect, it } from 'vitest';
import { CTL_LIMITS, decodeTransferPayload, encode, validate } from '../src/index.js';
import { canonicalTaskPayload, replaceField, task } from './fixtures.js';

describe('strict validation', () => {
  it.each([
    ['', /Unsupported CTL version/],
    ['C3|i:x', /Unsupported CTL version/],
    [canonicalTaskPayload.replace('|i:', '|z:'), /Unknown or out-of-order CTL token/],
    [canonicalTaskPayload.replace('|e:', '|q:'), /Unknown or out-of-order CTL token/],
    [canonicalTaskPayload.replace('|t:', '|t'), /Malformed C2 segment/],
    [`${canonicalTaskPayload}|extra:x`, /requires 13 fields/],
    [canonicalTaskPayload.replace('|o:r|', '|o:z|'), /Unknown CTL2 operation token/],
    [canonicalTaskPayload.replace('|k:a', '|k:z'), /Unknown CTL2 classification token/],
    [replaceField(canonicalTaskPayload, 't', '%E0%A4%A'), /Invalid CTL2 escape sequence/],
    [replaceField(canonicalTaskPayload, 't', '~'), /Malformed CTL2 dictionary reference/],
    [replaceField(canonicalTaskPayload, 't', '~z'), /Unknown CTL2 dictionary token/]
  ] as const)('rejects malformed payload %#', (payload, message) => {
    const result = validate(payload);
    expect(result.valid).toBe(false);
    expect(result.task).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(message);
  });

  it('accepts a valid payload and returns the decoded task', () => {
    expect(validate(canonicalTaskPayload)).toEqual({ valid: true, task, errors: [] });
  });

  it('rejects non-string payloads from untyped JavaScript callers', () => {
    expect(validate(null as never).errors[0]).toBe('CTL payload must be a string.');
    expect(validate(new Uint8Array() as never).errors[0]).toBe('CTL payload must be a string.');
  });

  it('rejects every truncated prefix of a canonical payload', () => {
    for (let length = 0; length < canonicalTaskPayload.length; length += 1) {
      expect(validate(canonicalTaskPayload.slice(0, length)).valid, `prefix length ${length}`).toBe(false);
    }
  });

  it.each([
    ['0=repeat,1=repeat', /Duplicate CTL2 dictionary word/],
    ['1=repeat', /Malformed or out-of-order CTL2 dictionary entry/],
    ['0=', /Invalid CTL2 dictionary word/],
    ['0=two+words', /Invalid CTL2 dictionary word/],
    ['0=punctuation!', /Invalid CTL2 dictionary word/],
    ['0=%E0%A4%A', /Invalid CTL2 escape sequence/]
  ])('rejects dictionary %s', (dictionary, message) => {
    const payload = `C2|d:${dictionary}|i:x|t:x|o:i|g:x|x:|r:|a:|c:|v:|u:|e:|k:p`;
    expect(validate(payload).errors[0]).toMatch(message);
  });

  it('rejects an oversized encoded payload before parsing', () => {
    const payload = `C2|${'x'.repeat(CTL_LIMITS.maxPayloadBytes)}`;
    expect(validate(payload).errors[0]).toMatch(/CTL payload .*1000000/);
  });

  it('measures payload limits in UTF-8 bytes rather than JavaScript characters', () => {
    const payload = `C2|${'é'.repeat(Math.floor(CTL_LIMITS.maxPayloadBytes / 2) + 1)}`;
    expect(payload.length).toBeLessThan(CTL_LIMITS.maxPayloadBytes);
    expect(validate(payload).errors[0]).toMatch(/payload is .* bytes; maximum is 1000000/);
  });

  it('rejects oversized dictionaries before decoding entries', () => {
    const dictionary = Array.from(
      { length: CTL_LIMITS.maxDictionaryEntries + 1 },
      (_, index) => `${index.toString(36)}=word${index}`
    ).join(',');
    const payload = `C2|d:${dictionary}|i:x|t:x|o:i|g:x|x:|r:|a:|c:|v:|u:|e:|k:p`;
    expect(validate(payload).errors[0]).toMatch(/dictionary has .* maximum/);
  });

  it('rejects oversized lists while encoding and decoding', () => {
    const values = Array.from({ length: CTL_LIMITS.maxListItems + 1 }, () => 'x');
    expect(() => encode({ ...task, targets: values })).toThrow(/targets list has .* maximum/);

    const payload = `C2|d:|i:x|t:x|o:i|g:x|x:${values.join(',')}|r:|a:|c:|v:|u:|e:|k:p`;
    expect(validate(payload).errors[0]).toMatch(/targets list has .* maximum/);
  });

  it('rejects decoded-size expansion bombs', () => {
    const word = 'a'.repeat(1_000);
    const references = Array.from({ length: Math.ceil(CTL_LIMITS.maxDecodedBytes / word.length) + 1 }, () => '~0').join('+');
    const payload = `C2|d:0=${word}|i:x|t:x|o:i|g:${references}|x:|r:|a:|c:|v:|u:|e:|k:p`;
    expect(validate(payload).errors[0]).toMatch(/Decoded CTL content exceeds/);
  });

  it('rejects too many dictionary references independently of byte expansion', () => {
    const references = '~0'.repeat(CTL_LIMITS.maxDictionaryReferences + 1);
    const payload = `C2|d:0=a|i:x|t:x|o:i|g:${references}|x:|r:|a:|c:|v:|u:|e:|k:p`;
    expect(validate(payload).errors[0]).toMatch(/more than .* dictionary references/);
  });

  it('rejects excessive source text before encoding', () => {
    expect(() => encode({ ...task, objective: 'x'.repeat(CTL_LIMITS.maxDecodedBytes + 1) })).toThrow(/task text exceeds/);
  });

  it('reports malformed JSON distinctly and validates parsed JSON strictly', () => {
    expect(() => decodeTransferPayload('json', '{not-json}')).toThrow(/Invalid JSON task payload/);
    expect(() => decodeTransferPayload('json', JSON.stringify({ ...task, operation: 'invent' }))).toThrow();
    expect(() => decodeTransferPayload('json', JSON.stringify({ ...task, extra: true }))).toThrow();
  });

  it('rejects unsupported transfer formats from untyped JavaScript callers', () => {
    expect(() => decodeTransferPayload('yaml' as never, canonicalTaskPayload)).toThrow(
      /Unsupported transfer format: yaml/
    );
  });
});
