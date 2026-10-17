import type { HandoverTask } from '../src/index.js';

export const task: HandoverTask = {
  version: 1,
  id: 'TASK-東京-1',
  title: 'Refactor category | tree, safely',
  objective: 'Use recursive CTEs without changing the public API. ✅',
  operation: 'refactor',
  targets: ['src/CategoryRepository.ts', 'tests/category,tree.test.ts'],
  requirements: ['Preserve output: including | delimiters', 'Support Unicode — café'],
  acceptanceCriteria: ['Existing callers still pass', 'Regression tests pass'],
  constraints: ['Avoid unrelated changes'],
  verification: ['npm test -- category'],
  assumptions: [],
  exclusions: ['No schema migration'],
  contextClassification: 'internal-approved'
};

export const canonicalTaskPayload = 'C2|d:0=category|i:TASK-%E6%9D%B1%E4%BA%AC-1|t:Refactor+~0+%7C+tree%2C+safely|o:r|g:Use+recursive+CTEs+without+changing+the+public+API.+%E2%9C%85|x:src/CategoryRepository.ts,tests/~0%2Ctree.test.ts|r:Preserve+output%3A+including+%7C+delimiters,Support+Unicode+%E2%80%94+caf%C3%A9|a:Existing+callers+still+pass,Regression+tests+pass|c:Avoid+unrelated+changes|v:npm+test+--+~0|u:|e:No+schema+migration|k:a';

export function replaceField(payload: string, field: string, value: string): string {
  return payload.replace(new RegExp(`\\|${field}:[^|]*`), `|${field}:${value}`);
}
