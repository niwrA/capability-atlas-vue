import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'
import { auditPilot, evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset = await readDataset(), pilot = dataset.pilot_pathway
const nodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section])
const activityIds = pilot.steps.filter(step => step.mode === 'activity').map(step => step.id)

test('pilot covers every required decomposition branch for both roles, with inspectable demonstrations', () => {
  const audit = auditPilot(dataset)
  assert.deepEqual(audit.errors, [])
  assert.equal(audit.requirements.filter(item => item.role_id === pilot.adult_role_id).length, 14)
  assert.equal(audit.requirements.filter(item => item.role_id === pilot.occupation_id).length, 8)
  assert.ok(audit.activities >= 104)
  for(const phase of ['preparation','manufacturing','processing','storage','distribution','delivery'])assert.ok(pilot.steps.some(step=>step.id==='atlas:alu:profession-domain:food-hygiene:'+phase),'New canonical food phase must remain required: '+phase)
  for (const requirement of audit.requirements) {
    const node = nodes.find(node => node.id === requirement.demonstration)
    assert.ok(node.input_specification && node.output_specification && node.assessment.criteria.length)
    assert.equal(node.status, 'proposed')
  }
  assert.equal(evaluatePilot(pilot, nodes).completed, 0)
  assert.equal(evaluatePilot(pilot, nodes).ready.length, pilot.entry_ids.length)
  assert.equal(evaluatePilot(pilot, nodes, new Set(activityIds)).complete, true)
})

test('every activity is necessary: missing evidence blocks at least one endpoint even if all gates are manually marked', () => {
  const allIds = pilot.steps.map(step => step.id)
  for (const missing of activityIds) {
    const state = evaluatePilot(pilot, nodes, new Set(allIds.filter(id => id !== missing)))
    assert.equal(state.complete, false, missing)
    assert.ok(pilot.end_ids.some(id => !state.steps.get(id).done), missing)
  }
  const firstBranch = pilot.steps.find(step => step.mode === 'gate' && !pilot.end_ids.includes(step.id))
  const partial = evaluatePilot(pilot, nodes, new Set([...pilot.entry_ids, firstBranch.id, ...firstBranch.requires]))
  assert.equal(partial.steps.get(firstBranch.id).done, false, 'One recorded branch cannot bypass its inputs')
})

test('endpoints are parallel and completion progresses through ready activities without requiring adult independence for work', () => {
  const completed = new Set(), visited = new Set()
  for (let iteration = 0; iteration < activityIds.length; iteration++) {
    const state = evaluatePilot(pilot, nodes, completed)
    for (const step of state.ready) { completed.add(step.id); visited.add(step.id) }
    if (state.complete) break
  }
  assert.equal(visited.size, activityIds.length)
  assert.equal(evaluatePilot(pilot, nodes, completed).complete, true)
  const withoutAdultScenarios = new Set(activityIds.filter(id => !id.startsWith('atlas:alu:pilot:shelf-filler:adult-')))
  const state = evaluatePilot(pilot, nodes, withoutAdultScenarios)
  assert.equal(state.steps.get(pilot.adult_role_id).done, false)
  assert.equal(state.steps.get(pilot.occupation_id).done, true)
})

test('build rejects missing inputs, cycles, omitted role requirements and skipped required leaf activities', () => {
  for (const change of [
    draft => { draft.steps[1].requires.push('missing') },
    draft => { draft.steps[0].requires.push(draft.steps[1].id) },
    draft => { draft.steps.find(step => step.id === draft.adult_role_id).requires.pop() },
    draft => {
      const leaf = dataset.learning_units.find(node => node.id.startsWith('atlas:alu:life-communicate-respectfully-'))
      draft.steps = draft.steps.filter(step => step.id !== leaf.id)
      for (const step of draft.steps) step.requires = step.requires.filter(id => id !== leaf.id)
    },
  ]) {
    const draft = structuredClone(pilot); change(draft)
    assert.equal(auditPilot(dataset, draft).valid, false)
    assert.throws(() => compileDataset({ ...dataset, pilot_pathway: draft }), /Invalid pilot pathway/)
  }
})

test('compact catalogue preserves pilot semantics and agrees with canonical evaluation', () => {
  const compact = decodeIndex(compileDataset(dataset).index)
  assert.deepEqual(compact.pilot_pathway, pilot)
  const compactNodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => compact[section])
  for (const completed of [new Set(), new Set(pilot.entry_ids), new Set(activityIds)]) {
    const full = evaluatePilot(pilot, nodes, completed), small = evaluatePilot(compact.pilot_pathway, compactNodes, completed)
    assert.deepEqual([...small.steps.values()].map(step => [step.id, step.done, step.ready, step.missing]), [...full.steps.values()].map(step => [step.id, step.done, step.ready, step.missing]))
  }
})

test('pathway review fingerprints change when pilot prerequisites, context or demonstrations change', () => {
  const fingerprint = createReviewFingerprinter(dataset)(pilot.occupation_id, 'occupation_pathway')
  for (const change of [
    draft => { draft.pilot_pathway.semantics += ' Revised semantics.' },
    draft => { draft.pilot_pathway.steps.find(step => step.id === pilot.occupation_id).requires.pop() },
    draft => { draft.learning_units.find(node => node.id === pilot.demonstrations[pilot.steps.find(step => step.mode === 'gate' && step.stage === 'work').id]).definition += ' Revised activity.' },
  ]) {
    const draft = structuredClone(dataset); change(draft)
    assert.notEqual(createReviewFingerprinter(draft)(pilot.occupation_id, 'occupation_pathway'), fingerprint)
  }
})
