export const AI_CONTENT_DISCLAIMER: string
export const EXPORT_BRAND: string

export interface DocMeta {
  label: string
  value: string
}

export interface DocTable {
  headers: string[]
  rows: string[][]
}

export interface DocSection {
  heading?: string
  paragraphs?: string[]
  list?: string[]
  table?: DocTable
  note?: string
  /** Annex sections get separated styling and start on a new printed page. */
  annex?: boolean
}

export interface DocModel {
  title: string
  subtitle?: string
  sensitivity?: string
  has_ai_content?: boolean
  document_id?: string
  prepared_for?: string
  prepared_by?: string
  /** ISO date; defaults to today. */
  date?: string
  meta?: DocMeta[]
  sections?: DocSection[]
  footer?: string
}

export interface DocToHtmlOptions {
  /**
   * 'instrument' (default): dark in-app look on screen.
   * 'paper': light client-document look on screen — previews match print.
   * Print output is identical for both.
   */
  theme?: 'instrument' | 'paper'
}

export function docToMarkdown(doc: DocModel): string
export function docToHtml(doc: DocModel, options?: DocToHtmlOptions): string
export function gradingLegendSection(): DocSection
