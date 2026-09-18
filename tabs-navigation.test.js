// Guards the four-tab shell and the relocated data controls.
// These were previously log-header controls; they now live in Tools/Settings.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('./index.html'),'utf8');
const controls = fs.readFileSync(require.resolve('./log-controls.js'),'utf8');
const design = fs.readFileSync(require.resolve('./design-system.css'),'utf8');

test('the tab bar exposes inspection, map, tools and settings',()=>{
  for(const view of ['inspection','map','tools','settings']){
    assert.match(html,new RegExp(`data-app-view="${view}"`));
    assert.match(html,new RegExp(`id="${view}-view"`));
  }
  // Four columns, not the original two.
  assert.match(design,/\.app-tab-bar\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('showAppView drives every view from one map of ids',()=>{
  assert.match(html,/const APP_VIEW_IDS = \{/);
  for(const id of ['inspection-view','map-view','tools-view','settings-view']){
    assert.match(html,new RegExp(`${id.replace('-','\\-')}`));
  }
  assert.match(html,/Object\.keys\(APP_VIEW_IDS\)\.forEach/);
  assert.match(html,/if\(viewName === 'map'\)\{/);
  assert.doesNotMatch(html,/const showMap = viewName === 'map'/);
});

test('data controls live in Tools and the theme toggle lives in Settings',()=>{
  const tools = html.slice(html.indexOf('id="tools-view"'),html.indexOf('id="settings-view"'));
  const settings = html.slice(html.indexOf('id="settings-view"'),html.indexOf('<nav class="app-tab-bar"'));
  for(const id of ['tools-export-actions','tools-import-actions','import-btn','import-history-btn','import-file','import-status']){
    assert.ok(tools.includes(id),`Tools should contain ${id}`);
  }
  for(const id of ['theme-toggle','dataset-drawer','storage-status','calib-reload','ramp-reload']){
    assert.ok(settings.includes(id),`Settings should contain ${id}`);
  }
  // The masthead keeps only the brand and the clock.
  const header = html.slice(html.indexOf('<header>'),html.indexOf('</header>'));
  assert.doesNotMatch(header,/theme-toggle|storage-status|dataset-drawer/);
});

test('export buttons stay in the DOM so the export dialog can adopt them',()=>{
  // log-controls.js moves #export-btn / #backup-btn into the format dialog,
  // so they must still exist in the shell.
  assert.match(html,/id="export-btn"/);
  assert.match(html,/id="backup-btn"/);
  assert.match(controls,/options\.append\(button\)/);
});

test('the design-system layer loads last so it wins the cascade',()=>{
  const designIndex = html.indexOf('design-system.css');
  for(const sheet of ['leaflet.css','radius-system.css','sharing.css','photo-viewer.css','map-overlays.css']){
    const i = html.indexOf(sheet);
    assert.ok(i !== -1,`${sheet} should still be linked`);
    assert.ok(i < designIndex,`design-system.css must load after ${sheet}`);
  }
});

test('radii are preserved rather than re-tuned by the design layer',()=>{
  // AGENTS.md protects the restored corner values; the new layer must not
  // redefine the radius scale.
  assert.doesNotMatch(design,/--radius-(xs|sm|md|lg|xl|full)\s*:/);
});
