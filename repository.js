// Repository contract + localStorage storage seam (ADR-001 Phase B, ADR-003).
//
// The async CRUD store that BriefBuilder, Waypoint, and HashLens each
// re-implemented: one JSON blob under a namespaced root key, corruption-safe
// reads, id/timestamp stamping, newest-first listing, and declarative delete
// cascades. Methods return Promises so a server-backed implementation of the
// same contract (Supabase, REST) drops in without touching callers.
//
// Apps keep their existing root keys and blob shapes — adopting this module
// must never invalidate stored analyst data.

import { newId, nowIso } from './ids.js'

// createLocalRepository({
//   rootKey:  storage key, e.g. 'briefbuilder.v1' (also the log label)
//   entities: array of collection names stored in the blob
//   cascades: { parentEntity: [{ entity, foreignKey }] } — children removed
//             when a parent row is removed
//   storage:  Storage-like (getItem/setItem); defaults to localStorage.
//             Injectable for tests and non-browser runtimes.
// })
export function createLocalRepository({ rootKey, entities, cascades = {}, storage } = {}) {
  if (!rootKey) throw new Error('[kernel/repository] rootKey is required')
  if (!entities?.length) throw new Error('[kernel/repository] entities are required')
  const store = storage || globalThis.localStorage
  const emptyDb = () => Object.fromEntries(entities.map((e) => [e, []]))

  function readDb() {
    try {
      const raw = store.getItem(rootKey)
      if (!raw) return emptyDb()
      // Defensive merge: every collection exists even if the schema grew.
      return { ...emptyDb(), ...JSON.parse(raw) }
    } catch (err) {
      console.error(`[${rootKey}] failed to read DB, resetting in-memory copy`, err)
      return emptyDb()
    }
  }

  function writeDb(db) {
    store.setItem(rootKey, JSON.stringify(db))
  }

  function assertEntity(entity) {
    if (!entities.includes(entity)) {
      throw new Error(`[${rootKey}] unknown entity: ${entity}`)
    }
  }

  return {
    // `where` is field-equality filtering, e.g. { brief_id: id }.
    async list(entity, where = {}) {
      assertEntity(entity)
      const db = readDb()
      let rows = db[entity] || []
      for (const [field, value] of Object.entries(where)) {
        if (value !== undefined) rows = rows.filter((r) => r[field] === value)
      }
      // Newest first by created_at for stable, predictable ordering.
      return rows.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    },

    async get(entity, id) {
      assertEntity(entity)
      const db = readDb()
      return (db[entity] || []).find((r) => r.id === id) || null
    },

    async create(entity, data) {
      assertEntity(entity)
      const db = readDb()
      const ts = nowIso()
      const record = {
        ...data,
        id: data.id || newId(),
        created_at: data.created_at || ts,
        updated_at: ts,
      }
      db[entity] = [...(db[entity] || []), record]
      writeDb(db)
      return record
    },

    async update(entity, id, patch) {
      assertEntity(entity)
      const db = readDb()
      const rows = db[entity] || []
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) throw new Error(`[${rootKey}] ${entity} not found: ${id}`)
      const updated = { ...rows[idx], ...patch, id, updated_at: nowIso() }
      rows[idx] = updated
      db[entity] = rows
      writeDb(db)
      return updated
    },

    async remove(entity, id) {
      assertEntity(entity)
      const db = readDb()
      db[entity] = (db[entity] || []).filter((r) => r.id !== id)
      for (const rule of cascades[entity] || []) {
        db[rule.entity] = (db[rule.entity] || []).filter((r) => r[rule.foreignKey] !== id)
      }
      writeDb(db)
    },
  }
}

// In-memory Storage shim — for tests and non-browser runtimes.
export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  }
}
