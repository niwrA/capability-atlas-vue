import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { errandId as errand } from '../scripts/profession-errands.mjs'
import { butlerId as butler } from '../scripts/profession-hotel-butler.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='hotel butler')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('butler covers ten essentials plus staff management, clean interiors and actual guest follow-up',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,10)
 assert.equal(route.skill_coverage.length,10)
 for(const key of ['housekeeping-assignment','housekeeping-capacity','interior-result','staff-feedback','guest-welfare-followup']){
  assert.ok(route.occupation_outcomes.includes(butler(key)),key)
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(butler(key))),key)
 }
 assert.ok(route.occupation_facets.some(facet=>facet.source_fragment==='manage the housekeeping staff'))
})

test('delegated errands require scope, approved choice, actual purchase/collection and reconciled delivery',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['delegated-request','shopping-choice','purchase','dry-cleaning-collection','delivery-reconciliation']){
  const id=errand(key),partial=new Set(done);partial.delete(id)
  assert.ok(route.steps.some(step=>step.id===id),key)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='errands')
 for(const fragment of ['go shopping','pick up dry cleaning'])assert.ok(mapping.facets.some(facet=>facet.source_fragment===fragment))
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===errand('purchase')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='hotel concierge').complete,true)
})

test('staff acknowledgement, qualified capacity, actual interior evidence and supported feedback cannot be skipped',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['housekeeping-assignment','housekeeping-capacity','interior-result','staff-feedback']){
  const id=butler(key),partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===butler('operating-interval')).requires=copy.steps.find(step=>step.id===butler('operating-interval')).requires.filter(id=>id!==butler('interior-result'))
 assert.equal(row(draft).complete,false)
})

test('changed errand authority, actual goods and missing room evidence remain explicit counterexamples',()=>{
 assert.match(nodes.get(errand('delegated-request')).learning_design.understanding_check.materials,/twelve M.*ten M/)
 assert.match(nodes.get(errand('purchase')).learning_design.understanding_check.materials,/Q prop with receipt A\/R/)
 assert.match(nodes.get(errand('delivery-reconciliation')).learning_design.understanding_check.materials,/recipient-unavailable/)
 assert.match(nodes.get(butler('housekeeping-capacity')).learning_design.understanding_check.materials,/without that trained scope/)
 assert.match(nodes.get(butler('interior-result')).learning_design.understanding_check.materials,/pending required interior-condition evidence/)
 assert.match(nodes.get(butler('guest-welfare-followup')).learning_design.understanding_check.evidence_scope,/supplied-case result/)
})
