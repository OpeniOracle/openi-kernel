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
}

export interface DocModel {
  title: string
  subtitle?: string
  sensitivity?: string
  has_ai_content?: boolean
  meta?: DocMeta[]
  sections?: DocSection[]
  footer?: string
}

export function docToMarkdown(doc: DocModel): string
export function docToHtml(doc: DocModel): string
