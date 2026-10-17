/**
 * Ensures a GitHub release tag matches the package version exactly.
 *
 * The release workflow supplies `GITHUB_REF_NAME`. A positional argument is
 * also accepted for local verification, for example:
 *   node scripts/check-release-tag.mjs v0.2.0
 */

import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const releaseTag = process.env.GITHUB_REF_NAME ?? process.argv[2];
const expectedTag = `v${packageJson.version}`;

if (!releaseTag) {
  console.error('No release tag supplied through GITHUB_REF_NAME or argv.');
  process.exitCode = 1;
} else if (releaseTag !== expectedTag) {
  console.error(`Release tag ${releaseTag} does not match package version ${packageJson.version} (${expectedTag}).`);
  process.exitCode = 1;
} else {
  console.log(`Release tag ${releaseTag} matches package version ${packageJson.version}.`);
}
