# Knave Inventory

An [Owlbear Rodeo](https://www.owlbear.rodeo/) extension built with React, TypeScript and Vite.

## Development

```sh
npm install
npm run dev
```

The dev server runs on <http://localhost:5173/>. `vite.config.ts` sets
`server.cors.origin` to `https://www.owlbear.rodeo`, which Owlbear Rodeo needs
in order to load the extension from the dev server (Vite disables CORS by
default since v6.0.9).

### Installing into Owlbear Rodeo

1. Open your [Owlbear Rodeo profile](https://www.owlbear.rodeo/profile) and
   click **Add Extension**.
2. Use the manifest URL: `http://localhost:5173/manifest.json`
3. Create a room and enable the extension in the Create Room dialog.
4. The extension action appears in the top left of the room; clicking it opens
   the popover (`public/manifest.json` sets it to 820×620, wide enough for the
   landscape sheet).

SDK calls only work inside that iframe — opening `localhost:5173` directly in a
browser tab shows the "waiting for Owlbear Rodeo" state, because `OBR.onReady`
never fires without a parent Owlbear window.

## Layout

| Path                   | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `public/manifest.json` | Extension manifest — name, version, action, icon        |
| `public/icon.svg`      | Icon for the extension action                           |
| `src/App.tsx`          | Popover UI; waits on `OBR.onReady` before using the SDK |
| `src/knave/`           | Character sheet components, modelled on the printed sheet |

## How profiles are shared

Each sheet lives in Owlbear **room metadata** under its own key,
`cz.bigroot.knave-inventory/profile/<profileId>`, where `profileId` is a UUID
generated once for that sheet. One key per sheet matters: Owlbear merges
metadata by top-level key, so two people editing two different sheets never
overwrite each other. A single key holding all profiles would make the last
writer win.

Room metadata is shared and writable by everyone connected, so every player —
GM or not — can open and edit every sheet. There is no per-player permission to
enforce.

### Why profiles are not keyed by player id

Owlbear player ids are per-connection: they change when a player rejoins, so a
sheet keyed by player id would be orphaned by the next session. Instead a
profile carries its own id plus `ownerId` (the current player id) and
`ownerName`. On open, the extension re-attaches you to your sheet in three
steps:

1. A `localStorage` note (`knave-inventory/room/<roomId>/profile`) remembers
   which sheet is yours in this room, and reclaims it silently.
2. Failing that — a new browser or device, or blocked storage — a sheet whose
   `ownerName` matches your Owlbear name and whose owner is not in the room is
   claimed automatically.
3. Failing both, press **Převzít** on any sheet to take it over.

Sheets whose owner has left stay in the column marked *pryč*, and **+ nový
deník** creates an extra sheet (a familiar, an NPC, a second character). The
column is grouped by owner and, within one owner, ordered oldest sheet first, so
nothing moves around as sheets are edited or renamed. The button in the top
right corner collapses it.

Keystrokes are batched for 350 ms before writing, and pending local edits win
over incoming room updates until the room echoes them back. Profiles are read
through `unpackProfile`, which falls back to `normalizeProfile` for anything
written by an older version, so a stale or hand-edited metadata entry cannot
break rendering.

## Keeping the sheets between sessions

Room metadata is capped at **16 kB for the whole room**, shared with every other
extension the table runs. Sheets are therefore written packed
(`src/knave/codec.ts`): single-letter keys, no value that equals the default, and
only the item rows actually in use — roughly a tenth of the plain size. Every
write is measured against `ROOM_BUDGET_BYTES` first, and a write that would not
fit is refused with a notice on screen instead of being rejected silently by
Owlbear, which is how sheets used to lose their contents.

Metadata still lives and dies with the room, so each browser also keeps its own
snapshot in `localStorage` under `knave-inventory/backup/<roomId>`, refreshed on
every room update (`src/knave/backup.ts`). If the table comes back to a room that
has lost **every** sheet, the first browser to open the extension pushes its
snapshot back and says so. A room that still holds sheets is left alone — it is
the newer truth, and restoring into it would resurrect sheets that were deleted
on purpose.

For a copy that outlives the browser as well, **Stáhnout zálohu** writes the
whole room to a JSON file and **Načíst zálohu** merges one back in, overwriting
sheets that carry the same id.

## Sheet components

`src/knave/` is a small component set drawn from the Knave 2e sheet. Every
component is controlled — it takes a value and an `onChange`, holds no state of
its own, and knows nothing about Owlbear Rodeo, so persistence can be wired in
later without touching them.

| Component        | Sheet element                                           |
| ---------------- | ------------------------------------------------------- |
| `NameMark`       | The name, written in the blackletter face of the logo   |
| `HexField`       | Hexagon stat (ŠTÍT), numbers only                       |
| `RibbonField`    | ÚROVEŇ / ZK banner with the notched edge                |
| `NotesField`     | Free-form scratch space beside the vitals               |
| `NumberInput`    | Numeric field that can be emptied while typing          |
| `AbilityDial`    | Named ring holding the bonus, with obrana set into it    |
| `HealthPennant`  | Vertical ŽIV track; click a pip to set current health   |
| `SlotList`       | The 20 numbered rows, each with a note beside it        |
| `SendPanel`      | Pick a recipient for the ticked items                   |
| `CharacterSheet` | Everything composed across a landscape popover          |

The sheet reads across, not down: name, abilities and vitals on the left, the
item column and its notes on the right, with ÚROVEŇ / ZK at the top right.

### Rules baked into the sheet

- **Bonuses only.** Ability rings take +1 to +10 and nothing else; a bigger
  number is rewritten to 10 as it is typed. The bonus is always shown with its
  sign, because it is added to a roll. Obrana is never written down: it is
  `10 + bonus`, set into the top of the ring in place of that stretch of the
  circle. What an ability is rolled for appears only on hover or focus, in a
  tooltip that takes no pointer events so it cannot block the field.
- **Wounds cost carrying capacity.** Any row can be toggled into a wound with
  the cross at its right edge. A wound row is struck through, holds its own
  text, and counts against capacity exactly like carried gear, so a hurt
  character carries less.
- **Death is a manual switch.** The *Mrtvý* toggle, at the bottom beside
  *Vymazat*, strikes the name through on the sheet and in the column. Nothing
  flips it automatically — wounds filling every row do not kill anyone by
  themselves.
- **The dead only give.** A dead character can still hand things over, but is
  never offered as a recipient, and `sendItems` refuses a dead recipient even if
  one is passed in anyway.
- **Items change hands whole.** Tick rows, pick a recipient, press *Poslat*.
  Several items move at once in a single metadata write, so they are never
  duplicated or briefly missing. The note written beside a row travels with its
  item. Wounds are not sendable. If the recipient has fewer free rows than the
  shipment needs, the send is refused and says how many rows they had — nothing
  is silently dropped or pushed over capacity.

Styling lives in `src/knave/sheet.css`: ink on parchment, heavy rules, and
`clip-path` shapes for the hexagons and pennants. Fonts (EB Garamond,
UnifrakturMaguntia) are bundled through `@fontsource`, since the extension
iframe cannot reach a CDN. Container queries fold the two halves into one column
below 640px, and below 430px the dials go three across, the health track lies on
its side, and each item note drops under its row.

Item capacity follows Odolnost (`10 + odolnost`, capped at the 20 printed
rows), because Odolnost is the ability the sheet lists "řádky předmětů" under.
Rows past capacity stay visible but struck through. Adjust `slotCapacity` in
`src/knave/types.ts` if your table rules it differently.

## Build

```sh
npm run build    # tsc -b && vite build -> dist/
npm run preview  # serve dist/ locally
npm run lint     # oxlint
```

## Tests

Two Vitest projects run from one command:

```sh
npm run test          # watch both projects
npm run test-run      # single pass, both projects
npm run test-stories   # Storybook stories in real Chromium
npm run test-unit      # plain unit tests, no DOM
```

`storybook` runs every story's `play` function in Chromium through
`@storybook/addon-vitest`. `unit` covers `src/**/*.test.ts` — the profile
re-attachment tiers in `src/knave/identity.ts` and the metadata normalizers in
`src/knave/types.ts`, neither of which needs a browser or a live room.

Deploy `dist/` to any static host, then install the extension from
`https://<your-host>/manifest.json`.

## References

- [Owlbear Rodeo extension docs](https://docs.owlbear.rodeo/extensions/getting-started)
- [Manifest reference](https://docs.owlbear.rodeo/extensions/reference/manifest)
- [SDK](https://www.npmjs.com/package/@owlbear-rodeo/sdk)
