import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Navigation has one three-line toggle and a separate sliding content panel',()=>{
  const html=readFileSync('dist/index.html','utf8');
  const buttons=[...html.matchAll(/<button[^>]*class="menu-toggle"[^>]*>(.*?)<\/button>/gs)];
  assert.equal(buttons.length,1,'One continuous menu control');
  assert.equal((buttons[0][1].match(/<span/g)||[]).length,3,'Burger needs three lines');
  assert.match(html,/class="mobile-menu-panel"/);
  assert.doesNotMatch(html,/aria-label="Закрыть меню">×/);
});

test('Optional company field does not lengthen the initial mobile form',()=>{
  const html=readFileSync('dist/index.html','utf8');
  assert.match(html,/<details class="optional-company"><summary>Добавить компанию/);
  assert.doesNotMatch(html,/<details class="optional-company" open/);
});
