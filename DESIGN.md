# Design

Visual world: **station departures board**. Requests are read like departures: by due time. The board lends type, palette, density and one signature move; layout, navigation and controls stay standard web components.

## Tokens (`src/app/globals.css`, Tailwind `@theme`)

| Token | Value | Use |
|---|---|---|
| `noche` | `#0f1b2d` | Shell header, board cells (due time), computed-readout panel, primary button |
| `noche-2` | `#1b2b44` | Primary button hover |
| `noche-regla` | `#2c3e5a` | Rules inside navy surfaces |
| `placa` | `#f6f2e7` | Text on navy, secondary header button |
| `placa-tenue` | `#b9c2d0` | Secondary text on navy |
| `ambar-placa` | `#f6b73c` | Computed values on the readout panel only |
| `suelo` | `#f2f3ef` | Page ground (daylight office) |
| `papel` | `#fbfbf8` | Inputs, table, option tiles |
| `tinta` / `tinta-2` | `#141a22` / `#4b5563` | Primary / secondary text |
| `regla` | `#d8dbd3` | 1px borders and row rules |
| `resaltado` | `#e4eaf3` | Selected option tile, newly created row |
| `termino`, `riesgo`, `vencida` (+ `-fondo`) | green / amber / red | SLA traffic light only (RN-05) and errors (`vencida`) |

State colours appear only where they carry SLA meaning. Amber on light ground is reserved for "En riesgo".

## Type

Overpass (Google Fonts, via `next/font`), a signage-derived sans. Tabular numerals are on globally (`font-feature-settings: "tnum"`). Scale: 2xl page titles, xl/2xl board numerals, base fields, sm body, xs labels. Uppercase with 0.06–0.08em tracking only for table headers and the readout heading.

## Components

- **Board cell:** navy block, large bold time and a small relative day ("hoy", "mañana", "sáb 28-11"); `--:--` when SLA is not running.
- **Readout panel:** navy `<aside>` with `dl` rows (label, rule ID, amber value) and one plain-language consequence line. Sticky on desktop.
- **SLA chip:** tinted background, drawn dot (SVG), bold label, no wrapping.
- **Option tiles:** radio inside a bordered label with a help line; checked state is `resaltado` plus a navy border.
- Radii are 4px (`rounded`); no shadows, no cards.

## Signature move

`<Paletas>` (`src/components/paletas.tsx`): every character of a board readout flips in like a split-flap paddle when its value changes (320ms, ease-out, 28ms stagger). It runs on the readout panel and on the newly created row's due time. Disabled under `prefers-reduced-motion`.

## Responsive

Below `md`, the board hides the Solicitante, Prioridad and Estado columns and folds them into a line under the title. The form switches from two columns to one at `lg`.
