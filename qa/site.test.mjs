import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const routes = ['', 'diagnostika/', 'strategiya/', 'privacy/', 'cookies/', 'consent/', 'terms/'];
for (const route of routes) {
  test(`SEO and accessible landmarks: /${route}`, () => {
    const path = `dist/${route}index.html`;
    assert.ok(existsSync(path), `Missing route: ${path}`);
    const html = readFileSync(path, 'utf8');
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /<html lang="ru"/);
    assert.match(html, /<main[^>]*id="main"/);
    assert.match(html, /name="description" content="[^"]{40,}"/);
    assert.match(html, /rel="canonical" href="https:\/\//);
    for (const block of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(block[1]);
    for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)/g)) {
      const file = match[1].endsWith('/') ? `${match[1]}index.html` : match[1];
      assert.ok(existsSync(`dist${file}`), `Unresolved local link ${match[1]}`);
    }
  });
}
test('Preview cannot be indexed accidentally', () => {
  assert.ok(existsSync('dist/robots.txt'));
  assert.match(readFileSync('dist/robots.txt','utf8'), /Disallow: \//);
});
