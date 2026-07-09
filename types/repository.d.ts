export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export interface CascadeRule {
  entity: string
  foreignKey: string
}

export interface RepositoryRecord {
  id: string
  created_at: string
  updated_at: string
  [field: string]: unknown
}

export interface LocalRepository {
  list(entity: string, where?: Record<string, unknown>): Promise<RepositoryRecord[]>
  get(entity: string, id: string): Promise<RepositoryRecord | null>
  create(entity: string, data: Record<string, unknown>): Promise<RepositoryRecord>
  update(entity: string, id: string, patch: Record<string, unknown>): Promise<RepositoryRecord>
  remove(entity: string, id: string): Promise<void>
}

export function createLocalRepository(options: {
  rootKey: string
  entities: string[]
  cascades?: Record<string, CascadeRule[]>
  storage?: StorageLike
}): LocalRepository

export function createMemoryStorage(initial?: Record<string, string>): StorageLike
