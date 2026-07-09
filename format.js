// Shared text-formatting helpers. Every app previously re-implemented some or
// all of these (BriefBuilder: slugify; HashLens: csvEscape/escapeHtml). They
// are security-relevant (escaping) so they live in exactly one place.

// Escape a value for interpolation into HTML text or attribute context.
// Escapes single quotes too (HashLens's local version did not).
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Quote a CSV cell when it contains a delimiter, quote, or newline. Prefixes
// formula-triggering characters with a single quote to blunt spreadsheet
// formula injection on untrusted analyst data.
export function csvEscape(value) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  if (/[",\n\r]/.test(s)) s = '"' + s.replaceAll('"', '""') + '"'
  return s
}

export function csvRow(cells) {
  return cells.map(csvEscape).join(',')
}

// Rows → CSV document. `headers` is optional; rows are arrays of cells.
export function toCsv(rows, headers) {
  const lines = []
  if (headers) lines.push(csvRow(headers))
  for (const row of rows) lines.push(csvRow(row))
  return lines.join('\n') + '\n'
}

// Filesystem/URL-safe slug for export filenames.
export function slugify(value, fallback = 'untitled') {
  const slug = String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || fallback
}
