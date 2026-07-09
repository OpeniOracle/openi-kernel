export interface VocabOption<V = string> {
  value: V
  label: string
}
export type ConfidenceLevel = 'low' | 'moderate' | 'high'
export const CONFIDENCE_LEVELS: VocabOption<ConfidenceLevel>[]
export function labelFor<V>(vocab: VocabOption<V>[], value: V): string
