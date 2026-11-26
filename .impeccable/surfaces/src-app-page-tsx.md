---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/solicitudes/nueva/page.tsx"]
---

# Surface brief: solicitudes-it app (listado + alta)

Scope: `/` (listado de solicitudes) and `/solicitudes/nueva` (alta). Mode: Operate.
Audience: non-technical employees filing and following IT requests; reviewers of the repo evaluating requirements-to-code rigor.
Task: file a complete request in under a minute; see at a glance what is due when and its SLA state.
Constraints: Spanish (AR); fictitious seed data; pending features shown as pending, never faked.

## Direction contract

THESIS: Requests are departures: everything is ordered and read by its due time, and the computed rule (priority, deadline) is shown as a board readout, not hidden. Refuses the category default of a white SaaS table with a blue primary button and colored pills.

OWN-WORLD: Station departures board. Night-navy shell header and board cells (#0f1b2d family), cool off-white daylight ground, ink near-black. Times and codes in Overpass with tabular numerals; amber = en riesgo (demorada), red = vencida, muted green = en término; amber/red/green only where they carry SLA meaning. Square-ish 4px radii, 1px rules between rows, no cards.

STORY: The visitor sees the board of open requests by due time, filters by state, files a new request, watches priority and deadline compute live from impact × urgency, submits, and lands back on the board with their request in its slot.

FIRST VIEWPORT: Navy top bar: product name left, "Nueva solicitud" primary action right. Below, a state filter row, then the full-width table: Vence (navy board cell, large tabular time) · Solicitud (code + title + category) · Solicitante · Prioridad · SLA state. Form page: fields left, a sticky board readout right (PRIORIDAD / VENCE EN / ESTADO INICIAL) with the rule IDs that produced each value.

FORM: Departures board, position 6 of 7 on the grounded list. seed:c3759f784b43d821. Signature move: board readouts flip character by character (split-flap) when a computed value changes; instant under prefers-reduced-motion. Raise (split-flap concourse): rows restyle by state without breaking the grid. Raise (terminal yellow wayfinding): one message per readout line, the next consequence stated plainly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
