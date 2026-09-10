import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
test('Vercel serves the directory emitted by the static build',()=>{
  assert.ok(existsSync('vercel.json'),'Missing Vercel output configuration');
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.equal(config.outputDirectory,'dist');
  assert.equal(config.buildCommand,'npm run build');
  assert.equal(config.framework,null);
  assert.ok(existsSync(`${config.outputDirectory}/index.html`));
});
test('No decorative arrows or forced money-only headline remain',()=>{
  const files=readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('.html'));
  for(const file of files) assert.ok(!/[↗↖→↘↙]/u.test(readFileSync(`dist/${file}`,'utf8')),`Arrow remains in ${file}`);
  const home=readFileSync('dist/index.html','utf8');
  assert.ok(!home.includes('class="desktop-break"'),'Forced money-only line remains');
  assert.ok(home.includes('class="keep-together">теряет деньги.'),'Meaningful headline phrase must remain together');
});
