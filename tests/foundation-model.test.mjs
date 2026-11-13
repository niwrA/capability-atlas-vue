import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'
import { auditPilot, evaluatePilot } from '../src/pilot-model.js'
import { auditExploration, createFoundationComparison } from '../src/foundation-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset = await readDataset(), exploration = dataset.pathway_exploration
const nodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section])
const allActivities = new Set(dataset.learning_units.map(node => node.id))
const comparison = createFoundationComparison(dataset)

test('five contrasting routes account for every essential requirement with four canonical draft breakdowns', () => {
  assert.deepEqual(auditExploration(dataset).errors, [])
  assert.equal(exploration.routes.length, 5)
  assert.equal(comparison.routes.reduce((n, route) => n + route.requirements.length, 0), 109) // includes original shelf filler
  assert.equal(comparison.gaps.length, 0)
  assert.deepEqual(comparison.breakdowns.map(item => item.node.label).sort(), ['notify customers on special offers', 'maintain statutory books', 'disseminate general corporate information', 'web services'].sort())
  for (const route of exploration.routes) {
    const audit = auditPilot(dataset, route), state = evaluatePilot(route, nodes, allActivities)
    assert.equal(audit.valid, true)
    assert.equal(state.complete, !audit.requirements.some(item => item.gap))
    for (const item of audit.requirements) {
      const demo = nodes.find(node => node.id === item.demonstration)
      assert.ok(demo.input_specification && demo.output_specification && demo.assessment.criteria.length >= 3)
      assert.equal(demo.status, 'proposed')
      if (item.gap) assert.equal(state.steps.get(item.id).done, false)
    }
    assert.equal(route.steps.some(step => step.id === 'atlas:role:independent-adult'), false)
  }
})

test('a missing activity blocks a complete draft route and recorded gates cannot bypass input evidence', () => {
  const route = exploration.routes.find(route => route.id.includes('cook'))
  const activityIds = route.steps.filter(step => step.mode === 'activity').map(step => step.id)
  for (const missing of activityIds) {
    const completed = new Set(route.steps.map(step => step.id).filter(id => id !== missing))
    assert.equal(evaluatePilot(route, nodes, completed).complete, false, missing)
  }
})

test('exact source-skill reuse is distinct from proposed prerequisite reuse and contextual completion', () => {
  assert.equal(comparison.sharedRequirements.length, 5)
  const shared = comparison.sharedRequirements.find(row => row.node.label === 'examine merchandise')
  assert.equal(shared.uses.length, 2)
  assert.equal(new Set(shared.uses.map(use => use.demonstration)).size, 2)
  const retail = exploration.routes.find(route => route.id.includes('retail'))
  const completed = new Set(retail.steps.filter(step => step.mode === 'activity').map(step => step.id))
  const shelf = evaluatePilot(dataset.pilot_pathway, nodes, completed)
  assert.equal(shelf.steps.get(shared.id).done, false, 'A new context still requires its own demonstration')
  const measure = comparison.foundations.find(row => row.id.endsWith(':measure'))
  assert.ok(measure.count >= 3)
  assert.ok(measure.inputs.every(id => exploration.foundation_ids.includes(id)))
  for (const use of measure.uses) {
    const route = comparison.routes.find(route => route.id === use.route_id)
    assert.deepEqual(use.skills.map(skill => skill.id), route.requirements.filter(skill => skill.ancestors.has(measure.id)).map(skill => skill.id))
  }
})

test('all modeled foundation inputs trace to supported entries and no proposed foundation is orphaned', () => {
  assert.ok(comparison.foundations.length >= 85)
  for(const key of ['offer-response','match-reference','instruction-action','ordered-actions','record-observation','authorisation-boundary','locate-rule'])assert.ok(comparison.foundations.some(row=>row.id==='atlas:alu:profession-foundation:'+key),'Shared canonical input remains visible: '+key)
  const learned = new Map()
  for (const route of [dataset.pilot_pathway, ...exploration.routes]) {
    const completed = new Set()
    for (let iteration = 0; iteration < route.steps.length; iteration++) {
      const ready = evaluatePilot(route, nodes, completed).ready
      if (!ready.length) break
      for (const step of ready) completed.add(step.id)
    }
    learned.set(route.id, completed)
  }
  for (const foundation of comparison.foundations) {
    assert.ok(foundation.uses.length)
    for (const use of foundation.uses) {
      assert.ok(learned.get(use.route_id).has(foundation.id), foundation.id)
    }
  }
})

test('audits reject omitted requirements, undeclared gaps, false gaps and missing comparison references', () => {
  const changes = [
    draft => draft.pathway_exploration.routes[0].steps.find(step => step.id === draft.pathway_exploration.routes[0].occupation_id).requires.pop(),
    draft => { draft.decompositions = draft.decompositions.filter(edge => edge.from !== draft.pathway_exploration.breakdowns[0].skill_id) },
    draft => { draft.pathway_exploration.routes[0].steps.find(step => step.mode === 'gate').gap = 'Pretend this is missing' },
    draft => { draft.pathway_exploration.routes[0].steps.find(step => step.mode === 'activity').gap = 'Bypass this' },
    draft => draft.pathway_exploration.foundation_ids.push('missing'),
    draft => draft.pathway_exploration.questions[0].concept_ids.push('missing'),
  ]
  for (const change of changes) { const draft = structuredClone(dataset); change(draft); assert.equal(auditExploration(draft).valid, false) }
})

test('compiled comparison and completion agree with canonical data without loading descriptions', () => {
  const compact = decodeIndex(compileDataset(dataset).index)
  assert.deepEqual(compact.pathway_exploration, exploration)
  const slim = createFoundationComparison(compact)
  assert.deepEqual(slim.foundations.map(row => [row.id, row.count, row.branches, row.inputs]), comparison.foundations.map(row => [row.id, row.count, row.branches, row.inputs]))
  const compactNodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => compact[section])
  for (const route of exploration.routes) {
    const actual = evaluatePilot(compact.pathway_exploration.routes.find(item => item.id === route.id), compactNodes, allActivities)
    assert.equal(actual.complete, evaluatePilot(route, nodes, allActivities).complete)
  }
})

test('new route and contextual changes invalidate affected pathway reviews', () => {
  const route = exploration.routes.find(route => route.id.includes('software'))
  const before = createReviewFingerprinter(dataset)(route.occupation_id, 'occupation_pathway')
  for (const change of [
    draft => { draft.pathway_exploration.routes.find(item => item.id === route.id).semantics += ' Changed' },
    draft => { draft.learning_units.find(node => node.id === Object.values(route.demonstrations)[0]).definition += ' Changed' },
    draft => { draft.pathway_exploration.routes.find(item => item.id === route.id).steps.find(step => step.id === draft.pathway_exploration.breakdowns.at(-1).skill_id).requires.pop() },
  ]) {
    const draft = structuredClone(dataset); change(draft)
    assert.notEqual(createReviewFingerprinter(draft)(route.occupation_id, 'occupation_pathway'), before)
  }
})
