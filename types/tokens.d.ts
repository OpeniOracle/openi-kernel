export interface NavyScale {
  950: string; 900: string; 800: string; 700: string; 600: string; 500: string
}
export interface BoneScale {
  100: string; 200: string; 300: string; 400: string; 500: string; 600: string
}
export interface SignalScale {
  DEFAULT: string; soft: string; strong: string; muted: string; faint: string
}
export interface StatusColors {
  ok: string; warn: string; danger: string; info: string
}
export interface ActionScale {
  DEFAULT: string; soft: string; muted: string
}
export const palette: {
  navy: NavyScale
  bone: BoneScale
  action: ActionScale
  signal: SignalScale
  status: StatusColors
}
export const fontFamilies: { sans: string; mono: string }
export const semantic: Record<string, string>
export const AI_GLYPH: string
