/**
 * Builds the exact publishable tarball and verifies it in an isolated consumer.
 *
 * Packing uses `--ignore-scripts` to avoid recursively invoking `prepack` while
 * this script itself is part of the complete quality gate.
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), 'ctl2-tarball-'));
const consumerRoot = join(temporaryRoot, 'consumer');
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** Runs a subprocess and throws with captured output when it fails. */
function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${arguments_.join(' ')}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result.stdout;
}

/** Writes one UTF-8 consumer fixture below the isolated project root. */
function writeConsumerFile(relativePath, content) {
  writeFileSync(join(consumerRoot, relativePath), `${content.trim()}\n`, 'utf8');
}

try {
  const packOutput = run(
    npmExecutable,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', temporaryRoot],
    repositoryRoot
  );
  const packResult = JSON.parse(packOutput)[0];
  if (!packResult?.filename) throw new Error('npm pack did not return a tarball filename.');

  const tarballPath = join(temporaryRoot, packResult.filename);
  mkdirSync(consumerRoot);
  writeConsumerFile('package.json', JSON.stringify({ private: true, type: 'module' }, null, 2));
  run(
    npmExecutable,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    consumerRoot
  );

  const taskExpression = `{
    version: 1,
    id: 'tarball-consumer',
    title: 'Verify packed package',
    objective: 'Load and execute the exact publishable artifact.',
    operation: 'test',
    targets: [],
    requirements: [],
    acceptanceCriteria: ['ESM and CommonJS pass'],
    constraints: [],
    verification: [],
    assumptions: [],
    exclusions: [],
    contextClassification: 'public'
  }`;

  writeConsumerFile('esm.mjs', `
    import assert from 'node:assert/strict';
    import { decode, encode } from '@lcherone/ctl2';
    const task = ${taskExpression};
    assert.deepEqual(decode(encode(task)), task);
  `);
  writeConsumerFile('commonjs.cjs', `
    const assert = require('node:assert/strict');
    const { decode, encode } = require('@lcherone/ctl2');
    const task = ${taskExpression};
    assert.deepEqual(decode(encode(task)), task);
  `);
  writeConsumerFile('types.ts', `
    import { encode, type HandoverTask } from '@lcherone/ctl2';
    const task: HandoverTask = ${taskExpression};
    const payload: string = encode(task);
    void payload;
  `);
  writeConsumerFile('types.cts', `
    import { decode, type HandoverTask } from '@lcherone/ctl2';
    declare const payload: string;
    const task: HandoverTask = decode(payload);
    void task;
  `);
  writeConsumerFile('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      skipLibCheck: false,
      types: []
    },
    include: ['types.ts', 'types.cts']
  }, null, 2));

  run(process.execPath, ['esm.mjs'], consumerRoot);
  run(process.execPath, ['commonjs.cjs'], consumerRoot);
  run(
    process.execPath,
    [resolve(repositoryRoot, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json', '--noEmit'],
    consumerRoot
  );

  const installedPackage = JSON.parse(
    readFileSync(join(consumerRoot, 'node_modules/@lcherone/ctl2/package.json'), 'utf8')
  );
  console.log(
    `Packed consumer checks passed for ${installedPackage.name}@${installedPackage.version} ` +
    `(${packResult.size} bytes).`
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
