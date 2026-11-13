import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { measurementId, measurementInputs } from '../scripts/measurement-foundations.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'

const fullDataset = await readDataset()
// Isolate this established branch from later occupational authoring batches.
const dataset = {...fullDataset,learning_units:fullDataset.learning_units.filter(node=>node.source!=='Capability Atlas individually authored profession pathways v1')}
delete dataset.profession_pathways
const find = key => dataset.learning_units.find(node => node.id === measurementId(key))

test('measurement foundations explain actual graph and route inputs without broad reading or shortfall barriers', () => {
  for (const [key, parents] of Object.entries(measurementInputs)) {
    const node = find(key)
    assert.equal(assessLearningDesign(node).status, 'draft_ready')
    const expected = parents.map(measurementId).sort()
    assert.deepEqual(node.learning_design.dependency_basis.map(item => item.input_id).sort(), expected)
    assert.deepEqual(dataset.decompositions.filter(edge => edge.type === 'prerequisite_for' && edge.to === node.id).map(edge => edge.from).sort(), expected)
    for (const route of [dataset.pilot_pathway, ...dataset.pathway_exploration.routes]) {
      const step = route.steps.find(step => step.id === node.id)
      if (step) assert.deepEqual([...step.requires].sort(), expected)
    }
  }
  assert.ok(!measurementInputs.classify.includes('@read-symbols'))
  assert.ok(!measurementInputs['repeat-unit'].includes('@count-and-compare'))
})

test('early counting observations distinguish offered support from independent understanding', () => {
  const sequence = find('early:numeracy:experience-number-words').learning_design
  assert.match(sequence.understanding_check.evidence_scope, /not a test of independent/)
  const total = find('early:numeracy:understand-counted-total').learning_design
  assert.match(total.understanding_check.evidence_scope, /supplies the total/)
  assert.ok(total.understanding_check.expected_evidence.some(text => text.includes('rearranged')))
  assert.equal(sequence.scope, 'activity')
  assert.equal(total.scope, 'activity')
})

test('whole activity closure requires every earlier design and its prerequisite rationale', () => {
  assert.equal(auditAllSkills(dataset).summary.authored_activity_closures, 9)
  const draft = structuredClone(dataset)
  const scale = draft.learning_units.find(node => node.id === measurementId('read-scale'))
  scale.learning_design.dependency_basis = []
  // Scale reading and both precision children lose closure; upstream designs remain.
  assert.equal(auditAllSkills(draft).summary.authored_activity_closures, 6)
  assert.equal(auditAllSkills(draft).summary.authored_complete, 0)
})
