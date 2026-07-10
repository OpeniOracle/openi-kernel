// Tailwind v3 preset exposing the Openi design tokens. Apps consume it via
//   import openi from '@openi/kernel/tailwind-preset'
//   export default { presets: [openi], content: [...] }
//
// Color roles (ADR-004):
//   - `action` / `accent` — the interactive blue: buttons, links, focus
//     rings, selected states. (`accent` aliases `action` so the existing
//     `*-accent` control styling flips to the action color suite-wide.)
//   - `signal` — the amber attention accent: escalations, pending review,
//     anomalous cohorts. Never a default button color.
//   - `ai` — amber family for AI-provenance surfaces (always paired with the
//     ✦ glyph / an explicit badge; color alone never carries the meaning).
//   - `info` retains the soft blue used for informational chrome.

import { palette, fontFamilies } from './tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        navy: palette.navy,
        bone: palette.bone,
        action: palette.action,
        signal: palette.signal,
        accent: {
          DEFAULT: palette.action.DEFAULT,
          soft: palette.action.soft,
          muted: palette.action.muted,
        },
        ai: {
          DEFAULT: palette.signal.DEFAULT,
          soft: palette.signal.soft,
          muted: palette.signal.muted,
        },
        ok: palette.status.ok,
        warn: palette.status.warn,
        danger: palette.status.danger,
        info: palette.status.info,
      },
      fontFamily: {
        sans: fontFamilies.sans.split(',').map((f) => f.trim().replace(/^'|'$/g, '')),
        mono: fontFamilies.mono.split(',').map((f) => f.trim().replace(/^'|'$/g, '')),
      },
    },
  },
}
