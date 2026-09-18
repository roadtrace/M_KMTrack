// Guards the Log tab's list behaviour: the capped Capture copy, and the owner's
// rejection of the search/segments/record-card experiments.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('./index.html'), 'utf8');
const design = fs.readFileSync(require.resolve('./design-system.css'), 'utf8');
const controls = fs.readFileSync(require.resolve('./log-controls.js'), 'utf8');
const filterSrc = fs.readFileSync(require.resolve('./entry-filters.js'), 'utf8');

test('the Capture tab is capped; the Log tab owns the full list', () => {
  assert.match(html, /const CAPTURE_RECENT_LIMIT = 10;/);
  assert.match(html, /const capped = logRegisterView === 'inspection';/);
  assert.match(html, /visible\.slice\(-CAPTURE_RECENT_LIMIT\)/);
  // The cap must not be a second renderer.
  assert.equal((html.match(/id="log-list"/g) || []).length, 1, 'exactly one list');
  assert.equal((html.match(/function renderLog\(/g) || []).length, 1, 'exactly one renderer');
  // Every count still comes from the uncapped set.
  assert.match(html, /if\(capped && visible\.length > shown\.length\)/);
  assert.match(html, /View all \$\{visible\.length\} entries/);
  assert.match(html, /showAppView\('log'\)/);
});

test('switching tabs re-renders so each mount gets the right amount of list', () => {
  assert.match(html, /if\(moved \|\| logRegisterView !== viewName\)\{/);
  assert.match(html, /logRegisterView = viewName;/);
  assert.match(html, /logRegisterView = viewName;[\s\S]{0,160}?renderLog\(\);/);
});

test('the Log tab has no search field and no source segments', () => {
  // Tried and rejected by the owner — do not reinstate.
  assert.doesNotMatch(html, /id="log-search"/);
  assert.doesNotMatch(html, /log-segments/);
  assert.doesNotMatch(html, /wireLogSearchAndSegments/);
  assert.doesNotMatch(design, /\.log-search\{/);
  assert.doesNotMatch(design, /\.log-segment\{/);
  // No dead search plumbing is left behind in the filter module.
  assert.doesNotMatch(filterSrc, /entryHaystack|formatStationShort|query/);
  assert.doesNotMatch(html, /query:search/);
});

test('inspection rows carry no warning tile', () => {
  assert.doesNotMatch(design, /\.log-entry::before/);
  assert.doesNotMatch(design, /--row-tile/);
  assert.doesNotMatch(design, /2\.4 20\.4h19\.2z/);
  // The rows are back to the app's own three-column grid (sharing.css owns it).
  assert.doesNotMatch(design, /\.inspection-record-list \.record-type\{grid-column:2/);
});

test('the records chip doubles as the selection readout', () => {
  // "5 of 12 selected" — the word "records" is dropped while selecting so the
  // chip still fits beside the 30px title without wrapping (371px needed vs
  // 358px available when the word is kept).
  assert.match(controls, /`\$\{n\} of \$\{visible\.length\} selected`/);
  assert.doesNotMatch(controls, /records'\} selected/);
  assert.doesNotMatch(controls, /selection-count/);
  assert.doesNotMatch(controls, /`\$\{n\} selected`/);
});

test('Select rides at the right of the Export/Import data row', () => {
  // Row one: title + chip, chip flushed right.
  assert.match(html, /<div class="log-head-row">\s*<h2>Inspection log<\/h2>[\s\S]{0,400}?id="log-records-chip"/);
  assert.match(design, /\.log-head-row\{[\s\S]{0,220}?justify-content:space-between/);
  // Select is the LAST child of the data row, pushed to its right edge.
  const row = html.slice(html.indexOf('class="log-data-row"'), html.indexOf('log-data-hint'));
  assert.ok(row.indexOf('id="log-export-actions"') < row.indexOf('id="log-import-actions"'), 'Export before Import');
  assert.ok(row.indexOf('id="log-import-actions"') < row.indexOf('id="log-select-actions"'), 'Select after Import');
  assert.match(design, /\.log-select-actions\{[\s\S]{0,220}?margin-left:auto/);
});

test('the bulk actions get a row below the data row, flushed right', () => {
  const view = html.slice(html.indexOf('id="log-view"'), html.indexOf('log-data-hint'));
  // BELOW, not above: above, the new row would shove the Export/Import row and
  // the Cancel button 44px down the instant Select is pressed.
  assert.ok(view.indexOf('id="log-bulk-actions"') > view.indexOf('class="log-data-row"'), 'bulk row is below');
  assert.match(design, /\.log-bulk-actions\{[\s\S]{0,240}?justify-content:flex-end/);
  assert.match(design, /\.log-bulk-actions\{[\s\S]{0,240}?margin:8px 0 0;/);
  // The `[hidden]` guard is required: display:flex outranks it otherwise.
  assert.match(design, /\.log-bulk-actions\[hidden\]\{display:none;\}/);
  // Mounted separately from the toggle.
  assert.match(controls, /\(bulkMount \|\| actions\)\.append\(selectAll,deleteSelected\)/);
  assert.match(controls, /bulkMount\.hidden=!selectMode/);
  // The toggle itself stays in the data row.
  assert.match(controls, /actions\.append\(toggle\)/);
});

test('the bulk controls share the Select button geometry', () => {
  // These have been re-parented twice and each time silently lost their
  // geometry when the old mount's scoped rule stopped matching. Target by ID
  // only, so a future move cannot orphan the styling.
  assert.match(design, /#bulk-select-all-btn,#bulk-delete-btn\{/);
  assert.doesNotMatch(design, /#log-select-actions :is\(#bulk-select-all-btn/);
  assert.doesNotMatch(design, /#log-select-actions #bulk-delete-btn/);
  const block = design.slice(design.indexOf('#bulk-select-all-btn,#bulk-delete-btn{'));
  assert.match(block.slice(0, 420), /min-height:44px/);
  assert.match(block.slice(0, 420), /border-radius:var\(--radius-md\)/);
  assert.match(block.slice(0, 420), /font-size:12px/);
  assert.doesNotMatch(design, /selection-count/);
});

test('the Capture tab keeps the record-card header', () => {
  assert.match(html, /<h2>Today's record<\/h2>/);
  assert.match(design, /\.inspection-view \.log-header\{/);
  assert.match(design, /\.inspection-view \.log-count-badge\{/);
  assert.match(design, /\.inspection-view \.log-header h2\{[\s\S]{0,200}?flex-direction:column/);
  assert.match(design, /\.inspection-view \.log-header #select-toggle-btn\{display:none;\}/);
});

test('the Capture tab renders the register as ONE card with hairline dividers', () => {
  // Header and rows share one shell instead of floating blocks.
  assert.match(design, /\.inspection-view #log-register\{/);
  assert.match(design, /\.inspection-view \.log-header\{[\s\S]{0,300}?border-bottom:1px solid var\(--ds-border\)/);
  assert.match(design, /html:root \.inspection-view \.inspection-record-list \.swipe-row\{/);
  assert.match(design, /html:root \.inspection-view \.inspection-record-list \.log-entry\{/);
  assert.match(design, /\.swipe-row \+ \.swipe-row \.log-entry\{[\s\S]{0,80}?border-top:1px solid var\(--ds-border\)/);
  // "View all" is the card's footer.
  assert.match(design, /\.inspection-view \.inspection-record-list \.log-view-all\{/);
  // Carded ONLY on Capture — the Log tab keeps its plain list.
  assert.doesNotMatch(design, /^\.log-view #log-register\{/m);
});

test('the Capture card has no filter row, and ignores the Log tab filters', () => {
  // The row is hidden on this mount...
  assert.match(design, /\.inspection-view \.log-date-filters\{display:none;\}/);
  // ...and the data follows suit, so a filter set on the Log tab cannot leave
  // this card showing a subset the user has no way to clear from here.
  assert.match(html, /function visibleEntries\(\)\{[\s\S]{0,320}?if\(logRegisterView === 'inspection'\) return entries;/);
  assert.match(html, /if\(logRegisterView === 'inspection'\) return entries;[\s\S]{0,160}?KMTrackEntryFilters\.filterEntries\(entries,getLogFilters\(\)\)/);
});

test('the card resets only the non-left edges, preserving per-defect colours', () => {
  // sharing.css owns the left border AND the per-type overrides. Resetting the
  // `border-left` shorthand here would repaint every row yellow.
  const i = design.indexOf('html:root .inspection-view .inspection-record-list .log-entry{');
  assert.ok(i > -1, 'card row rule exists');
  const block = design.slice(i, i + 320);
  assert.match(block, /border-left-width:4px/);
  assert.doesNotMatch(block, /border-left:4px solid var\(--line-yellow\)/);
  // No stray `border:0` that would drop the left strip entirely.
  assert.doesNotMatch(block, /border:0;/);
});
