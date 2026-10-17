/**
 * Dependency-free documentation integrity check.
 *
 * The script intentionally avoids a Markdown toolchain in the development
 * dependency graph. It verifies the repository's adoption-critical basics:
 * final newlines, trailing whitespace, balanced fences, and local link targets.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const markdownLinkPattern = /!?(?:\[[^\]]*\])\(([^)]+)\)/g;
const failures = [];

/** Recursively returns checked-in Markdown paths in lexical order. */
function findMarkdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory).sort()) {
    if (ignoredDirectories.has(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...findMarkdownFiles(path));
    else if (extname(path) === '.md') files.push(path);
  }
  return files;
}

/** Removes an optional title and surrounding angle brackets from a link target. */
function normalizeLinkTarget(rawTarget) {
  const withoutTitle = rawTarget.trim().split(/\s+["']/u, 1)[0] ?? '';
  return withoutTitle.replace(/^<|>$/gu, '');
}

/** Records style and local-link failures for one Markdown file. */
function checkMarkdownFile(path) {
  const content = readFileSync(path, 'utf8');
  const displayPath = relative(repositoryRoot, path);

  if (!content.endsWith('\n')) failures.push(`${displayPath}: missing final newline`);

  content.split('\n').forEach((line, index) => {
    if (/\s+$/u.test(line)) failures.push(`${displayPath}:${index + 1}: trailing whitespace`);
  });

  const fenceCount = content.split('\n').filter((line) => /^\s*```/u.test(line)).length;
  if (fenceCount % 2 !== 0) failures.push(`${displayPath}: unbalanced fenced code block`);

  for (const match of content.matchAll(markdownLinkPattern)) {
    const target = normalizeLinkTarget(match[1] ?? '');
    if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/iu.test(target)) continue;
    const fileTarget = decodeURIComponent(target.split('#', 1)[0] ?? '');
    if (fileTarget && !existsSync(resolve(dirname(path), fileTarget))) {
      failures.push(`${displayPath}: missing local link target ${fileTarget}`);
    }
  }
}

const markdownFiles = findMarkdownFiles(repositoryRoot);
for (const path of markdownFiles) checkMarkdownFile(path);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation checks passed for ${markdownFiles.length} Markdown files.`);
}
