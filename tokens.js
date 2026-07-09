// Openi design tokens — the single source of truth for the suite's visual
// language: dark instrument-grade navy surfaces, warm bone text, one amber
// signal accent, Geist for UI and Geist Mono for data.
//
// Consumed as:
//   - `@openi/kernel/tailwind-preset` (Tailwind v3 apps: BriefBuilder,
//     Waypoint, HashLens)
//   - `@openi/kernel/tokens.css` (CSS custom properties, for Tailwind v4 /
//     non-Tailwind consumers such as LinkView)
//   - directly, for exports and canvas/SVG rendering.
//
// Amber convention (ADR-002 decision 2): `signal` amber is the suite-wide
// accent for primary actions and emphasis. AI-provenance marking keeps a
// distinct treatment — the ✦ glyph plus an explicit "AI" badge/border — so
// provenance never relies on color alone.

export const palette = {
  // Surfaces — deep navy, darkest first. Harvested from BriefBuilder/Waypoint
  // (the closest existing implementation of the target language).
  navy: {
    950: '#0a0f1c',
    900: '#0e1525',
    800: '#141d31',
    700: '#1d293f',
    600: '#27364f',
    500: '#33455f',
  },
  // Text — warm bone. Replaces cool slate text across the suite.
  bone: {
    100: '#f7f4ec',
    200: '#eae5d8',
    300: '#d6d0bf',
    400: '#b3ac99',
    500: '#918a77',
    600: '#6f695a',
  },
  // The one signal accent. Continuous with the amber BriefBuilder/Waypoint
  // already ship (#d8a657), so existing amber surfaces stay on-brand.
  signal: {
    DEFAULT: '#d8a657',
    soft: '#e3b877',
    strong: '#f0c987',
    muted: '#3a2f1a',
    faint: '#241d10',
  },
  // Status colors — kept desaturated so amber remains the only "brand" voice.
  status: {
    ok: '#34d399',
    warn: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
  },
}

export const fontFamilies = {
  sans: "'Geist', 'Inter', system-ui, -apple-system, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', 'Menlo', monospace",
}

// Semantic roles — use these, not raw palette entries, in new UI code.
export const semantic = {
  surface: palette.navy[950],
  surfaceRaised: palette.navy[900],
  surfaceInset: palette.navy[800],
  border: palette.navy[700],
  borderSubtle: palette.navy[800],
  text: palette.bone[200],
  textBright: palette.bone[100],
  textMuted: palette.bone[400],
  textFaint: palette.bone[500],
  accent: palette.signal.DEFAULT,
  accentSoft: palette.signal.soft,
  accentMuted: palette.signal.muted,
  ok: palette.status.ok,
  warn: palette.status.warn,
  danger: palette.status.danger,
  info: palette.status.info,
}

// Glyph reserved for AI-generated content markers across the suite.
export const AI_GLYPH = '✦'
