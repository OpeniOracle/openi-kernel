// Shared branded export layer (ADR-002; document grade per session-3 C).
// One document model, rendered to Markdown or client-ready, print-perfect
// HTML — replacing per-app export drift.
//
// Document model (all fields additive since v0.2.0):
//   {
//     title, subtitle?, sensitivity?, has_ai_content?,
//     document_id?,          // stamped in the letterhead + footer
//     prepared_for?,         // client line on the letterhead
//     prepared_by?,          // issuing analyst/org line
//     date?,                 // ISO date; defaults to today
//     meta:     [{ label, value }],
//     sections: [{ heading?, paragraphs?: string[], list?: string[],
//                  table?: { headers: string[], rows: string[][] },
//                  note?: string, annex?: boolean }],
//     footer?
//   }
// All values are treated as plain text and escaped for HTML — builders must
// not pre-escape.
//
// docToHtml(doc, { theme }) —
//   theme: 'instrument' (default) renders the dark in-app look on screen;
//   theme: 'paper' renders the light client-document look on screen too, so
//   an export preview shows exactly what the client receives. Both themes
//   print identically: light, ink-saving, controlled page breaks.

import { escapeHtml } from './format.js'
import { palette, fontFamilies } from './tokens.js'
import {
  CONFIDENCE_LEVELS,
  SEVERITY_LEVELS,
  RELIABILITY_LEVELS,
  CREDIBILITY_LEVELS,
} from './grading.js'

// Standard disclaimer whenever a document contains AI-generated content that
// has not been individually attributed. Same contract as BriefBuilder's
// export: the analyst is author of record.
export const AI_CONTENT_DISCLAIMER =
  'Portions of this document were AI-assisted. All content has been reviewed and is issued under analyst authority; AI-generated passages that remain pending review are explicitly marked.'

export const EXPORT_BRAND = 'Openi Analytics'

// Ready-made "How to read the gradings" section — the legend every client
// deliverable should carry so graded statements are defensible without a
// phone call. Compose it into doc.sections (typically as an annex).
export function gradingLegendSection() {
  return {
    heading: 'How to read the gradings',
    annex: true,
    paragraphs: [
      'Statements in this document may carry up to three independent gradings. They are deliberately separate: how sure we are, how much it matters, and how the underlying source is rated are different questions.',
    ],
    table: {
      headers: ['Axis', 'Scale', 'Meaning'],
      rows: [
        ['Confidence', CONFIDENCE_LEVELS.map((o) => o.label).join(' · '), 'How sure the analyst is, given the evidence.'],
        ['Severity / risk', SEVERITY_LEVELS.map((o) => o.label).join(' · '), 'How much it matters if true.'],
        ['Source reliability', RELIABILITY_LEVELS.map((o) => o.value).join(' '), 'NATO Admiralty: A (completely reliable) → F (cannot be judged).'],
        ['Information credibility', CREDIBILITY_LEVELS.map((o) => String(o.value)).join(' '), 'NATO Admiralty: 1 (confirmed by other sources) → 6 (cannot be judged).'],
      ],
    },
  }
}

export function docToMarkdown(doc) {
  const lines = []
  lines.push(`# ${doc.title || 'Untitled'}`)
  if (doc.subtitle) lines.push('', `_${doc.subtitle}_`)
  const meta = [...(doc.meta || [])]
  if (doc.prepared_for) meta.unshift({ label: 'Prepared for', value: doc.prepared_for })
  if (doc.sensitivity) meta.unshift({ label: 'Sensitivity', value: doc.sensitivity })
  if (doc.document_id) meta.push({ label: 'Document', value: doc.document_id })
  if (meta.length) {
    lines.push('')
    for (const m of meta) lines.push(`- **${m.label}:** ${m.value}`)
  }
  if (doc.has_ai_content) lines.push('', `> ${AI_CONTENT_DISCLAIMER}`)
  for (const section of doc.sections || []) {
    lines.push('')
    if (section.heading) lines.push(`## ${section.heading}`, '')
    for (const p of section.paragraphs || []) lines.push(p, '')
    if (section.list?.length) {
      for (const item of section.list) lines.push(`- ${item}`)
      lines.push('')
    }
    if (section.table) {
      const { headers, rows } = section.table
      lines.push(`| ${headers.join(' | ')} |`)
      lines.push(`| ${headers.map(() => '---').join(' | ')} |`)
      for (const row of rows) lines.push(`| ${row.join(' | ')} |`)
      lines.push('')
    }
    if (section.note) lines.push(`> ${section.note}`, '')
  }
  lines.push('', '---', '', `_${doc.footer || EXPORT_BRAND}_`)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

function htmlSection(section) {
  const parts = []
  if (section.heading) parts.push(`<h2>${escapeHtml(section.heading)}</h2>`)
  for (const p of section.paragraphs || []) parts.push(`<p>${escapeHtml(p)}</p>`)
  if (section.list?.length) {
    parts.push('<ul>' + section.list.map((i) => `<li>${escapeHtml(i)}</li>`).join('') + '</ul>')
  }
  if (section.table) {
    const head = section.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
    const body = section.table.rows
      .map((r) => '<tr>' + r.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>')
      .join('')
    parts.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`)
  }
  if (section.note) parts.push(`<p class="note">${escapeHtml(section.note)}</p>`)
  const cls = section.annex ? ' class="annex"' : ''
  return `<section${cls}>${parts.join('\n')}</section>`
}

// Self-contained branded HTML: no external assets; prints to a clean,
// deliberate client document (A4, controlled breaks, letterhead, footer).
export function docToHtml(doc, { theme = 'instrument' } = {}) {
  const meta = [...(doc.meta || [])]
  if (doc.sensitivity) meta.unshift({ label: 'Sensitivity', value: doc.sensitivity })
  const date = (doc.date || new Date().toISOString()).slice(0, 10)
  const metaHtml = meta.length
    ? '<dl class="meta">' +
      meta.map((m) => `<div><dt>${escapeHtml(m.label)}</dt><dd>${escapeHtml(m.value)}</dd></div>`).join('') +
      '</dl>'
    : ''
  const disclaimer = doc.has_ai_content
    ? `<p class="disclaimer">${escapeHtml(AI_CONTENT_DISCLAIMER)}</p>`
    : ''
  const sections = (doc.sections || []).map(htmlSection).join('\n')
  const paper = theme === 'paper'
  const footerLine = [doc.footer || EXPORT_BRAND, doc.document_id, `Generated ${date}`]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' · ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title || 'Untitled')}</title>
<style>
  :root { color-scheme: ${paper ? 'light' : 'dark'}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: ${fontFamilies.sans};
    line-height: 1.55; font-size: ${paper ? '11.5pt' : '15px'};
    ${paper
      ? 'background: #e9e6dd; color: #1c1a14;'
      : `background: ${palette.navy[950]}; color: ${palette.bone[200]};`}
  }
  main {
    max-width: 47rem; margin: 0 auto; padding: 2.5rem 2.2rem 4rem;
    ${paper ? 'background: #ffffff; min-height: 100vh; box-shadow: 0 0 24px rgba(0,0,0,.18);' : ''}
  }
  header.brand {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid ${palette.signal.DEFAULT};
    padding-bottom: .75rem; margin-bottom: 1.6rem;
  }
  header.brand .org {
    font-size: .78rem; letter-spacing: .14em; text-transform: uppercase;
    color: ${paper ? '#8a6d2f' : palette.signal.DEFAULT}; font-weight: 600;
  }
  .titleblock { margin: 0 0 1.4rem; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 .3rem; ${paper ? 'color:#11100c;' : `color: ${palette.bone[100]};`} }
  .subtitle { margin: 0; font-size: .95rem; ${paper ? 'color:#555043;' : `color: ${palette.bone[400]};`} }
  .prepared { margin: .35rem 0 0; font-size: .85rem; ${paper ? 'color:#555043;' : `color: ${palette.bone[400]};`} }
  h2 {
    font-size: 1.02rem; margin: 1.9rem 0 .55rem; letter-spacing: .02em;
    border-left: 3px solid ${palette.signal.DEFAULT}; padding-left: .6rem;
    ${paper ? 'color:#11100c;' : `color: ${palette.bone[100]};`}
    break-after: avoid;
  }
  p { margin: .45rem 0; }
  dl.meta {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: .4rem 1.4rem; margin: 0 0 1.3rem; padding: .9rem 1rem;
    border-radius: 8px;
    ${paper
      ? 'background:#f6f4ee; border:1px solid #ddd8ca;'
      : `background: ${palette.navy[900]}; border: 1px solid ${palette.navy[700]};`}
    break-inside: avoid;
  }
  dl.meta div { display: flex; gap: .55rem; align-items: baseline; }
  dl.meta dt {
    margin: 0; font-size: .72rem; text-transform: uppercase; letter-spacing: .09em;
    ${paper ? 'color:#7a745f;' : `color: ${palette.bone[500]};`}
  }
  dl.meta dd { margin: 0; font-family: ${fontFamilies.mono}; font-size: .84rem; }
  .disclaimer, .note {
    border-radius: 6px; padding: .6rem .85rem; font-size: .85rem;
    ${paper
      ? 'background:#faf6ea; border:1px solid #d8a657; color:#6b5426;'
      : `border: 1px solid ${palette.signal.muted}; background: ${palette.signal.faint}; color: ${palette.signal.soft};`}
    break-inside: avoid;
  }
  table { border-collapse: collapse; width: 100%; margin: .6rem 0 1rem; font-size: .84rem; }
  thead { break-inside: avoid; }
  tr { break-inside: avoid; }
  th {
    text-align: left; font-size: .7rem; text-transform: uppercase; letter-spacing: .09em;
    padding: .4rem .5rem;
    ${paper ? 'color:#7a745f; border-bottom:1px solid #b9b29c;' : `color: ${palette.bone[500]}; border-bottom: 1px solid ${palette.navy[500]};`}
  }
  td {
    padding: .45rem .5rem; font-family: ${fontFamilies.mono}; font-size: .8rem;
    vertical-align: top;
    ${paper ? 'border-bottom:1px solid #e6e2d4;' : `border-bottom: 1px solid ${palette.navy[800]};`}
  }
  td:first-child { ${paper ? 'color:#11100c;' : ''} }
  ul { padding-left: 1.2rem; margin: .45rem 0; }
  li { margin: .2rem 0; }
  section.annex { margin-top: 2.4rem; padding-top: 1rem; border-top: 1px dashed ${paper ? '#c9c3b0' : palette.navy[600]}; }
  footer.doc {
    margin-top: 3rem; padding-top: .8rem; font-size: .74rem;
    ${paper ? 'color:#7a745f; border-top:1px solid #ddd8ca;' : `color: ${palette.bone[500]}; border-top: 1px solid ${palette.navy[700]};`}
  }
  @media print {
    :root { color-scheme: light; }
    @page { size: A4; margin: 18mm 16mm 20mm; }
    body { background: #ffffff !important; color: #1c1a14 !important; font-size: 10.5pt; }
    main { max-width: none; margin: 0; padding: 0; box-shadow: none !important; background: #ffffff !important; }
    h1, h2 { color: #11100c !important; }
    .subtitle, .prepared { color: #555043 !important; }
    header.brand .org { color: #8a6d2f !important; }
    dl.meta { background: #f6f4ee !important; border-color: #ddd8ca !important; }
    dl.meta dt { color: #7a745f !important; }
    th { color: #7a745f !important; border-bottom-color: #b9b29c !important; }
    td { border-bottom-color: #e6e2d4 !important; }
    .disclaimer, .note { background: #faf6ea !important; border-color: #d8a657 !important; color: #6b5426 !important; }
    footer.doc { position: fixed; bottom: 0; left: 0; right: 0; margin: 0; padding: 2mm 0 0;
      border-top: 1px solid #ddd8ca !important; color: #7a745f !important;
      font-size: 7.5pt; text-align: center; }
    section { orphans: 3; widows: 3; }
    section.annex { break-before: page; border-top: 0; padding-top: 0; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
<main>
  <header class="brand">
    <span class="org">${escapeHtml(EXPORT_BRAND)}</span>
    <span class="org">${escapeHtml([doc.sensitivity, doc.document_id].filter(Boolean).join(' · ') || date)}</span>
  </header>
  <div class="titleblock">
    <h1>${escapeHtml(doc.title || 'Untitled')}</h1>
    ${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ''}
    ${doc.prepared_for ? `<p class="prepared">Prepared for ${escapeHtml(doc.prepared_for)}${doc.prepared_by ? ` by ${escapeHtml(doc.prepared_by)}` : ''} · ${escapeHtml(date)}</p>` : ''}
  </div>
  ${metaHtml}
  ${disclaimer}
  ${sections}
  <footer class="doc">${footerLine}</footer>
</main>
</body>
</html>
`
}
