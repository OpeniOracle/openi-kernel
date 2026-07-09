// Shared branded export layer (ADR-002). One document model, rendered to
// Markdown or self-contained print-ready HTML (print → PDF), replacing
// per-app export drift (BriefBuilder's Markdown serializer, HashLens's
// hand-rolled HTML summary).
//
// Apps build a neutral document model:
//   {
//     title, subtitle?, sensitivity?, has_ai_content?,
//     meta:     [{ label, value }],
//     sections: [{ heading?, paragraphs?: string[], list?: string[],
//                  table?: { headers: string[], rows: string[][] },
//                  note?: string }],
//     footer?
//   }
// and hand it to docToMarkdown / docToHtml. All values are treated as plain
// text and escaped for HTML — builders must not pre-escape.

import { escapeHtml } from './format.js'
import { palette, fontFamilies } from './tokens.js'

// Standard disclaimer whenever a document contains AI-generated content that
// has not been individually attributed. Same contract as BriefBuilder's
// export: the analyst is author of record.
export const AI_CONTENT_DISCLAIMER =
  'Portions of this document were AI-assisted. All content has been reviewed and is issued under analyst authority; AI-generated passages that remain pending review are explicitly marked.'

export const EXPORT_BRAND = 'Openi Analytics'

export function docToMarkdown(doc) {
  const lines = []
  lines.push(`# ${doc.title || 'Untitled'}`)
  if (doc.subtitle) lines.push('', `_${doc.subtitle}_`)
  const meta = [...(doc.meta || [])]
  if (doc.sensitivity) meta.unshift({ label: 'Sensitivity', value: doc.sensitivity })
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
  return `<section>${parts.join('\n')}</section>`
}

// Self-contained branded HTML: no external assets, prints cleanly to PDF.
// Screen shows the dark instrument theme; print flips to a light, ink-saving
// document theme.
export function docToHtml(doc) {
  const meta = [...(doc.meta || [])]
  if (doc.sensitivity) meta.unshift({ label: 'Sensitivity', value: doc.sensitivity })
  const metaHtml = meta.length
    ? '<dl class="meta">' +
      meta.map((m) => `<div><dt>${escapeHtml(m.label)}</dt><dd>${escapeHtml(m.value)}</dd></div>`).join('') +
      '</dl>'
    : ''
  const disclaimer = doc.has_ai_content
    ? `<p class="disclaimer">${escapeHtml(AI_CONTENT_DISCLAIMER)}</p>`
    : ''
  const sections = (doc.sections || []).map(htmlSection).join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title || 'Untitled')}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.5rem;
    background: ${palette.navy[950]}; color: ${palette.bone[200]};
    font-family: ${fontFamilies.sans};
    line-height: 1.55; font-size: 15px;
  }
  main { max-width: 46rem; margin: 0 auto; }
  header.brand { display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid ${palette.signal.DEFAULT}; padding-bottom: .75rem; margin-bottom: 1.5rem; }
  header.brand .org { font-size: .8rem; letter-spacing: .12em; text-transform: uppercase;
    color: ${palette.signal.DEFAULT}; font-weight: 600; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; color: ${palette.bone[100]}; }
  .subtitle { color: ${palette.bone[400]}; margin: 0 0 1rem; }
  h2 { font-size: 1.05rem; margin: 1.75rem 0 .5rem; color: ${palette.bone[100]};
    letter-spacing: .02em; border-left: 3px solid ${palette.signal.DEFAULT}; padding-left: .6rem; }
  dl.meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: .35rem 1.25rem; margin: 0 0 1.25rem; padding: .9rem 1rem;
    background: ${palette.navy[900]}; border: 1px solid ${palette.navy[700]}; border-radius: 8px; }
  dl.meta div { display: flex; gap: .5rem; }
  dl.meta dt { color: ${palette.bone[500]}; font-size: .75rem; text-transform: uppercase;
    letter-spacing: .08em; margin: 0; align-self: center; }
  dl.meta dd { margin: 0; font-family: ${fontFamilies.mono}; font-size: .85rem; }
  .disclaimer, .note { border: 1px solid ${palette.signal.muted}; background: ${palette.signal.faint};
    color: ${palette.signal.soft}; padding: .6rem .8rem; border-radius: 6px; font-size: .85rem; }
  table { border-collapse: collapse; width: 100%; margin: .5rem 0 1rem; font-size: .85rem; }
  th { text-align: left; color: ${palette.bone[500]}; font-size: .72rem; text-transform: uppercase;
    letter-spacing: .08em; border-bottom: 1px solid ${palette.navy[500]}; padding: .4rem .5rem; }
  td { border-bottom: 1px solid ${palette.navy[800]}; padding: .45rem .5rem;
    font-family: ${fontFamilies.mono}; font-size: .82rem; }
  ul { padding-left: 1.2rem; }
  footer { margin-top: 2.5rem; padding-top: .75rem; border-top: 1px solid ${palette.navy[700]};
    color: ${palette.bone[500]}; font-size: .78rem; }
  @media print {
    :root { color-scheme: light; }
    body { background: #ffffff; color: #1a1a14; padding: 0; font-size: 11pt; }
    h1, h2 { color: #11100c; }
    .subtitle { color: #555043; }
    dl.meta { background: #f6f4ee; border-color: #ddd8ca; }
    dl.meta dt { color: #7a745f; }
    th { color: #7a745f; border-bottom-color: #b9b29c; }
    td { border-bottom-color: #e6e2d4; }
    .disclaimer, .note { background: #faf6ea; border-color: #d8a657; color: #6b5426; }
    footer { color: #7a745f; border-top-color: #ddd8ca; }
    header.brand { break-inside: avoid; }
    section { break-inside: avoid-page; }
  }
</style>
</head>
<body>
<main>
  <header class="brand">
    <span class="org">${escapeHtml(EXPORT_BRAND)}</span>
    ${doc.sensitivity ? `<span class="org">${escapeHtml(doc.sensitivity)}</span>` : ''}
  </header>
  <h1>${escapeHtml(doc.title || 'Untitled')}</h1>
  ${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ''}
  ${metaHtml}
  ${disclaimer}
  ${sections}
  <footer>${escapeHtml(doc.footer || EXPORT_BRAND)} · Generated ${escapeHtml(new Date().toISOString().slice(0, 10))}</footer>
</main>
</body>
</html>
`
}
