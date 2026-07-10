import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createLocalRepository, createMemoryStorage } from '../repository.js'

function makeRepo(storage = createMemoryStorage()) {
  return {
    storage,
    repo: createLocalRepository({
      rootKey: 'testapp.v1',
      entities: ['briefs', 'evidence'],
      cascades: { briefs: [{ entity: 'evidence', foreignKey: 'brief_id' }] },
      storage,
    }),
  }
}

test('create stamps id and timestamps; get and list round-trip', async () => {
  const { repo } = makeRepo()
  const a = await repo.create('briefs', { title: 'A', created_at: '2026-01-01T00:00:00Z' })
  const b = await repo.create('briefs', { title: 'B' })
  assert.ok(a.id && b.id && a.id !== b.id)
  assert.ok(b.created_at && b.updated_at)

  assert.equal((await repo.get('briefs', a.id)).title, 'A')
  const rows = await repo.list('briefs')
  assert.deepEqual(rows.map((r) => r.title), ['B', 'A'], 'newest first')
})

test('list filters by field equality (where)', async () => {
  const { repo } = makeRepo()
  const brief = await repo.create('briefs', { title: 'A' })
  await repo.create('evidence', { brief_id: brief.id, title: 'ev1' })
  await repo.create('evidence', { brief_id: 'other', title: 'ev2' })
  const rows = await repo.list('evidence', { brief_id: brief.id })
  assert.deepEqual(rows.map((r) => r.title), ['ev1'])
  assert.equal((await repo.list('evidence', { brief_id: undefined })).length, 2, 'undefined ignored')
})

test('update bumps updated_at, preserves id, throws on missing', async () => {
  const { repo } = makeRepo()
  const row = await repo.create('briefs', { title: 'A' })
  const updated = await repo.update('briefs', row.id, { title: 'A2', id: 'hijack' })
  assert.equal(updated.id, row.id, 'id cannot be patched away')
  assert.equal(updated.title, 'A2')
  await assert.rejects(() => repo.update('briefs', 'nope', {}), /not found/)
})

test('remove cascades to declared children only', async () => {
  const { repo } = makeRepo()
  const brief = await repo.create('briefs', { title: 'A' })
  const keep = await repo.create('briefs', { title: 'B' })
  await repo.create('evidence', { brief_id: brief.id })
  await repo.create('evidence', { brief_id: keep.id })
  await repo.remove('briefs', brief.id)
  assert.equal((await repo.list('briefs')).length, 1)
  const evidence = await repo.list('evidence')
  assert.equal(evidence.length, 1)
  assert.equal(evidence[0].brief_id, keep.id)
})

test('corrupt or legacy blobs never throw; unknown entities do', async () => {
  const storage = createMemoryStorage({ 'testapp.v1': '{not json' })
  const { repo } = makeRepo(storage)
  assert.deepEqual(await repo.list('briefs'), [], 'corruption resets in-memory copy')

  // Legacy blob missing a newer collection still reads (defensive merge).
  storage.setItem('testapp.v1', JSON.stringify({ briefs: [{ id: 'x', created_at: '2026-01-01' }] }))
  assert.equal((await repo.list('briefs')).length, 1)
  assert.deepEqual(await repo.list('evidence'), [])

  await assert.rejects(() => repo.get('nope', 'x'), /unknown entity/)
})

test('existing app blob shape is read unchanged (adoption safety)', async () => {
  // Simulates a real briefbuilder.v1 blob written by the pre-kernel code.
  const legacy = {
    briefs: [{ id: 'b1', title: 'Old brief', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' }],
    evidence: [{ id: 'e1', brief_id: 'b1', created_at: '2026-06-02T00:00:00Z' }],
    findings: [],
    sections: [],
  }
  const storage = createMemoryStorage({ 'briefbuilder.v1': JSON.stringify(legacy) })
  const repo = createLocalRepository({
    rootKey: 'briefbuilder.v1',
    entities: ['briefs', 'evidence', 'findings', 'sections'],
    cascades: {
      briefs: [
        { entity: 'evidence', foreignKey: 'brief_id' },
        { entity: 'findings', foreignKey: 'brief_id' },
        { entity: 'sections', foreignKey: 'brief_id' },
      ],
    },
    storage,
  })
  assert.equal((await repo.get('briefs', 'b1')).title, 'Old brief')
  assert.equal((await repo.list('evidence', { brief_id: 'b1' })).length, 1)
})
