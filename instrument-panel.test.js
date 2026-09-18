// Guards the merged instrument panel: the former .readout + .kmpost are now one
// card, but updateReadout()/renderBoundToggle() impose structural contracts
// that must survive future markup edits.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('./index.html'),'utf8');
const design = fs.readFileSync(require.resolve('./design-system.css'),'utf8');

test('one panel replaces the old readout and km-post pair',()=>{
  assert.match(html,/class="kmpost instrument-panel"/);
  assert.doesNotMatch(html,/class="readout"/);
  assert.doesNotMatch(html,/class="bound-panel"/);
  assert.doesNotMatch(html,/class="kmpost-grid"/);
});

test('#km-value stays inside .kmpost',()=>{
  // updateReadout() does kmEl.closest('.kmpost') to toggle interchange mode.
  const panel = html.slice(html.indexOf('instrument-panel'),html.indexOf('id="defect-section"'));
  assert.ok(panel.includes('id="km-value"'),'#km-value must live inside the .kmpost panel');
  assert.match(html,/kmEl\.closest\('\.kmpost'\)/);
});

test('every element the readout JS writes to still exists',()=>{
  for(const id of [
    'km-value','acc','lat','lon','count-mini','gps-status',
    'current-location-label','current-location-detail',
    'segment-tag','ramp-tag','nearby-asset-name','nearby-asset-station',
    'nearby-asset-distance','bridge-filter-toggle','bridge-filter-options',
  ]){
    assert.ok(html.includes(`id="${id}"`),`missing #${id}`);
  }
});

test('#bound-toggle keeps only dynamic content',()=>{
  // renderBoundToggle() overwrites wrap.innerHTML, so the BOUND label must sit
  // outside it or it would be destroyed on the first GPS fix.
  const start = html.indexOf('id="bound-toggle"');
  const inner = html.slice(start,html.indexOf('</div>',start));
  assert.ok(!/kmlabel/.test(inner),'the BOUND label must not be inside #bound-toggle');
  assert.match(html,/id="bound-auto-status"/);
});

test('the panel is a theme-aware quiet card, not a dark hero',()=>{
  assert.match(design,/\.instrument-panel\{[^}]*background:var\(--ds-card\)/);
  assert.match(design,/\.instrument-panel::before,\s*\.instrument-panel::after\{display:none;\}/);
  // Two columns with hairline separators.
  assert.match(design,/\.instrument-metrics\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(design,/\.instrument-metrics \.metric:nth-child\(even\)\{border-left:1px solid var\(--ds-border\);\}/);
});

test('the light theme still wins over the old green km-post overrides',()=>{
  // The inline sheet has html[data-theme="light"] .kmpost{color:#f7fffb} and
  // .kmpost .kmlabel{color:rgba(245,255,250,.86)}; both must be outranked.
  assert.match(design,/html\[data-theme="light"\] \.instrument-panel\{color:var\(--ds-fg\);\}/);
  assert.match(design,/html\[data-theme="light"\] \.instrument-panel \.kmlabel/);
});
