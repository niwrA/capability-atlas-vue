import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { packingId as packing } from '../scripts/profession-packing.mjs'
import { packagingEquipmentId as equipment } from '../scripts/profession-packaging-equipment.mjs'
import { warehouseOperationId as operation } from '../scripts/profession-warehouse-operations.mjs'
import { leatherPackingId as leather } from '../scripts/profession-leather-packing.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods packing operator')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('leather packing covers ten essentials and every described product/protection/order/document outcome',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,10)
 assert.equal(route.skill_coverage.length,10)
 for(const key of ['final-revision','accessories','textile-cover','paper-support','boxed-protection','order-parcels','carrier-documents','tool-methods','packing-source-work']){
  assert.ok(route.occupation_outcomes.includes(leather(key)),key)
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(leather(key))),key)
 }
 assert.ok(route.occupation_facets.some(facet=>facet.source_fragment==='textile sacs if applicable'))
})

test('actual separate hand-container and packaging-tool methods cannot be replaced by a sealed carton',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const id of [packing('manual-box'),packing('manual-bag'),packing('manual-other-container'),equipment('plastic-strapping'),equipment('adhesive-applicator'),equipment('tape-tool'),equipment('marking-labelling-tool')]){
  assert.ok(route.steps.some(step=>step.id===id),id)
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)
 }
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===equipment('plastic-strapping')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods warehouse operator').complete,true)
})

test('product shape, actual contact/protection, containment identity and carrier event remain separately required',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['contact-protection','shape-support','leather-purpose-plan','package-hierarchy','label-association','packaged-storage','expedition-record']){
  const id=packing(key),partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===leather('order-parcels')).requires=copy.steps.find(step=>step.id===leather('order-parcels')).requires.filter(id=>id!==packing('package-hierarchy'))
 assert.equal(row(draft).complete,false)
})

test('warehousing requires actual named operations and a documented selected mode rather than universal transport authority',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['sorting','carrying','warehouse-stack','transport-interface','loading','unloading']){
  const id=operation(key),partial=new Set(done);partial.delete(id)
  assert.ok(route.steps.some(step=>step.id===id),key)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='warehouseops')
 assert.ok(mapping.facets.some(facet=>facet.source_fragment==='vans, trucks, wagons, ships or aircrafts'))
 assert.match(nodes.get(operation('transport-interface')).learning_design.understanding_check.evidence_scope,/At least one actual job-applicable source alternative/)
 assert.match(nodes.get(operation('transport-interface')).learning_design.understanding_check.what_changes,/untaught rail\/ship\/air/)
 assert.ok(route.review_needed.some(note=>note.includes('actual trained interface must be documented')))
})

test('packing counterexamples keep a required cover, correct actual contents and uncompleted handoff visible',()=>{
 assert.match(nodes.get(leather('textile-cover')).learning_design.understanding_check.materials,/required-cover instruction/)
 assert.match(nodes.get(leather('order-parcels')).learning_design.understanding_check.materials,/A1\/A1\/B1/)
 assert.match(nodes.get(packing('expedition-record')).learning_design.understanding_check.materials,/parcels still staged/)
 assert.match(nodes.get(equipment('adhesive-applicator')).learning_design.understanding_check.materials,/missing required result evidence/)
 assert.match(nodes.get(packing('stack-plan')).learning_design.understanding_check.materials,/without the required separator/)
})
