/** Reproducible generated coverage for Unicode, delimiters, and both CTL2 modes. */
import { describe, expect, it } from 'vitest';
import { decode, encode, type HandoverTask } from '../src/index.js';

describe('deterministic fuzz coverage', () => {
  it('round-trips 1,000 generated tasks in compact and abstract modes', () => {
    // Fixed xorshift state keeps every generated failure exactly reproducible.
    let state = 0xC7122026;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x1_0000_0000;
    };
    const alphabet = Array.from('abcXYZ019 _-/|,:%~+=.é東京✅—\n\t');
    const text = (minimum = 1, maximum = 80) => {
      const length = minimum + Math.floor(random() * (maximum - minimum + 1));
      let result = '';
      for (let index = 0; index < length; index += 1) result += alphabet[Math.floor(random() * alphabet.length)];
      return result;
    };
    const list = () => Array.from({ length: Math.floor(random() * 6) }, () => text());
    const operations: HandoverTask['operation'][] = ['implement', 'fix', 'refactor', 'review', 'test'];
    const classifications: HandoverTask['contextClassification'][] = ['public', 'internal-approved', 'restricted'];

    for (let index = 0; index < 1_000; index += 1) {
      const generated: HandoverTask = {
        version: 1,
        id: `fuzz-${index}-${text(1, 24)}`,
        title: text(),
        objective: `${text()} repeated repeated repeated`,
        operation: operations[Math.floor(random() * operations.length)]!,
        targets: list(),
        requirements: list(),
        acceptanceCriteria: list(),
        constraints: list(),
        verification: list(),
        assumptions: list(),
        exclusions: list(),
        contextClassification: classifications[Math.floor(random() * classifications.length)]!
      };
      const compact = encode(generated);
      const abstract = encode(generated, { dictionaryMode: 'abstract' });
      expect(decode(compact)).toEqual(generated);
      expect(decode(abstract)).toEqual(generated);
      expect(encode(decode(compact))).toBe(compact);
      expect(encode(decode(abstract), { dictionaryMode: 'abstract' })).toBe(abstract);
    }
  });
});
