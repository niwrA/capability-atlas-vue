import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { effectScope, nextTick } from 'vue'
import { parse, compileScript } from '@vue/compiler-sfc'
import { compileDataset, readDataset, root, nodeSections, edgeSections, summaryFields, edgeFields } from '../scripts/atlas-data.mjs'
import { decodeIndex, loadAtlasData } from '../src/atlas-loader.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const source = await readDataset()
const { index, files } = compileDataset(source)
const compact = decodeIndex(index)
const records = nodeSections.flatMap(section => source[section] || [])
const byId = new Map(records.map(record => [record.id, record]))
const project = (record, fields) => Object.fromEntries(fields.filter(field => record[field] !== undefined).map(field => [field, record[field]]))

test('the documented review fingerprint command runs as a standalone CLI', () => {
  const target = source.learning_units[0].id
  const output = execFileSync(process.execPath, ['scripts/content-reviews.mjs', target, 'activity_content'], { cwd: root, encoding: 'utf8', timeout: 20000 }).trim()
  assert.equal(output, createReviewFingerprinter(source)(target, 'activity_content'))
})

test('the active catalogue matches the archive inventory fingerprints, including unlinked skills', () => {
  const report = source.esco_full_catalogue_import
  const hashLines = lines => createHash('sha256').update(lines.sort().join('\n') + '\n').digest('hex')
  const roles = source.roles.filter(n => n.source === 'ESCO' && n.source_status === 'released')
  const skills = source.capabilities.filter(n => n.source === 'ESCO' && n.source_status === 'released')
  const edges = source.role_capability_assertions.filter(e => e.type.startsWith('esco_'))
  assert.equal(roles.length, report.inventory.occupations)
  assert.equal(skills.length, report.inventory.skill_knowledge_concepts)
  assert.equal(edges.length, report.inventory.occupation_skill_links)
  assert.equal(hashLines(roles.map(n => n.id)), report.fingerprints_sha256.occupation_ids)
  assert.equal(hashLines(skills.map(n => n.id)), report.fingerprints_sha256.skill_ids)
  assert.equal(hashLines(edges.map(e => [e.from, e.to, e.type].join('\t'))), report.fingerprints_sha256.occupation_skill_links)
  const linked = new Set(edges.map(e => e.to))
  assert.equal(skills.filter(n => !linked.has(n.id)).length, report.inventory.skills_without_occupation_links)
})

test('the complete graph survives compilation with all IDs and calculation flags intact', () => {
  for (const section of nodeSections) assert.deepEqual(compact[section], source[section].map(record => project(record, summaryFields)))
  for (const section of edgeSections) assert.deepEqual(compact[section], source[section].map(record => project(record, edgeFields)))
  const details = new Map([...files.values()].flatMap(text => JSON.parse(text)).map(record => [record.id, record]))
  assert.equal(details.size, records.length)
  for (const record of records) assert.deepEqual(details.get(record.id), record)
  assert.ok(Buffer.byteLength(JSON.stringify(index)) < 12 * 1048576, 'Keep the full catalogue index below 12 MiB raw')
  assert.ok(gzipSync(JSON.stringify(index)).length < 2.5 * 1048576, 'Keep the full catalogue index below 2.5 MiB gzip')
  for (const text of files.values()) assert.ok(Buffer.byteLength(text) < 512 * 1024, 'Keep detail batches below 512 KiB')
})

test('invalid graph references and duplicate IDs fail the build', () => {
  assert.throws(() => compileDataset({ ...source, roles: [...source.roles, source.roles[0]] }), /duplicate/)
  assert.throws(() => compileDataset({ ...source, decompositions: [{ from: 'missing', to: records[0].id }] }), /Dangling/)
  assert.throws(() => decodeIndex({ format: 99 }), error => error.action === 'reload' && error.code === 'unsupported_version')
})

function mockFetch() {
  const calls = [], failures = new Set()
  const fetcher = async (url, options) => {
    calls.push({ url, options })
    const file = url.split('/').at(-1)
    return { ok: !failures.has(file), status: failures.has(file) ? 503 : 200, json: async () => structuredClone(file === 'index.json' ? index : JSON.parse(files.get(file))) }
  }
  return { calls, failures, fetcher }
}

test('startup loads no details; simultaneous requests share one batch; failures can be retried', async () => {
  const { calls, failures, fetcher } = mockFetch()
  const { loadDetail } = await loadAtlasData({ baseUrl: '/nested/atlas-data/', fetcher })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/nested/atlas-data/index.json')
  assert.equal(calls[0].options.cache, 'no-cache')
  const id = records[0].id
  const [first, second] = await Promise.all([loadDetail(id), loadDetail(id)])
  assert.deepEqual(first, byId.get(id)); assert.deepEqual(second, first)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].options.cache, 'force-cache')
  await loadDetail(id)
  assert.equal(calls.length, 2)
  const otherRow = index.nodes.find(row => row.at(-1) !== index.nodes[0].at(-1))
  const otherId = index.strings[otherRow[0]], file = index.chunks[otherRow.at(-1)]
  failures.add(file)
  await assert.rejects(loadDetail(otherId), error => error.status === 503 && error.action === 'retry')
  failures.delete(file)
  assert.deepEqual(await loadDetail(otherId), byId.get(otherId))
  await assert.rejects(loadDetail('missing-id'), /not in the catalogue/)
})

test('detail memory is bounded and incomplete batches cannot silently hide records', async () => {
  const { calls, fetcher } = mockFetch()
  const { loadDetail } = await loadAtlasData({ fetcher, maxCachedChunks: 1 })
  const first = index.nodes[0], second = index.nodes.find(row => row.at(-1) !== first.at(-1))
  await loadDetail(index.strings[first[0]])
  await loadDetail(index.strings[second[0]])
  await loadDetail(index.strings[first[0]])
  assert.equal(calls.length, 4)
  const broken = await loadAtlasData({ fetcher: async url => ({ ok: true, json: async () => url.endsWith('index.json') ? index : [] }) })
  await assert.rejects(broken.loadDetail(records[0].id), /incomplete/)
})

// Exercise the actual Vue setup and computed values, including saved learner
// state, without requiring a browser or adding a second UI test framework.
const script = compileScript(parse(await readFile(resolve(root, 'src/App.vue'), 'utf8')).descriptor, { id: 'atlas-test' }).content
const moduleText = script.replaceAll("from 'vue'", `from '${pathToFileURL(resolve(root, 'node_modules/vue/index.mjs')).href}'`).replace(/from '(\.\/[^']+)'/g, (_, file) => `from '${pathToFileURL(resolve(root, 'src', file)).href}'`).replaceAll('__APP_VERSION__', "'test'")
const { default: App } = await import(`data:text/javascript;base64,${Buffer.from(moduleText).toString('base64')}`)
function setup(dataset, saved = {}, loadDetail = async id => byId.get(id)) {
  const storage = new Map(Object.entries(saved).map(([key, value]) => [`atlas-learner:${key}`, JSON.stringify(value)]))
  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
  const scope = effectScope()
  const state = scope.run(() => App.setup({ dataset, loadDetail }, { expose() {} }))
  return { state, stop: () => scope.stop() }
}
const graphSignature = state => ({
  status: state.displayGraph.value.status,
  ids: state.displayGraph.value.vertices.map(n => n.id),
  edges: state.displayGraph.value.edges.map(e => project(e, ['from', 'to', 'type', 'validation', 'completionRequirement'])),
  suggestions: state.suggested.value.map(n => n.id),
  goals: state.goalStats.value.map(g => ({ id: g.id, progress: g.progress })),
})

test('compact data preserves zero-start, goal routes, optional links, search and saved assessments', async () => {
  const software = source.roles.find(role => role.label === 'software developer').id
  const start = 'atlas:alu:development:communication:respond-to-early-signals'
  const skill = source.role_capability_assertions.find(e => e.from === software && e.type === 'esco_essential').to
  const saves = [
    {},
    { favorites: [software], pathGoal: software },
    { favorites: [software], pathGoal: software, completed: [start, skill], assessmentCoverage: { [skill]: [] } },
    { favorites: [source.qualifications[0].id], completed: [start] },
  ]
  for (const saved of saves) {
    const full = setup(source, saved), slim = setup(compact, saved)
    try {
      assert.deepEqual(graphSignature(slim.state), graphSignature(full.state))
      assert.deepEqual(slim.state.progressForNode(software), full.state.progressForNode(software))
      slim.state.showOptional.value = false; full.state.showOptional.value = false
      assert.deepEqual(graphSignature(slim.state), graphSignature(full.state))
      slim.state.graphMode.value = 'relations'; full.state.graphMode.value = 'relations'
      slim.state.center.value = software; full.state.center.value = software
      slim.state.depth.value = 2; full.state.depth.value = 2
      assert.deepEqual(graphSignature(slim.state), graphSignature(full.state))
      slim.state.search.value = 'software'; full.state.search.value = 'software'
      assert.deepEqual(slim.state.results.value.map(n => n.id), full.state.results.value.map(n => n.id))
    } finally { full.stop(); slim.stop() }
  }
  await nextTick()
})

test('progress remains accurate without loaded details and updates after marking a step', async () => {
  const { state, stop } = setup(compact, {}, () => new Promise(() => {}))
  try {
    assert.equal(state.detailLoading.value, true)
    const id = state.center.value
    assert.equal(state.focusedProgress.value.percent, 0)
    assert.ok(state.progressCache.value.size < 100, 'Do not calculate progress for the entire catalogue')
    state.toggleDone(id)
    assert.equal(state.focusedProgress.value.percent, 100)
    state.toggleDone(id)
    assert.equal(state.focusedProgress.value.percent, 0)
  } finally { stop() }
})

test('new catalogue entries without activities are searchable and do not invent a learning route', async () => {
  const { state, stop } = setup(compact)
  try {
    const role = source.roles.find(n => n.source_status === 'released' && state.pathwayCoverage(n.id)?.developed === 0 && state.pathwayCoverage(n.id)?.total > 0)
    assert.ok(role, 'The expanded catalogue should include occupations without activity breakdowns')
    state.search.value = role.id
    assert.ok(state.results.value.some(n => n.id === role.id))
    if (role.label_nl) {
      state.search.value = role.label_nl
      assert.ok(state.results.value.some(n => n.id === role.id))
    }
    state.focus(role.id)
    state.toggleFav(role.id)
    assert.equal(state.focusedCoverage.value.status, 'No activity breakdown')
    assert.equal(state.routeNotice.value.title, 'Learning activities are not mapped yet')
    assert.match(state.generalSuggestionNotice.value, /general starting activities/)
    assert.equal(state.goalStats.value[0].progress.done, 0)
    // Existing optional skills may have real draft activities; they must not
    // become a required learning route when optional links are hidden.
    state.showOptional.value = false
    assert.notEqual(state.learningPath.value.status, 'ready')
    const obsolete = source.capabilities.find(n => n.source_status === 'obsolete')
    state.search.value = obsolete.label
    assert.ok(!state.results.value.some(n => n.id === obsolete.id))
    state.search.value = obsolete.id
    assert.ok(state.results.value.some(n => n.id === obsolete.id))
  } finally { stop() }
  await nextTick()
})

test('browsing reaches occupations beyond the first search page and resets pages when filters change', () => {
  const { state, stop } = setup(compact)
  try {
    assert.equal(state.browseResults.value.total, source.esco_full_catalogue_import.inventory.occupations)
    const first = state.browseResults.value.items.map(n => n.id)
    state.browsePage.value = 2
    assert.ok(state.browseResults.value.items.every(n => !first.includes(n.id)))
    state.browseGroup.value = '0'
    assert.equal(state.browsePage.value, 1)
    assert.ok(state.browseResults.value.items.every(n => n.notation.startsWith('0')))
    state.browseGroup.value = 'atlas-life'
    assert.equal(state.browseResults.value.total, 3)
    assert.ok(state.browseResults.value.items.every(n => n.role_family === 'life'))
    state.browseCoverage.value = 'reviewed'
    assert.equal(state.browseResults.value.total, 0)
    state.clearBrowseFilters()
    assert.equal(state.browseResults.value.total, 3039)
  } finally { stop() }
})

test('shared foundations on a mapped route produce next-step suggestions after a recorded start', () => {
  const start = 'atlas:alu:development:communication:respond-to-early-signals'
  const goal = 'http://data.europa.eu/esco/occupation/8d3e8aaa-791b-4c75-a465-f3f827028f50'
  const { state, stop } = setup(compact, { favorites: [goal], pathGoal: goal, completed: [start] })
  try {
    assert.equal(state.learningPath.value.status, 'ready')
    assert.ok(state.suggested.value.length > 0)
    assert.ok(state.suggested.value.some(item => [...item.reasons].some(reason => reason.startsWith('Next after'))))
    assert.ok(state.suggested.value.every(item => state.learningPath.value.scopeIds.includes(item.id)))
    state.hideCompleted.value = true
    assert.ok(state.suggested.value.length > 0, 'Hiding completed graph nodes must keep their next steps available')
    assert.ok(state.suggested.value.every(item => !state.isDone(item.id)))
  } finally { stop() }
})

test('outdated detail errors offer reload while keeping goals and recorded learning', async () => {
  const id = 'atlas:alu:development:communication:respond-to-early-signals'
  const { state, stop } = setup(compact, { favorites: [id], completed: [id] }, async () => { throw Object.assign(new Error('Catalogue changed'), { action: 'reload' }) })
  try {
    await nextTick(); await nextTick()
    assert.equal(state.detailErrorAction.value, 'reload')
    assert.deepEqual([...state.favorites.value], [id])
    assert.deepEqual([...state.completed.value], [id])
    assert.equal(state.pathwayCoverage(id).review.status, 'unreviewed')
  } finally { stop() }
})

test('inspection history supports back/forward and branching without losing library search', () => {
  const { state, stop } = setup(compact)
  try {
    const initial = state.center.value, first = source.roles[0].id, second = source.roles[1].id
    state.libraryQuery.value = 'software'
    state.inspectConcept(first)
    state.inspectConcept(second)
    assert.equal(state.workbenchTab.value, 'inspect')
    assert.equal(state.libraryQuery.value, 'software')
    state.stepInspection(-1)
    assert.equal(state.center.value, first)
    state.stepInspection(-1)
    assert.equal(state.center.value, initial)
    state.stepInspection(1)
    assert.equal(state.center.value, first)
    state.inspectConcept(source.roles[2].id)
    assert.equal(state.inspectionHistory.value.includes(second), false)
    state.inspectConcept(state.center.value)
    assert.equal(state.inspectionHistory.value.length, 3)
  } finally { stop() }
})

test('late detail responses cannot replace a newer focus; errors offer a working retry', async () => {
  const pending = new Map()
  const { state, stop } = setup(compact, {}, id => new Promise((resolve, reject) => pending.set(id, { resolve, reject })))
  try {
    const first = state.center.value, second = source.roles[0].id
    state.focus(second)
    await nextTick()
    pending.get(second).resolve(byId.get(second))
    await nextTick(); await nextTick()
    assert.equal(state.focusNode.value.id, second)
    pending.get(first).resolve(byId.get(first))
    await nextTick(); await nextTick()
    assert.equal(state.focusNode.value.id, second)
    state.focus(first)
    await nextTick()
    pending.get(first).reject(new Error('Connection lost'))
    await nextTick(); await nextTick()
    assert.equal(state.detailError.value, 'Connection lost')
    const retry = state.refreshDetail()
    pending.get(first).resolve(byId.get(first))
    await retry
    assert.equal(state.detailError.value, '')
    assert.equal(state.focusNode.value.id, first)
  } finally { stop() }
})
