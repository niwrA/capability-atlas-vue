import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createInspectionModel, conceptType } from '../src/inspection-model.js'

const nodes = [
  { id: 'role:one', label: 'An occupation', kind: 'role' },
  { id: 'role:life', label: 'Life role', kind: 'role', role_family: 'life' },
  { id: 'skill:one', label: 'One capability', label_nl: 'Een vaardigheid', kind: 'skill' },
  { id: 'unit:one', label: 'Inspect a requirement', kind: 'learning_unit' },
  { id: 'unit:before', label: 'Read a requirement', kind: 'learning_unit' },
  { id: 'unit:after', label: 'Write an acceptance condition', kind: 'learning_unit' },
  { id: 'skill:retired', label: 'Retired capability', kind: 'skill', source_status: 'obsolete' },
]
const edges = [
  { from: 'role:one', to: 'skill:one', type: 'esco_essential', validation: 'source_backed' },
  { from: 'role:life', to: 'skill:one', type: 'atlas_optional' },
  { from: 'skill:one', to: 'unit:one', type: 'decomposes_into' },
  { from: 'unit:before', to: 'unit:one', type: 'prerequisite_for' },
  { from: 'unit:one', to: 'unit:after', type: 'prerequisite_for' },
]

test('name search covers concepts and activities, with transparent link-count ranking', () => {
  const model = createInspectionModel(nodes, edges)
  assert.equal(model.search({ sort: 'links' }).items[0].id, 'unit:one')
  assert.equal(model.search({ query: 'vaardigheid' }).items[0].id, 'skill:one')
  assert.equal(model.search({ query: 'acceptance', kind: 'learning_unit' }).total, 1)
  assert.equal(model.search({ kind: 'role' }).total, 1, 'Atlas roles are separate from occupations')
  assert.equal(model.search({ kind: 'atlas' }).total, 1)
  assert.equal(model.search({ query: 'Retired' }).total, 0)
  assert.equal(model.search({ query: 'skill:retired' }).total, 1)
  assert.equal(model.metrics('unit:one').links, 3)
  assert.equal(model.metrics('unit:one').incoming, 2)
  assert.equal(model.metrics('unit:one').outgoing, 1)
  assert.equal(model.metrics('unit:one').activations, null, 'Unknown activations must not be reported as zero')
})

test('sorting and pagination reach every result without duplicates or mutation', () => {
  const model = createInspectionModel(nodes, edges)
  const all = model.search({ sort: 'name', pageSize: 2 }), ids = []
  for (let page = 1; page <= all.pages; page++) ids.push(...model.search({ sort: 'name', pageSize: 2, page }).items.map(n => n.id))
  assert.equal(new Set(ids).size, 6)
  assert.equal(model.search({ sort: 'name' }).items[0].label, 'An occupation')
  assert.equal(model.search({ sort: 'name-desc' }).items[0].label, 'Write an acceptance condition')
  assert.equal(model.search({ page: 999, pageSize: 2 }).page, 3)
  assert.deepEqual(model.search({ query: 'not present' }), { items: [], total: 0, page: 1, pages: 1, start: 0, end: 0 })
  assert.equal(nodes[0].id, 'role:one')
})

test('the local map is bounded and preserves incoming/outgoing meanings and provenance', () => {
  const model = createInspectionModel(nodes, edges)
  const local = model.neighbourhood('unit:one', 2)
  assert.equal(local.incoming.length + local.outgoing.length, 2)
  const rows = model.connections('unit:one')
  assert.equal(rows.find(row => row.node.id === 'unit:before').labels[0], 'Prerequisite')
  assert.equal(rows.find(row => row.node.id === 'unit:after').labels[0], 'Enables')
  assert.equal(rows.find(row => row.node.id === 'skill:one').labels[0], 'Part of')
  assert.equal(rows.find(row => row.node.id === 'skill:one').flowLabels[0], 'Contains', 'The map labels the source arrow, while the list labels the selected concept’s relation')
  const role = model.connections('role:one')[0]
  assert.equal(role.labels[0], 'Requires')
  assert.deepEqual(role.statuses, ['ESCO Essential'])
  assert.equal(model.connections('unit:one', { direction: 'in' }).length, 2)
  assert.equal(model.connections('unit:one', { query: 'acceptance' }).length, 1)
})

test('functional inspection separates prerequisites, context, outputs, and downstream use', () => {
  const model = createInspectionModel(nodes, edges)
  const detail = { ...nodes[3], definition: 'Given a short requirement, identify the observable result.', assessment: { method: 'Scenario exercise', criteria: ['Identifies the expected result', 'Flags ambiguity'] } }
  const activity = model.contract('unit:one', detail)
  assert.deepEqual(activity.inputs.map(item => item.node.id), ['unit:before'])
  assert.deepEqual(activity.context.map(item => item.node.id), ['skill:one'])
  assert.deepEqual(activity.supports.map(item => item.node.id), ['unit:after'])
  assert.equal(activity.criteria.length, 2)
  assert.equal(activity.assessmentMethod, 'Scenario exercise')
  assert.equal(activity.inputSpecification, '', 'Do not invent input fields from prose')
  const occupation = model.contract('role:one', nodes[0])
  assert.deepEqual(occupation.inputs.map(item => item.node.id), ['skill:one'])
  assert.deepEqual(occupation.criteria, [], 'Requirements are not function return values')
  assert.equal(model.contract('unit:one', null).loaded, false, 'Unloaded detail must remain distinguishable from missing detail')
  assert.equal(conceptType(nodes[1]), 'Life role')
  assert.equal(conceptType(nodes[3]), 'Learning activity')
})
