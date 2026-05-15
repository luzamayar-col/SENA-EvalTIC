import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const { version } = pkg;

const readmePath = 'README.md';
const readme = readFileSync(readmePath, 'utf8');

const updated = readme.replace(
  /https:\/\/img\.shields\.io\/badge\/version-[\d.]+-blue(\?[^)]*)?/g,
  `https://img.shields.io/badge/version-${version}-blue?style=flat-square`
);

if (readme === updated) {
  console.log(`sync-version: badge already at ${version}`);
} else {
  writeFileSync(readmePath, updated);
  console.log(`sync-version: README badge → ${version}`);
}
