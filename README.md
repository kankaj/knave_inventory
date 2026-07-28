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

Deploy `dist/` to any static host, then install the extension from
`https://<your-host>/manifest.json`.

## References

- [Owlbear Rodeo extension docs](https://docs.owlbear.rodeo/extensions/getting-started)
- [Manifest reference](https://docs.owlbear.rodeo/extensions/reference/manifest)
- [SDK](https://www.npmjs.com/package/@owlbear-rodeo/sdk)
