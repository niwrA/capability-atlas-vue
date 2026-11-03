import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compileDataset } from '../scripts/atlas-data.mjs'
import { loadAtlasData } from '../src/atlas-loader.js'

const record = { id: 'unit:one', label: 'One activity', kind: 'learning_unit' }
const { index, files } = compileDataset({ roles: [], capabilities: [], learning_units: [record], role_capability_assertions: [], decompositions: [] })
const good = url => ({ ok: true, json: async () => structuredClone(url.endsWith('index.json') ? index : JSON.parse([...files.values()][0])) })

test('missing versioned details offer reload rather than an endless retry against the same filename', async () => {
  for (const status of [404, 410]) {
    const { loadDetail } = await loadAtlasData({ fetcher: async url => url.endsWith('index.json') ? good(url) : { ok: false, status } })
    await assert.rejects(loadDetail(record.id), error => error.code === 'catalogue_changed' && error.action === 'reload')
  }
})

test('a static host HTML fallback for a missing versioned asset also offers reload', async () => {
  const { loadDetail } = await loadAtlasData({ fetcher: async url => url.endsWith('index.json') ? good(url) : {
    ok: true, headers: { get: () => 'text/html; charset=utf-8' }, json: async () => { throw new SyntaxError('HTML is not JSON') },
  } })
  await assert.rejects(loadDetail(record.id), error => error.code === 'catalogue_changed' && error.action === 'reload')
})

test('transient failures retry with cache revalidation and successfully recover', async () => {
  let fail = true
  const modes = []
  const { loadDetail } = await loadAtlasData({ fetcher: async (url, options) => {
    if (url.endsWith('index.json')) return good(url)
    modes.push(options.cache)
    return fail ? { ok: false, status: 503 } : good(url)
  } })
  await assert.rejects(loadDetail(record.id), error => error.action === 'retry' && error.status === 503)
  fail = false
  assert.deepEqual(await loadDetail(record.id), record)
  assert.deepEqual(modes, ['force-cache', 'reload'])
})

test('a stalled request times out, releases the shared request, and can be retried', async () => {
  let stalled = true
  const { loadDetail } = await loadAtlasData({ timeoutMs: 20, fetcher: async (url, options) => {
    if (url.endsWith('index.json') || !stalled) return good(url)
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }))
  } })
  await assert.rejects(loadDetail(record.id), error => error.code === 'timeout' && error.action === 'retry')
  stalled = false
  assert.deepEqual(await loadDetail(record.id), record)
})

test('incomplete or mismatched batches offer reload without caching partial content', async () => {
  for (const rows of [[], {}, [{ ...record, id: 'other:version' }]]) {
    const { loadDetail } = await loadAtlasData({ fetcher: async url => url.endsWith('index.json') ? good(url) : { ok: true, json: async () => rows } })
    await assert.rejects(loadDetail(record.id), error => error.action === 'reload')
  }
})
