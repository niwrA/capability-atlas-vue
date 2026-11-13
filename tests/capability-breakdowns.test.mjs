import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'
import { auditPilot, evaluatePilot } from '../src/pilot-model.js'
import { auditExploration, createFoundationComparison, explorationRoutes } from '../src/foundation-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset = await readDataset(), breakdowns = dataset.pathway_exploration.breakdowns
const nodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section])
const units = new Map(dataset.learning_units.map(node => [node.id, node]))
const all = new Set(units.keys()), newIds = new Set(breakdowns.flatMap(item => item.activities.map(activity => activity.id)))
const routes = explorationRoutes(dataset)

test('older catalogues without exploration data expose empty optional views', () => {
  const comparison = createFoundationComparison({})
  assert.deepEqual(comparison.breakdowns, [])
  assert.deepEqual(comparison.gaps, [])
  assert.equal(comparison.refinement, null)
})

test('four previously missing capabilities have 20 required activities and traceable source facets', () => {
  assert.equal(breakdowns.length, 4)
  assert.equal(newIds.size, 20)
  assert.deepEqual(auditExploration(dataset).errors, [])
  for (const breakdown of breakdowns) {
    const source = dataset.capabilities.find(node => node.id === breakdown.skill_id)
    assert.equal(breakdown.source_definition, source.definition)
    assert.equal(breakdown.status, 'Unreviewed draft breakdown')
    const ids = new Set(breakdown.activities.map(activity => activity.id))
    const canonical = dataset.decompositions.filter(edge => edge.from === source.id && edge.type === 'decomposes_into').map(edge => edge.to)
    assert.deepEqual(new Set(canonical), ids)
    assert.deepEqual(new Set(breakdown.facets.flatMap(facet => facet.activity_ids)), ids)
    for (const activity of breakdown.activities) {
      const unit = units.get(activity.id)
      assert.ok(unit.input_specification && unit.definition && unit.output_specification)
      assert.ok(unit.assessment.criteria.length >= 3)
      assert.equal(unit.official, false)
      assert.equal(unit.status, 'proposed')
      assert.equal(unit.supporting_sources[0].url, source.source_url)
    }
  }
})

test('each new activity is required before its occupational context and cannot be replaced by a recorded skill gate', () => {
  for (const breakdown of breakdowns) {
    const route = routes.find(route => route.demonstrations[breakdown.skill_id])
    assert.equal(auditPilot(dataset, route).valid, true)
    assert.equal(evaluatePilot(route, nodes, all).complete, true)
    for (const activity of breakdown.activities) {
      const completed = new Set([...all, ...route.steps.filter(step => step.mode === 'gate').map(step => step.id)])
      completed.delete(activity.id)
      const state = evaluatePilot(route, nodes, completed)
      assert.equal(state.steps.get(breakdown.skill_id).done, false, activity.id)
      assert.equal(state.steps.get(route.demonstrations[breakdown.skill_id]).done, false, activity.id)
      assert.equal(state.complete, false)
    }
  }
})

test('previous context records remain recognised but do not supply newly decomposed evidence', () => {
  const legacy = new Set([...all].filter(id => !newIds.has(id)))
  for (const breakdown of breakdowns) {
    const route = routes.find(route => route.demonstrations[breakdown.skill_id])
    const state = evaluatePilot(route, nodes, legacy)
    const context = state.steps.get(route.demonstrations[breakdown.skill_id])
    assert.equal(context.recorded, true)
    assert.equal(context.done, false)
    assert.equal(state.steps.get(breakdown.skill_id).done, false)
  }
  for (const route of routes) assert.equal(evaluatePilot(route, nodes, all).complete, true)
})

test('source breadth includes all named register categories, both enquiry audiences and XML web-service knowledge', () => {
  const books = breakdowns.find(item => item.skill_id.endsWith('047fcf0a-2936-49fb-b4eb-97cdd8d09d0b'))
  const bookText = books.facets.map(facet => facet.label).join(' ')
  for (const term of ['Directors', 'secretaries', 'interests', 'shareholders']) assert.ok(bookText.includes(term))
  const corporate = breakdowns.find(item => item.skill_id.endsWith('5436f06d-4cc0-42a6-8e5b-63b842cce03b'))
  for (const term of ['employees', 'public', 'rules', 'regulations', 'procedures', 'doubts']) assert.ok(corporate.facets.map(facet => facet.label).join(' ').includes(term))
  const web = breakdowns.find(item => item.skill_id.endsWith('f84a433f-34f1-4083-b0a3-24802623509c'))
  const webUnits = web.activities.map(activity => units.get(activity.id))
  for (const term of ['XML', 'namespace', 'WSDL', 'SOAP', 'Fault', 'transport', 'protection']) assert.ok(webUnits.some(unit => (unit.label + unit.definition).includes(term)), term)
  assert.ok(webUnits.every(unit => unit.supporting_sources.some(source => source.url.startsWith('https://www.w3.org/'))))
})

test('audits reject missing canonical activities, incomplete facet mappings, stale sources and inconsistent inputs', () => {
  for (const change of [
    draft => { const id = draft.pathway_exploration.breakdowns[0].activities[0].id; draft.decompositions = draft.decompositions.filter(edge => !(edge.type === 'decomposes_into' && edge.to === id)) },
    draft => { draft.pathway_exploration.breakdowns[0].facets = [] },
    draft => { draft.pathway_exploration.breakdowns[0].facets[0].activity_ids.push('unknown') },
    draft => { draft.pathway_exploration.breakdowns[0].source_definition += ' Stale' },
    draft => { draft.pathway_exploration.breakdowns[0].activities[0].requires.pop() },
  ]) {
    const draft = structuredClone(dataset); change(draft)
    assert.equal(auditExploration(draft).valid, false)
    assert.throws(() => compileDataset(draft), /Invalid/)
  }
})

test('compact data preserves source facets and canonical input semantics; changed evidence invalidates reviews', () => {
  const compact = decodeIndex(compileDataset(dataset).index)
  const comparison = createFoundationComparison(compact)
  assert.equal(comparison.gaps.length, 0)
  assert.equal(comparison.breakdowns.length, 4)
  assert.deepEqual(compact.pathway_exploration.breakdowns, breakdowns)
  const target = breakdowns.at(-1).skill_id
  const before = createReviewFingerprinter(dataset)(target, 'skill_breakdown')
  const draft = structuredClone(dataset)
  draft.learning_units.find(node => node.id === breakdowns.at(-1).activities[0].id).assessment.criteria.push('Changed evidence')
  assert.notEqual(createReviewFingerprinter(draft)(target, 'skill_breakdown'), before)
  const changedFacets = structuredClone(dataset)
  changedFacets.pathway_exploration.breakdowns.at(-1).facets[0].label += ' Changed scope'
  assert.notEqual(createReviewFingerprinter(changedFacets)(target, 'skill_breakdown'), before)
})
