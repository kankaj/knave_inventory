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
   the popover (`public/manifest.json` sets it to 400×600).

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

Sheets whose owner has left stay in the tab strip marked *pryč*, and **+ list**
creates an extra sheet (a familiar, an NPC, a second character).

Keystrokes are batched for 350 ms before writing, and pending local edits win
over incoming room updates until the room echoes them back. Profiles are read
through `normalizeProfile`, so a stale or hand-edited metadata entry cannot
break rendering.

Portraits are stored as an image address, not an upload: an encoded image would
not fit in shared room metadata.

## Sheet components

`src/knave/` is a small component set drawn from the Knave 2e sheet. Every
component is controlled — it takes a value and an `onChange`, holds no state of
its own, and knows nothing about Owlbear Rodeo, so persistence can be wired in
later without touching them.

| Component        | Sheet element                                          |
| ---------------- | ------------------------------------------------------ |
| `Wordmark`       | The blackletter *Knave* title                          |
| `InkField`       | A label over a dotted writing line (JMÉNO, POVOLÁNÍ)   |
| `HexField`       | Hexagon stat (TZ, BZ)                                  |
| `RibbonField`    | ÚROVEŇ / ZK banner with the notched edge               |
| `NumberInput`    | Numeric field that can be emptied while typing         |
| `AbilityDial`    | Circled bonus plus ability name and its uses           |
| `HealthPennant`  | Vertical ŽIV track; click a pip to set current health  |
| `SlotList`       | The 20 numbered item rows, 1–10 left and 11–20 right   |
| `CharacterSheet` | Everything composed at popover width                   |

Styling lives in `src/knave/sheet.css`: ink on parchment, heavy rules, and
`clip-path` shapes for the hexagons and pennants. Fonts (EB Garamond,
UnifrakturMaguntia) are bundled through `@fontsource`, since the extension
iframe cannot reach a CDN. The sheet folds to a single column below 420px via
container queries.

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
