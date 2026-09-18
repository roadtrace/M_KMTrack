// Guards the global header: shown on every tab, wordmark swapped for the map's
// live station/coords, and the clock moved into the instrument footer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('./index.html'), 'utf8');
const design = fs.readFileSync(require.resolve('./design-system.css'), 'utf8');

test('the header is global, not inside the Capture view', () => {
  const headerAt = html.indexOf('<div class="top-shell">');
  const viewAt = html.indexOf('id="inspection-view"');
  assert.ok(headerAt > -1 && viewAt > -1);
  assert.ok(headerAt < viewAt, 'the header must sit before the views so it shows on every tab');
  // Exactly one header.
  assert.equal((html.match(/<header>/g) || []).length, 1);
});

test('the header carries the mark, a two-tone wordmark, the net pill and refresh', () => {
  assert.match(html, /class="header-logo" src="kmtrack-mark\.svg"/);
  // Reference Brand: "KM" in the foreground, "TRACK" in --primary.
  assert.match(html, /id="header-wordmark">KM<span class="header-track">TRACK<\/span></);
  assert.match(html, /id="net-status"[\s\S]{0,140}?Off network/);
  assert.match(html, /id="net-refresh"/);
  assert.match(design, /\.header-net\[hidden\]\{display:none;\}/);
  assert.match(design, /\.header-wordmark\[hidden\]\{display:none;\}/);
});

test('the header copies the reference literal values', () => {
  // No speculation: these are read straight from the reference's App.tsx +
  // index.css. The header FOLLOWS the theme (bg is --background at 93%).
  const bar = design.slice(design.indexOf('html:root .top-shell header{'), design.indexOf('html:root .top-shell header{') + 700);
  assert.match(bar, /justify-content:space-between/);
  assert.match(bar, /background:color-mix\(in srgb, var\(--ds-bg\) 93%, transparent\)/);
  assert.match(bar, /border-bottom:1px solid var\(--ds-border\)/);
  assert.match(bar, /padding:12px 16px/);
  assert.match(bar, /padding-top:max\(12px, env\(safe-area-inset-top\)\)/);
  // The inline navy gradient, rounded corners and shadow must all be reset.
  assert.match(bar, /border-radius:0/);
  assert.match(bar, /box-shadow:none/);
  // Brand: 40px tile, 12px gap, 17px wordmark at -.05em with --primary on "TRACK".
  assert.match(design, /\.header-logo\{[\s\S]{0,120}?width:40px/);
  assert.match(design, /\.header-brand\{[\s\S]{0,420}?gap:12px/);
  const word = design.slice(design.indexOf('.header-wordmark{'), design.indexOf('.header-wordmark{') + 300);
  assert.match(word, /font-size:17px/);
  assert.match(word, /font-weight:700/);
  assert.match(word, /letter-spacing:-\.05em/);
  assert.match(word, /color:var\(--ds-fg\)/);
  assert.match(design, /\.header-track\{color:var\(--ds-primary\);\}/);
  // .status-pill .status-bad, and .btn .btn-ghost !min-h-9 !px-2.
  assert.match(design, /\.header-net\{[\s\S]{0,400}?padding:5px 9px/);
  assert.match(design, /\.header-net\{[\s\S]{0,400}?border-radius:999px/);
  assert.match(design, /html\[data-theme="dark"\] \.header-net\{/);
  assert.match(design, /\.header-refresh\{[\s\S]{0,400}?min-height:36px/);
  assert.match(design, /\.header-actions\{[\s\S]{0,120}?gap:8px/);
});

test('the map swaps the wordmark for its station and status, in place', () => {
  // The elements never move, so their existing writers keep working.
  assert.match(html, /id="header-map-context"[\s\S]{0,220}?id="map-km-station"[\s\S]{0,220}?id="map-status"/);
  assert.match(html, /function syncHeaderContext\(viewName\)/);
  assert.match(html, /wordmark\.hidden = isMap;/);
  assert.match(html, /context\.hidden = !isMap;/);
  // The map's own topbar and theme control are gone.
  assert.doesNotMatch(html, /class="map-topbar"/);
  assert.doesNotMatch(html, /id="map-theme-toggle"/);
  assert.match(html, /const toggles = \[document\.getElementById\('theme-toggle'\)\];/);
});

test('the map fills the viewport minus the tab tray AND the global header', () => {
  assert.match(design, /\.map-view\{\s*height:calc\(100dvh - var\(--app-header-h,0px\) - 56px - env\(safe-area-inset-bottom\)\)/);
  // The header height moves with the safe-area inset and the logo, so it is measured.
  assert.match(html, /function syncHeaderHeight\(\)/);
  assert.match(html, /setProperty\('--app-header-h'/);
});

test('the clock moved out of the header into the instrument footer', () => {
  const header = html.slice(html.indexOf('<div class="top-shell">'), html.indexOf('id="inspection-view"'));
  assert.doesNotMatch(header, /id="clock"/);
  const foot = html.slice(html.indexOf('class="instrument-foot"'), html.indexOf('class="instrument-foot"') + 400);
  assert.match(foot, /id="lat"/);
  assert.match(foot, /id="clock"/);
  assert.match(foot, /id="clock-saved"/);
});

test('the saved count is dropped when the footer cannot fit it', () => {
  assert.match(html, /function fitInstrumentFoot\(\)/);
  assert.match(html, /if\(needed > foot\.clientWidth\) saved\.hidden = true;/);
  // tickClock fires every second whatever tab is showing. While Capture is hidden
  // this element has no layout, clientWidth is 0, and every comparison "fails" —
  // which would hide the count and strand it hidden.
  assert.match(html, /function fitInstrumentFoot\(\)\{[\s\S]{0,900}?if\(!foot\.clientWidth\) return;/);
  // Re-checked when the view is shown again.
  assert.match(html, /syncHeaderContext\(viewName\);[\s\S]{0,120}?fitInstrumentFoot\(\);/);
});

test('the refresh button re-checks the connection and drains the queue', () => {
  assert.match(html, /function updateNetStatus\(\)/);
  assert.match(html, /navigator\.onLine !== false/);
  assert.match(html, /window\.addEventListener\('online', updateNetStatus\)/);
  assert.match(html, /window\.addEventListener\('offline', updateNetStatus\)/);
  assert.match(html, /document\.getElementById\('net-refresh'\)\.addEventListener\('click', refreshConnection\)/);
  // Inert until a transport exists, so it just re-tests the connection.
  assert.match(html, /await syncQueue\.drain\(entries\)/);
});
