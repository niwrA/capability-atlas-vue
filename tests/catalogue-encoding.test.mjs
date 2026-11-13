import {test} from 'node:test'
import assert from 'node:assert/strict'
import {encodeStringTable, decodeStringTable, poolMetadata, unpoolMetadata} from '../src/catalogue-encoding.js'
import {encodeMetadata, decodeMetadata} from '../src/catalogue-metadata.js'
import {decodeIndex, loadAtlasData} from '../src/atlas-loader.js'

const fixture = value => {
  const strings = [], positions = new Map()
  const intern = value => { if (!positions.has(value)) { positions.set(value, strings.length); strings.push(value) } return positions.get(value) }
  return {metadata: encodeMetadata(value, intern), strings}
}
const pack = value => ({encoding: 'subtree-v1', root: value, pool: []})

test('prefix encoding preserves every string slot, literal scalar, Unicode suffix and empty value', () => {
  const values = [null, '', false, true, 0, 2.5, 'plain', 'http://data.europa.eu/esco/skill/example', 'atlas:alu:profession-domain:é/🧵', 'atlas:alu:pilot:', '__proto__']
  const encoded = encodeStringTable(values)
  assert.deepEqual(decodeStringTable(JSON.parse(JSON.stringify(encoded))), values)
  assert.deepEqual(values.slice(0, 7), [null, '', false, true, 0, 2.5, 'plain'])
  assert.deepEqual(encodeStringTable(values), encoded)
  assert.ok(encoded.values.some(value => Array.isArray(value)))
})

test('malformed prefix records, tags, bounds and suffix types fail instead of changing identifiers', () => {
  const valid = encodeStringTable(['stable'])
  for (const invalid of [null, {...valid, extra: true}, {...valid, encoding: 'unknown'}, {...valid, prefixes: ['']}, {...valid, prefixes: [4]}, {...valid, values: {}}, ...[{}, [0], [0, 'x', 'y'], [-1, 'x'], [0.5, 'x'], [valid.prefixes.length, 'x'], [0, 2]].map(value => ({...valid, values: [value]}))]) assert.throws(() => decodeStringTable(invalid))
  for (const values of [null, [{}], [[0, 'x']], [undefined], [NaN], [Infinity]]) assert.throws(() => encodeStringTable(values))
})

test('repeated route subtrees round-trip every requirement, source field and numeric/null meaning with fresh mutable objects', () => {
  const step = {id: 'shared-step', requires: ['start', 'second-required-input'], mode: 'activity', revision: 2, optional: false, note: null}
  const value = {routes: Array.from({length: 24}, (_, i) => ({id: 'route:' + i, steps: [step], facets: [{source_fragment: 'The exact complete source fragment.', activity_ids: ['shared-step']}], empty: []})), ...JSON.parse('{"__proto__":{"kept":true}}')}
  const {metadata, strings} = fixture(value), original = structuredClone(metadata), pooled = poolMetadata(metadata)
  assert.ok(pooled.pool.length > 0)
  assert.ok(JSON.stringify(pooled).length < JSON.stringify(metadata).length)
  assert.deepEqual(poolMetadata(metadata), pooled)
  assert.deepEqual(unpoolMetadata(JSON.parse(JSON.stringify(pooled))), metadata)
  assert.deepEqual(metadata, original)
  const decoded = decodeMetadata(unpoolMetadata(pooled), decodeStringTable(encodeStringTable(strings)))
  assert.deepEqual(decoded, value)
  assert.notEqual(decoded.routes[0].steps[0], decoded.routes[1].steps[0])
  assert.notEqual(decoded.routes[0].steps[0].requires, decoded.routes[1].steps[0].requires)
  decoded.routes[0].steps[0].requires.pop()
  decoded.routes[0].facets[0].activity_ids.push('another')
  assert.deepEqual(decoded.routes[1], value.routes[1])
  assert.deepEqual(decodeMetadata(unpoolMetadata(pooled), strings), value)
  assert.equal(Object.getPrototypeOf(decoded), Object.prototype)
  assert.equal(Object.hasOwn(decoded, '__proto__'), true)
})

test('invalid or cyclic pool references are rejected even in unused entries', () => {
  for (const invalid of [null, {...pack(null), extra: 1}, {...pack(null), encoding: 'unknown'}, {...pack(null), pool: {}}, pack({r: -1}), pack({r: 0}), pack({r: 0.5}), pack({r: 0, n: 1}), pack({n: '1'}), pack({n: NaN}), pack({n: Infinity}), pack({o: [0]}), pack({x: []}), pack('literal'), {...pack(null), pool: [{r: 0}]}, {...pack(null), pool: [{r: 1}, {r: 0}]}, {...pack(null), pool: [{r: 4}]}, {...pack(null), pool: [{o: {r: 1}}, {n: 1}]}]) assert.throws(() => unpoolMetadata(invalid))
  const nestedCycle = {encoding: 'subtree-v1', root: {r: 0}, pool: [{o: {r: 1}}, [0, {r: 0}]]}
  assert.throws(() => unpoolMetadata(nestedCycle), /Cyclic/)
})

test('acyclic expansion and nesting limits bound corrupt payloads without sharing decoded objects', () => {
  const pool = [[null]]
  for (let i = 1; i < 8; i++) pool.push([{r: i - 1}, {r: i - 1}])
  const encoded = {encoding: 'subtree-v1', root: {r: 7}, pool}
  assert.throws(() => unpoolMetadata(encoded, {maxValues: 32}), /expansion/)
  const expanded = unpoolMetadata(encoded, {maxValues: 5000})
  assert.notEqual(expanded[0], expanded[1])
  let deep = null
  for (let i = 0; i < 300; i++) deep = [deep]
  assert.throws(() => unpoolMetadata(pack(deep)), /nesting/)
  assert.throws(() => poolMetadata(deep), /nesting/)
})

test('format 4 and legacy formats 1/2/3 preserve complete routes, explicit nulls and absent metadata', () => {
  const route = {id: 'stable-route', entry_ids: ['start'], end_ids: ['role'], steps: [{id: 'role', mode: 'gate', requires: ['first', 'second']}], facets: [{source_fragment: 'Full exact source.', activity_ids: ['first', 'second']}]}
  const value = {pilot_pathway: route, pathway_exploration: {routes: [route]}, profession_pathways: {routes: [route]}, profession_coverage: {complete: 1}}
  const {metadata, strings} = fixture(value), base = {nodes: [], sections: {}, edges: {}, strings}
  const legacy = [decodeIndex({...base, format: 1, ...value}), ...[2, 3].map(format => decodeIndex({...base, format, metadata}))]
  const current = decodeIndex({...base, format: 4, strings: encodeStringTable(strings), metadata: poolMetadata(metadata)})
  for (const decoded of legacy) assert.deepEqual(current, decoded)
  const cleared = fixture({pilot_pathway: null, pathway_exploration: null})
  const decoded = decodeIndex({...base, format: 4, strings: encodeStringTable(cleared.strings), metadata: poolMetadata(cleared.metadata)})
  assert.equal(decoded.pilot_pathway, null); assert.equal(decoded.pathway_exploration, null)
  assert.equal(decoded.profession_pathways, undefined)
})

test('format 4 loading uses restored stable IDs for detail buckets and preserves exact detail records', async () => {
  const id = 'http://data.europa.eu/esco/skill/preserved', {metadata, strings} = fixture({})
  strings.push(id, 'A source label')
  const index = {format: 4, summaryFields: ['id', 'label'], edgeFields: [], strings: encodeStringTable(strings), nodes: [[strings.length - 2, strings.length - 1, 'ab']], sections: {capabilities: [0, 1]}, edges: {}, chunks: {ab: 'details-ab-example.json'}, metadata: poolMetadata(metadata)}
  const detail = {id, label: 'A source label', definition: 'Every full original field remains here.'}, calls = []
  const loaded = await loadAtlasData({fetcher: async url => { calls.push(url); return {ok: true, json: async () => structuredClone(url.endsWith('index.json') ? index : [detail])} }})
  assert.equal(loaded.dataset.capabilities[0].id, id)
  assert.deepEqual(await loaded.loadDetail(id), detail)
  assert.equal(calls.length, 2)
  assert.ok(calls[1].endsWith('details-ab-example.json'))
})

test('malformed format 4 transport offers reload while unknown future formats remain unsupported', () => {
  for (const index of [{format: 4, strings: {}}, {format: 4, strings: encodeStringTable([]), metadata: {...pack(null), pool: [{r: 0}]}}]) assert.throws(() => decodeIndex(index), error => error.code === 'invalid_metadata' && error.action === 'reload')
  assert.throws(() => decodeIndex({format: 5}), error => error.code === 'unsupported_version' && error.action === 'reload')
})
