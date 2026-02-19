import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Build validation', () => {
  const html = (() => {
    execSync('node build.js', { cwd: process.cwd() });
    return fs.readFileSync('./index.html', 'utf-8');
  })();

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch ? scriptMatch[1] : '';

  it('index.html contains an inline script block', () => {
    expect(scriptContent.length).toBeGreaterThan(0);
  });

  it('no import statements remain in bundled script', () => {
    const imports = scriptContent.match(/^\s*import\s+/gm);
    expect(imports).toBeNull();
  });

  it('no export statements remain in bundled script', () => {
    const exports = scriptContent.match(/^\s*export\s+/gm);
    expect(exports).toBeNull();
  });

  it('bundled script is syntactically valid JavaScript', () => {
    expect(() => new Function(scriptContent)).not.toThrow();
  });

  it('script tag is not type="module"', () => {
    expect(html).not.toMatch(/<script type="module">/);
  });
});
