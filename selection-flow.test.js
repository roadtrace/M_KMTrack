const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('./index.html'),'utf8');
const controls = fs.readFileSync(require.resolve('./log-controls.js'),'utf8');
const css = fs.readFileSync(require.resolve('./sharing.css'),'utf8');

test('first Select press enters mode without selecting entries',()=>{
  const handler = html.match(/document\.getElementById\('select-toggle-btn'\)\.addEventListener\('click',[\s\S]*?\n\}\);/)[0];
  assert.match(handler,/if\(!selectMode\)\{[\s\S]*?selectedEntryIds\.clear\(\);[\s\S]*?selectMode = true;[\s\S]*?return;/);
  assert.doesNotMatch(handler,/visible\.forEach/);
});

test('Select stays text-based beside Export and becomes Cancel in selection mode',()=>{
  assert.match(controls,/footer\.append\(count,toggle,exportMenu,selectAll,deleteSelected\)/);
  assert.match(controls,/toggle\.textContent = selectMode \? 'Cancel' : 'Select'/);
  assert.match(controls,/toggle\.removeAttribute\('aria-checked'\)/);
  assert.match(css,/#select-toggle-btn\{[^}]*width:auto[^}]*font-size:12px/);
});

test('selection mode reveals the shared bulk actions without preselecting rows',()=>{
  assert.match(controls,/selectAll\.hidden=!selectMode/);
  assert.match(controls,/deleteSelected\.hidden=!selectMode/);
  assert.match(html,/bar\.style\.display = 'none'/);
});

test('footer actions keep equal geometry and date filters have no obsolete checkbox column',()=>{
  assert.match(css,/\.log-action-footer\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*padding:8px[^}]*border-radius:var\(--radius-lg\)/);
  assert.match(css,/\.log-action-footer button\{[^}]*width:100%[^}]*height:44px/);
  assert.match(css,/html:root \.log-action-footer :is\([^}]+\)\{\s*appearance:none;box-sizing:border-box;border:1px solid transparent;border-radius:var\(--radius-sm\);box-shadow:none;/);
  assert.match(css,/@media\(max-width:430px\)\{\s*html:root \.log-date-filters\{grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\) 44px;/);
  assert.doesNotMatch(css,/log-date-filters[^}]*44px 44px/);
});

test('deselecting the last row keeps selection mode open',()=>{
  assert.doesNotMatch(html,/selectMode = selectedEntryIds\.size > 0/);
});
