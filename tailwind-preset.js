// Tailwind v3 preset exposing the Openi design tokens. Apps consume it via
//   import openi from '@openi/kernel/tailwind-preset'
//   export default { presets: [openi], content: [...] }
//
// Key mappings chosen for low-risk adoption by the existing apps:
//   - `accent` is now the amber signal (was blue in BriefBuilder/Waypoint) —
//     existing `*-accent` utilities flip to the brand accent automatically.
//   - `ai` keeps its amber family so existing AI-provenance styling stays
//     valid; the ✦ glyph + badge carries the semantic distinction.
//   - `info` provides the demoted blue for links/informational chrome.

import { palette, fontFamilies } from './tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        navy: palette.navy,
        bone: palette.bone,
        signal: palette.signal,
        accent: {
          DEFAULT: palette.signal.DEFAULT,
          soft: palette.signal.soft,
          strong: palette.signal.strong,
          muted: palette.signal.muted,
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
