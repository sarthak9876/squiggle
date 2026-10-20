import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '../src/brand.js';

/* brand.js exists because the name was once hardcoded into nineteen files and
   renaming meant a grep and a prayer. It drifted back: About said "About
   Squiggle", NotFound said "not a Squiggle page", and the archive's aria-label
   said "Squiggle #4, scored 900 out of 1600" — a hardcoded name AND a hardcoded
   total. The name is still not final, so this is the test that makes the next
   rename a one-line change.

   Component identifiers (SquiggleMark, SquiggleHero) are code, not copy, and
   comments are not shown to anyone. Only STRINGS that reach a player count. */
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.jsx?$/.test(p) && !p.endsWith('brand.js')) files.push(p);
  }
})('src');

/* Strip comments and import lines first. Without this the test fails on every
   comment that explains the rule, which is how a guard gets deleted. */
const strip = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // Trailing comments too, but NOT the // in https:// — stripping that would
  // swallow a genuinely hardcoded URL and the guard would pass on the bug.
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/^\s*import .*$/gm, '');

describe('the brand name lives in brand.js and nowhere else', () => {
  it('no component hardcodes the name in player-visible text', () => {
    const name = BRAND.name;
    const hits = [];
    for (const f of files) {
      strip(readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
        // Identifiers like SquiggleMark are code. A bare word is copy.
        if (new RegExp(`\\b${name}\\b(?![A-Za-z])`).test(line) && !/console\./.test(line)) {
          hits.push(`${f}:${i + 1} ${line.trim().slice(0, 70)}`);
        }
      });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('no file hardcodes the domain', () => {
    const hits = files
      .filter(f => strip(readFileSync(f, 'utf8')).includes(BRAND.domain))
      .map(f => f);
    expect(hits, `hardcoded ${BRAND.domain}: ${hits.join(', ')}`).toEqual([]);
  });
});
