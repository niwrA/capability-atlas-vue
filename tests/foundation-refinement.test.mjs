import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { evaluatePilot } from '../src/pilot-model.js'
import { auditExploration, explorationRoutes } from '../src/foundation-model.js'
import { refinedActivities, refinementId } from '../scripts/foundation-refinement.mjs'

const dataset = await readDataset(), refinement = dataset.pathway_exploration.refinement
const nodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section])
const newIds = new Set(refinedActivities.map(row => refinementId(row[1])))
const byId = new Map(nodes.map(node => [node.id, node]))
const routes = explorationRoutes(dataset)
function ancestors(route, root) {
  const steps = new Map(route.steps.map(step => [step.id, step])), found = new Set(), pending = [root]
  while (pending.length) for (const input of steps.get(pending.pop())?.requires || []) if (!found.has(input)) { found.add(input); pending.push(input) }
  return found
}

test('three refinement branches have observable materials, practice and evidence with explicit access methods', () => {
  assert.deepEqual(refinement.groups.map(group => [group.id, group.activity_ids.length]), [['reading', 9], ['quantities', 11], ['reasoning', 13]])
  assert.equal(newIds.size, 33)
  for (const id of newIds) {
    const activity = byId.get(id)
    assert.ok(activity.input_specification && activity.definition && activity.output_specification)
    assert.ok(activity.assessment.criteria.length >= 3)
    assert.equal(activity.status, 'proposed')
    assert.equal(activity.official, false)
  }
  assert.match(byId.get(refinementId('supported-word-reading')).definition, /strategy|tool/)
  assert.match(byId.get(refinementId('short-record')).input_specification, /dictation/)
})

test('legacy completion is retained but does not bypass newly specified earlier practice', () => {
  const legacy = new Set(dataset.learning_units.filter(node => !newIds.has(node.id)).map(node => node.id))
  const before = [...legacy]
  for (const route of routes) {
    const state = evaluatePilot(route, nodes, legacy)
    assert.equal(state.complete, false)
    const texts = state.steps.get(refinementId('@practical-texts'))
    assert.equal(texts.recorded, true)
    assert.equal(texts.done, false)
    assert.equal(texts.status, 'Recorded; inputs incomplete')
  }
  assert.deepEqual([...legacy], before)
})

test('reading, quantity and reasoning refinements connect to each occupational context without unrelated budget prerequisites', () => {
  const software = routes.find(route => route.id.includes('software'))
  const programming = dataset.capabilities.find(node => node.label === 'computer programming' && software.demonstrations[node.id])
  const needed = ancestors(software, programming.id)
  for (const key of ['supported-word-reading', 'action-from-instruction', 'order-actions', 'condition-check', 'repeat-stop', 'single-update', 'trace-updates', 'expected-example', 'replay-failure', 'match-code-rule', 'digital-action']) assert.ok(needed.has(refinementId(key)), key)
  for (const key of ['@digital-practice', '@money-and-dates', 'decimal-place', 'fraction-quantity']) assert.equal(needed.has(refinementId(key)), false, key)
  const cook = routes.find(route => route.id.includes(':cook:'))
  const expenses = dataset.capabilities.find(node => node.label === 'control of expenses' && cook.demonstrations[node.id])
  assert.ok(ancestors(cook, expenses.id).has(refinementId('decimal-place')))
  const cooking = dataset.capabilities.find(node => node.label === 'use food preparation techniques' && cook.demonstrations[node.id])
  assert.ok(ancestors(cook, cooking.id).has(refinementId('scale-factor')))
})

test('every newly required activity can block at least one route even with all other evidence recorded', () => {
  const all = new Set(dataset.learning_units.map(node => node.id))
  for (const id of newIds) {
    // A no-gap route gives a direct completion assertion; all others still
    // expose affected gates even when their source-breakdown gap is unresolved.
    const route = routes.find(route => !route.steps.some(step => step.gap) && route.steps.some(step => step.id === id)) || routes.find(route => route.steps.some(step => step.id === id))
    assert.ok(route, id)
    const before = evaluatePilot(route, nodes, all)
    const partial = new Set(all); partial.delete(id)
    const after = evaluatePilot(route, nodes, partial)
    assert.equal(after.steps.get(id).done, false)
    assert.ok(after.completed < before.completed, id)
    if (!route.steps.some(step => step.gap)) { assert.equal(before.complete, true); assert.equal(after.complete, false) }
  }
})

test('the refinement audit rejects stale inputs and unknown refinement references', () => {
  const wrong = structuredClone(dataset)
  const change = wrong.pathway_exploration.refinement.changes.find(change => change.target_id === refinementId('@practical-texts'))
  const step = wrong.pathway_exploration.routes[0].steps.find(step => step.id === change.target_id)
  step.requires = change.before
  const audit = auditExploration(wrong)
  assert.equal(audit.valid, false)
  assert.ok(audit.errors.some(error => error.startsWith('Stale refined inputs:')))
  const missing = structuredClone(dataset)
  missing.pathway_exploration.refinement.groups[0].activity_ids.push('missing')
  assert.equal(auditExploration(missing).valid, false)
})
