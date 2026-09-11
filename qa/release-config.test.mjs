import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
test('Static build emits homepage and service routes',()=>{
  for(const route of ['index.html','diagnostika/index.html','strategiya/index.html']) {
    assert.ok(existsSync(`dist/${route}`),`Missing static route: ${route}`);
  }
});
test('No decorative arrows or forced money-only headline remain',()=>{
  const files=readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('.html'));
  for(const file of files) assert.ok(!/[↗↖→↘↙]/u.test(readFileSync(`dist/${file}`,'utf8')),`Arrow remains in ${file}`);
  const home=readFileSync('dist/index.html','utf8');
  assert.ok(!home.includes('class="desktop-break"'),'Forced money-only line remains');
  assert.ok(home.includes('class="keep-together">теряет деньги.'),'Meaningful headline phrase must remain together');
});
