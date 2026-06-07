// Stable ID + timestamp helpers. Uses crypto.randomUUID where available
// (all modern browsers) with a small fallback for older runtimes.
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function nowIso() {
  return new Date().toISOString()
}
