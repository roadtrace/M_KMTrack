# KMTrack engineering notes

**This is not a design spec, and there is no frozen visual baseline.** Redesign
freely — see `AGENTS.md`. What follows is here because it cost real time to
learn, or because breaking it breaks the app.

The previous design-system document (palette, typography, layout, components,
Do's and Don'ts) was removed on 2026-09-18 when the owner retired the design
rules. It is still in git history if it is ever wanted back:

```
git show <commit-before-removal>:DESIGN.md
```

Functional knowledge lives in its own files: `PRODUCT.md`, `SHARING.md`,
`MAP_LANDMARKS.md`.

---

## Architecture invariants

### The register is ONE node in TWO tabs

The inspection log appears in both the Capture and Log tabs because a
mis-logged entry has to be deletable from the capture screen on the spot.

It is **one DOM node** (`#log-register`), re-parented by `mountLogRegister()`
between `#log-host-inspection` and `#log-host-log`. Do **not** render the list
twice: `renderLog()` writes `list.innerHTML`, so a second list would fork the
rows, the selection set, the bulk-delete state, the swipe handlers and the
`MutationObserver` watching `#log-list`.

`log-list-view.test.js` asserts exactly one `#log-list` and one `renderLog()`.

### The Capture tab is capped, the Log tab is not

Capture shows the newest `CAPTURE_RECENT_LIMIT` (10) records plus a
`View all N entries` button; Log shows everything. The cap is applied **per
mount** in `renderLog()` via `logRegisterView` — **not** by a second renderer.
`mountLogRegister()` re-renders on host change so each tab gets the right amount.

Every count still comes from the uncapped `visible` set.

### The Capture tab renders the register as ONE card

The header and the rows form a single card separated by hairlines, rather than
floating blocks. Scoped to `.inspection-view #log-register`, so **the Log tab
keeps its plain list** — the two tabs deliberately present the same records
differently.

- The defect indication is the row's **existing left border**, which already
  carries the app's own colours: `--line-yellow` as the default (Potholes has no
  type class), `--safety-orange`, `#c9c9c9`, `#c1707a`.
- Rows go full-bleed (`gap:0`, `border-radius:0`, no shadow); the card owns the
  radius and the clipping. `View all` is the card's footer.
- **Rows stay per-row `.swipe-row` wrappers.** The card is a visual shell only —
  swipe, selection and the list observer are untouched.

**There is no filter row on this mount.** Filtering belongs to the Log tab's full
register. `visibleEntries()` returns everything when `logRegisterView ===
'inspection'`, so a filter set on the Log tab cannot leave this card showing a
subset the user has no way to clear from here. The Log tab's filter is untouched
and still applied when the user returns to it.

Two specificity traps bite here, both because `sharing.css` and
`radius-system.css` style these with `html:root[data-theme]` chains that outrank
a bare class selector:

1. The overrides must be prefixed `html:root` or the rows keep their 1px border
   and 16px radius and never merge into the card.
2. The row rule resets **only the non-left edges** (`border-top/right/bottom:0`
   plus `border-left-width`). Writing the `border-left` shorthand there would
   repaint every row yellow and wipe out the per-defect colours.

### The instrument metrics mirror the reference

Values are copied from the reference's `Metric` component and its call site in
`GpsCard`: cells are `px-3 py-3 first:pl-4` in a 2-column grid with `divide-x`
only (**no** horizontal rule between the metric rows), labels are
`text-[10px] font-bold uppercase tracking-wider` with a 14px icon and a 6px gap,
and **every** value — accuracy, corridor, stationing, bound — is
`mt-1 truncate font-mono text-[13px] font-medium`.

The interchange is a **separate full-width row below the grid**
(`flex items-center gap-2 border-t px-4 py-3`): a 14px network icon in
`--ds-secondary`, a muted `Interchange identity` label, and the name pushed right
in bold. `#ramp-tag` lives there and keeps its existing writer; the row hides
itself via `:not(:has(.ramp-tag.show))`, so `updateRampReadout()` needed no
structural change.

### The header is global

It sits **before the view containers**, so `showAppView()` toggling `hidden` on a
view cannot hide it. It carries the brand, an `Off network` pill and a refresh
button.

Its values are copied literally from the reference (`artifacts/kmtrack/src/
App.tsx` + `src/index.css`) rather than inferred from a screenshot: header
`bg-[hsl(var(--background)/.93)]` + `border-b border-[hsl(var(--border))]` +
`px-4 py-3 backdrop-blur`, `.status-pill .status-bad` for the pill, and
`.btn .btn-ghost !min-h-9 !px-2` for the refresh. **Our `--ds-*` tokens already
carry the reference's exact hsl values**, so none of it is hard-coded.

The brand is the **mark plus a text wordmark** (`KM` in `--ds-fg`, `TRACK` in
`--ds-primary`), matching the reference's `Brand`. The outlined lockups
(`kmtrack-logo-on-dark.svg`, `-on-light.svg`) are unused by the shell now and
exist only as brand assets.
- **The map swaps the wordmark for its station and status in place.**
  `#map-km-station` and `#map-status` were *moved* into the header rather than
  reimplemented, so `updateOsmLocation()` and the station writers keep working
  untouched. The map's own topbar is gone with it.
- **The map tab no longer has its own dark/light toggle**; it follows the app.
- The refresh button re-checks `navigator.onLine` and drains the sync queue.
  Until a transport is supplied that queue is inert, so today it effectively just
  re-tests the connection.

`--app-header-h` is measured by `syncHeaderHeight()`, not hard-coded: the map
height subtracts the header as well as the tab tray, and the header's height
moves with the safe-area inset and the logo.

### The clock lives in the instrument footer

`#clock` and `#clock-saved` moved out of the header to sit beside the
coordinates. `"· N saved"` is dropped when the row cannot fit it — measured, not
guessed, because the date string moves with the month and the locale. It fits at
320px and drops at 285px.

### Where Select lives

`Select` rides at the **right end of the Export / Import data row**, pushed there
by `margin-left:auto` on `.log-select-actions`. Clicking it does two things: the
button becomes `Cancel` in the same slot, and `.log-bulk-actions` — a separate
mount **below** the data row, `justify-content:flex-end` — is revealed with
`Select all` and `Delete (5)`, flushed to the same right edge.

**It must stay BELOW.** Placed above, the new row shoved the Export/Import row —
and the button you had just tapped — 44px down the instant Select was pressed.
Measured: the data row's `top` and the toggle's right edge are now identical in
both states. (The toggle's *left* edge shifts ~2px, purely because "Cancel" is a
wider word than "Select" in a right-anchored slot.)

This replaced an earlier arrangement where the actions owned a permanent row and
nothing moved at all. The owner preferred Select grouped with the data actions;
the bulk row appearing on click is now intended, not a regression.

**Measured**, so a future button cannot silently break the row: `Export` 100px +
`Import` 99px + `Select` 70px = **285px against 362px available** at 390px
(287px in selection mode with `Cancel` / `Export selected`). At 360px there is
still 47px of slack. Anything added to that row has to fit in what is left.

The chip is the selection readout: `N records` idle, `S of N selected` while
selecting. `#selection-count` was removed so two counters never compete.

**"records" is dropped while selecting on purpose.** Measured at 390px: title
182px + chip 177px = **371px against 358px available**, so the long form wraps
the chip to its own line. The short form is ~323px and fits at 390px and 360px.

Verify with `verify-final-row.cjs` — it asserts the three data-row buttons share
a line, that `Select` and `Cancel` are flush with the row's right edge, and that
the bulk row sits above the data row.

---

## Traps

These all produced bugs that took time to find. They are not style opinions.

### `[hidden]` loses to a class `display`

`.ds-chip` and `.ds-btn` set `display:inline-flex`, which **outranks** the UA
`[hidden]{display:none}`. A hidden chip rendered as a stray empty dot, and the
"Imported files" button showed with no history behind it. Fixed by
`.ds-chip[hidden],.ds-btn[hidden]{display:none}`.

**Any new component with a `display` rule needs the same guard.**

### Never scope a shared control's styling to its mount

This one has caused the same bug **three times**, twice in one session.

`#bulk-select-all-btn` and `#bulk-delete-btn` live in whichever container the
layout currently wants. Each time they move, a rule scoped to the *old* mount
stops matching and they silently fall back to **raw native buttons** — square
corners, `1px 6px` padding, default 13.3px type, and a `2px outset` bevel on
Delete. They never error; they just look wrong.

1. First they were styled inside `.log-action-footer`. That panel was removed.
2. Then they were restyled under `#log-select-actions`. They moved to
   `#log-bulk-actions`.

They are now targeted by **ID only** (`#bulk-select-all-btn,#bulk-delete-btn`),
which cannot be orphaned by re-parenting.

**Rule: if a control can be moved, style it by its own id or class — never
`#someMount .theControl`.** Nothing else in the cascade sizes these; without an
explicit rule they render as browser defaults.

### Legacy chips repurposed as plain values

`.kmpost .ramp-tag` and `.kmpost .segment-tag` are painted as **accent chips** by
the inline sheet (background, border, radius, padding). The metrics panel now
uses both as plain text values, so each rule has to reset **all four** —
resetting only the font leaves a filled pill around the interchange name.

That is also why the metrics have ONE value scale. The reference's `Metric`
component is `mt-1 truncate font-mono text-[13px] font-medium` for every cell,
stationing included; the station used to be deliberately larger.

### A dropdown anchored inside a row must be TOLD where to stop

The bridge classification menu is `position:absolute` inside `.nearby-asset`, so
it escapes the instrument card — that part is fine. Two things were not:

- `sharing.css` sets `html:root .bridge-filter-menu{top:52px}`, which outranks a
  bare `.instrument-panel` selector and made the menu open **52px down — inside
  the row it belongs to**. Fixed with
  `html:root .instrument-panel .bridge-filter-menu{top:calc(100% + 8px)}`.
- `max-height:280px` is a guess that knows nothing about what sits below. It ran
  **8px past the defect buttons**. `fitBridgeFilterMenu()` now measures the space
  from the menu's top to the first `.lane-btn-row` when it opens, subtracts a
  16px gap, and sets `max-height` and `overflow-y` — so the list scrolls instead
  of overlapping.

**Anything absolutely positioned needs its stopping point measured, not guessed**,
because the content beneath it moves.

### Do not mix two centring methods in one control

The selection checkbox centred its **box** with `place-items:center` on a grid
and its **check** with absolute positioning. Those are not independent: the
moment the check appeared, the box jumped **4px up**.

Measured by pixel bounds rather than by eye — the box was 28x28 in *both* states,
but its centre moved from y=22 to y=18. Both pseudo-elements are now absolutely
positioned and centred the same way, so neither can move the other.

**Measure the pixels when a control "looks like" it moved.** Computed styles
reported an identical 28x28 box and a stable `top` throughout; only the rendered
bounds exposed it.

### The header panel is dark in BOTH themes

Superseded — that was the *old* masthead. The header now **follows the theme**,
exactly like the reference (`bg-[hsl(var(--background)/.93)]`), because the brand
is the mark plus themed text rather than a white SVG wordmark.

### Legacy rules outrank a bare class chain

The header is styled once, by `html:root .top-shell header`. The `html:root`
prefix is **required**: two legacy rules outrank a plain `.top-shell header`
because they carry a type plus an attribute/pseudo-class —

- `index.html` — `html[data-theme="light"] header{background: …navy gradient…}`
- `radius-system.css` — `html:root header{border-radius:0 0 24px 24px}`

Both styled the old dark masthead. Without the prefix the light theme silently
keeps its navy gradient and its rounded bottom corners; only the theme you did
not look at appears correct. **When a change "does not apply", check whether an
`html:root` / `html[data-theme]` rule is winning before editing your own.**

### Re-declaring `display` does not reset a flex direction

The inline sheet makes `.header-brand` a centred **column** (logo above the
clock) at every width — those rules are top-level, not inside a media query.
Overriding only `display:flex` left the column direction in place, so the new
one-row header rendered stacked and centred. `flex-direction`, `justify-content`
and `width` had to be reset too.

### A per-second fit check runs while its tab is hidden

`tickClock()` fires every second regardless of which tab is showing. When the
Capture view is hidden its footer has no layout and `clientWidth` is `0`, so
every "does it fit?" comparison fails and the saved count was hidden — then only
restored if a tick happened to land while the tab was visible again.

`fitInstrumentFoot()` bails out when `clientWidth` is 0 and is re-run on
`showAppView()`. **Any measurement driven by a timer needs the same guard.**

### Potholes carries no defect-type class

`typeClass()` returns `''` for Potholes — yellow is the *default*, applied by the
base `.log-entry` rule. A `.log-entry.pothole` selector never matches anything
and silently falls through to the fallback. Set any per-type default on the
**base** rule.

### The count badge lives inside the `<h2>`

`log-controls.js` appends `.log-count-badge` to the heading, so it is not a grid
item of its parent. `grid-row` on it does nothing. `.inspection-view .log-header
h2` is a column flexbox specifically so the eyebrow and the numeral stack.

### The workbook's first 14 columns are frozen

Not a style choice — `inspection-sharing.js` validates those headers on import
and older exports must keep importing. New columns are **appended only**, and
unknown trailing columns are ignored by the importer.

### `typeClass` and the export lane rule

`lane` is kept verbatim for display and for the import fingerprint.
`lane_number` (whole 1–4) and `lane_other` are the structured pair, kept in step
by `setLane()`, which every write site uses. `Number.isInteger` guards the export
so `1.5` is never emitted as a lane.

---

## Data model — sync-ready record

Groundwork for a future Supabase backend. **Nothing talks to a network**: no
client, no auth, no API calls, no cloud photo upload, no Realtime, no RLS.

`entry-model.js` is the single source of truth for the record shape and loads
before the app script and before `inspection-sharing.js`, which reuses it
(`require()` under Node, the browser global at runtime) so the lane rule exists
once.

| Field | Meaning |
| --- | --- |
| `id` | Permanent UUID v4, assigned at creation, offline |
| `created_at` / `updated_at` | ISO instants; `touch()` bumps the latter on edit |
| `sync_status` | `pending` \| `synced` \| `failed` |
| `user_id` / `team` | Empty, reserved for auth and team scoping |
| `photo_path` | Empty; future private-bucket object path |
| `lane_number` / `lane_other` | Whole 1–4, else `null`; free text, else `''` |
| `sync_attempts` / `sync_error` / `remote_id` / `synced_at` | Sync bookkeeping |

`uuid()` prefers `crypto.randomUUID()` and falls back to a hand-built RFC 4122
v4 — it never emits a non-UUID identifier.

`normalizeEntry()` **backfills only**. It **preserves unknown fields**, which
matters: import attaches a transient `photoFile` Blob that must survive until it
reaches IndexedDB. `loadFromStorage()` rewrites localStorage only when the
migration actually changed something.

`sync-queue.js` decides what *would* upload and records the outcome. It is inert
by construction: `createQueue({})` has no transport, so `ready()` is `false` and
`drain()` returns `{ok:false, reason:'no-transport'}` **without marking
anything**. A Supabase client plugs in as `{transport}`.

**Duplicate safety:** uploads are addressed by the permanent UUID and applied as
an upsert, so retrying can never create a second cloud row.
`sync-queue.test.js` asserts a failure and its retry send the *identical* UUID.

The sync indicator is a small `.ds-chip` in the Log head, **hidden unless
something is actionable** — a failure, or pending work with a live transport.

---

## Brand: the road mark

The logo is an amber tile, navy field, and a road mark. **The mark reads as the
letter "A"** — this is not fixable by refinement, it is how the shape parses.

The exploration is settled and should not be repeated unprompted: symmetric
narrow-top/wide-bottom shapes read as "A"; parallel edges read as a ladder;
a filled band reads as a stripe; a curve reads as a squiggle. A lane arrow, a
reticle and a "K" monogram were also built, and the owner chose the road.

---

## Rejected — do not rebuild

Built and then rejected by the owner. `log-list-view.test.js` asserts these stay
gone.

- **Log tab search field**, with an `entryHaystack` and a `query` parameter
  through `filterEntries()`.
- **`All / Mine / Imported` segments** promoting the source filter.
- **Record-card rows** — a type-coloured glyph tile in a leading column.
- The **`All / Mine / Imported`** and row-tile work are gone from
  `entry-filters.js` and `design-system.css` entirely; do not resurrect them.

The Capture tab keeps the one piece that survived: the record-card **header**
(`Today's record`, the count as a 30px numeral, a glyph tile).
