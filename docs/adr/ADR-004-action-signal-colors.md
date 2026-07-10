# ADR-004: Action vs. Signal — the suite's two accent roles

- **Status:** Accepted (implemented in kernel v0.4.0)
- **Date:** 2026-07-10
- **Extends:** ADR-002 (tokens); revises its decision 2.

## Problem

ADR-002 made amber "the one signal accent" and mapped the Tailwind `accent`
key to it. In practice that made amber the *default button color* in
BriefBuilder, Waypoint, and HashLens — so the color that is supposed to mean
"this demands analyst attention" was also the color of every primary control.
LinkView kept a blue `--primary` for controls, which was flagged as a
deviation but was actually the better instinct.

## Decision

Two named roles, both kernel tokens:

| Role | Color | Use | Never |
|---|---|---|---|
| `action` | blue `#3b82f6` (soft `#60a5fa`, muted `#1e3a5f`) | interactive elements: buttons, links, focus rings, selected states, form controls | encoding analytical state |
| `signal` | amber `#d8a657` family | state demanding analyst attention: escalations, pending review, anomalous cohorts, AI-content marking (always with the ✦ glyph/badge) | default button color |

Preset mapping: `accent` now aliases **action** (so `*-accent` control
styling flips suite-wide); `signal` and `ai` remain amber. `semantic.accent`
keeps its legacy amber value for data consumers (exports) — renderers should
migrate to `semantic.action` / `semantic.signal`.

## Application notes / deviations

- BriefBuilder, Waypoint, HashLens: controls flip to action blue; every
  amber usage was reclassified (state → `signal-*`, controls stay `accent`).
- LinkView `--primary` aligns to action blue. Its entity palette keeps its
  own electric blue for `organization` **as a data color** — deliberate
  deviation: graph/chart category colors are neither actions nor signals.
- Status colors (ok/warn/danger/info) are unchanged; `warn` amber remains a
  status tone (e.g. HashLens weak-match flags) and is visually close to
  signal by design — both mean "look here".
