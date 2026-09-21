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
    'km-value','acc','lat','lon','gps-status',
    'current-location-label',
    'segment-tag','ramp-tag','nearby-asset-name','nearby-asset-station',
    'nearby-asset-distance','bridge-filter-toggle','bridge-filter-options',
  ]){
    assert.ok(html.includes(`id="${id}"`),`missing #${id}`);
  }
});

test('the removed readout fields are gone and their writers are null-safe',()=>{
  // Dropped by request: the saved-record count and the "kilometers
  // (interpolated)" caption. updateReadout() must not assume they exist.
  assert.doesNotMatch(html,/id="count-mini"/);
  assert.doesNotMatch(html,/id="current-location-detail"/);
  assert.doesNotMatch(html,/locationDetail/);
  assert.doesNotMatch(html,/getElementById\('count-mini'\)\.textContent/);
  assert.match(html,/countMini\s*\)\s*countMini\.textContent/);
});

test('the station label reads Station, and Location inside an interchange',()=>{
  assert.match(html,/id="current-location-label">Station</);
  assert.match(html,/locationLabel\.textContent='Station'/);
  assert.match(html,/interchangeMode\?'Location':'Station'/);
  assert.doesNotMatch(html,/CURRENT KM STATION/);
});

test('the station leads, and the engineering detail is collapsed',()=>{
  // The station readout is the dominant type on the panel.
  assert.match(design,/\.instrument-station \.kmvalue\{[\s\S]{0,260}?font-size:clamp\(/);
  // Confidence chip leads; corridor and bound stay visible by default.
  const head = html.slice(html.indexOf('class="instrument-head"'),html.indexOf('instrument-station'));
  assert.ok(head.includes('id="gps-chip"'),'the confidence chip leads the panel');
  const station = html.slice(html.indexOf('instrument-station'),html.indexOf('instrument-details'));
  assert.ok(station.includes('id="segment-tag"'),'corridor shows by default');
  assert.ok(station.includes('id="bound-toggle"'),'manual bound correction stays one tap away');
  assert.ok(station.includes('id="km-value"'),'the station is the dominant readout');
  // Coordinates, accuracy, fix age, interchange and bridge are collapsed by
  // default, but keep their IDs so every existing writer still finds them.
  const details = html.slice(html.indexOf('id="instrument-details"'),html.indexOf('id="defect-section"'));
  for(const id of ['acc','fix-age','lat','lon','ramp-tag','nearby-asset-name','gps-status','bound-auto-status']){
    assert.ok(details.includes(`id="${id}"`),`#${id} must be inside the collapsed detail`);
  }
  assert.match(html,/<details class="instrument-details" id="instrument-details">/);
  assert.match(design,/\.instrument-details > summary\{[\s\S]{0,260}?min-height:var\(--ds-control-min\)/);
  // The interchange row stays full width below the grid.
  assert.match(design,/\.instrument-interchange\{[\s\S]{0,240}?border-top:1px solid var\(--ds-border\)/);
  assert.match(design,/\.instrument-interchange:not\(:has\(\.ramp-tag\.show\)\)\{display:none;\}/);
});

test('#bound-toggle keeps only dynamic content',()=>{
  // renderBoundToggle() overwrites wrap.innerHTML, so the BOUND label must sit
  // outside it or it would be destroyed on the first GPS fix.
  const start = html.indexOf('id="bound-toggle"');
  const inner = html.slice(start,html.indexOf('</div>',start));
  assert.ok(!/kmlabel/.test(inner),'the BOUND label must not be inside #bound-toggle');
  assert.match(html,/id="bound-auto-status"/);
});

test('the bridge filter lives in the bridge row',()=>{
  const row = html.slice(html.indexOf('class="nearby-asset"'),html.indexOf('instrument-foot'));
  assert.ok(row.includes('id="bridge-filter-toggle"'),'filter must sit in the bridge row');
  assert.ok(row.includes('id="bridge-filter-menu"'),'its menu must travel with it');
  const head = html.slice(html.indexOf('class="instrument-head"'),html.indexOf('instrument-metrics'));
  assert.ok(!head.includes('bridge-filter-toggle'),'filter must not remain in the head strip');
  // Redesigned with an inline lucide glyph instead of the old CSS mask.
  assert.match(row,/<button[^>]*id="bridge-filter-toggle"[\s\S]*?<svg/);
  assert.match(design,/\.bridge-filter-toggle::before\{content:none;\}/);
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
