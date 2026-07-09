import type { VocabOption, ConfidenceLevel } from './ontology.js'

export { CONFIDENCE_LEVELS } from './ontology.js'
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ReliabilityLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type CredibilityLevel = 1 | 2 | 3 | 4 | 5 | 6

export const SEVERITY_LEVELS: VocabOption<SeverityLevel>[]
export const RELIABILITY_LEVELS: VocabOption<ReliabilityLevel>[]
export const CREDIBILITY_LEVELS: VocabOption<CredibilityLevel>[]
export const GRADING_AXES: string[]

export interface AppRanking {
  /** App-namespaced axis name, e.g. "waypoint.priority". Must not shadow kernel axes. */
  axis: string
  value: unknown
  label?: string
}

export interface Grading {
  confidence?: ConfidenceLevel
  severity?: SeverityLevel
  reliability?: ReliabilityLevel
  credibility?: CredibilityLevel
  ranking?: AppRanking
}

export function newGrading(init?: Grading): Grading
export function validateGrading(grading: unknown): string[]
export function gradingCode(grading?: Grading | null): string
