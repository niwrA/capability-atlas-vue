import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { auditExploration } from '../src/foundation-model.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { guestId as guest } from '../scripts/profession-guest-relations.mjs'
import { bookingId as booking } from '../scripts/profession-booking.mjs'
import { conciergeId as concierge } from '../scripts/profession-hotel-concierge.mjs'

const dataset=await readDataset()
const nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='hotel concierge')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('concierge proposal covers all nine essentials and every named occupational arrangement',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,9)
 assert.equal(route.skill_coverage.length,9)
 for(const key of ['restaurant-reservation','road-transport','air-transport','water-transport','event-tickets','travel-and-tours']){
  assert.ok(route.occupation_outcomes.includes(concierge(key)))
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(concierge(key))))
 }
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['restaurant-reservation','road-transport','air-transport','water-transport','event-tickets','travel-and-tours']){
  const partial=new Set(done);partial.delete(concierge(key))
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
})

test('booking requires approval, actual provider confirmation, correct documents and checked connections',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['occurrence','availability','terms','approval','execute','documents','amendment','connections']){
  assert.ok(route.steps.some(step=>step.id===booking(key)))
  const partial=new Set(done);partial.delete(booking(key))
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 assert.match(nodes.get(booking('execute')).learning_design.understanding_check.materials,/pending response/)
 assert.match(nodes.get(booking('documents')).learning_design.understanding_check.materials,/ticket pending/)
 assert.match(nodes.get(booking('connections')).learning_design.input,/common-reference timeline/)
 assert.match(nodes.get(booking('booking-cycle')).learning_design.input,/hotel-room booking and a plane-seat booking/)
 assert.match(nodes.get(booking('booking-cycle')).learning_design.understanding_check.evidence_scope,/offline training workflows/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===booking('execute')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
})

test('tourism breadth retains sourced culture, contextual customs and current-authority limits',()=>{
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='tourism')
 for(const fragment of ['historical and cultural locations and events','entertaining and informative manner','points of interest, events','local customs','foreign country regulations'])assert.ok(mapping.facets.some(facet=>facet.source_fragment===fragment))
 assert.match(nodes.get(guest('cultural-account')).learning_design.task,/Label any story as fiction/)
 assert.match(nodes.get(guest('custom-context')).learning_design.task,/everyone from a place/)
 assert.match(nodes.get(guest('regulation-source')).learning_design.input,/No actual immigration/)
 assert.match(nodes.get(guest('regulation-source')).learning_design.understanding_check.evidence_scope,/not legal advice/)
 assert.match(nodes.get(concierge('tourism-information')).learning_design.understanding_check.materials,/cancellation/)
})

test('check-in, complaints and customer relationships require actual results rather than presumed completion',()=>{
 for(const key of ['need-question','need-constraints','complaint-record','recovery-choice','recovery-check','arrival-record','checkin-status','accommodation-orientation','relationship-advice','service-followthrough','after-service'])assert.equal(nodes.get(guest(key)).learning_design.focus.mode,'introduce',key)
 assert.match(nodes.get(guest('checkin-status')).learning_design.understanding_check.materials,/failed training save/)
 assert.match(nodes.get(guest('accommodation-orientation')).learning_design.input,/real permitted benign route/)
 assert.match(nodes.get(guest('recovery-check')).learning_design.understanding_check.materials,/unresolved-customer response/)
 assert.match(nodes.get(guest('after-service')).learning_design.understanding_check.materials,/withdrawal/)
 assert.match(nodes.get(guest('relationship-cycle')).learning_design.understanding_check.evidence_scope,/actual longitudinal evidence/)
})

test('new customer-relationship requirements stay required in the original shop-assistant route',()=>{
 assert.equal(auditExploration(dataset).valid,true)
 const old=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id)?.label==='shop assistant')
 const skill='http://data.europa.eu/esco/skill/2239694b-771a-4586-8b54-2794e361a9ae'
 const canonical=dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===skill&&edge.completion_requirement!=='optional').map(edge=>edge.to)
 for(const id of canonical)assert.ok(old.steps.find(step=>step.id===skill).requires.includes(id),id)
 const actual=old.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['need-question','recovery-check','after-service','relationship-cycle']){
  const partial=new Set(done);partial.delete(guest(key))
  assert.equal(evaluatePilot(old,actual,partial).complete,false,key)
 }
})
