import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { venueId as venue } from '../scripts/profession-venue.mjs'
import { cashId as cash } from '../scripts/profession-cash.mjs'
import { usherId as usher } from '../scripts/profession-usher.mjs'

const dataset=await readDataset()
const nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='usher')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('usher covers nine essentials plus actual seat orientation, enquiries and security-alert work',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,9)
 assert.equal(route.skill_coverage.length,9)
 for(const key of ['visitor-service','ticket-sales','ticket-entry','seat-directions','programme-and-facilities','access-monitoring'])assert.ok(route.occupation_outcomes.includes(usher(key)))
 for(const phrase of ['authorized access','directions to their seats','alert security personnel'])assert.ok(route.occupation_facets.some(facet=>facet.source_fragment.includes(phrase)))
})

test('a paid sale cannot bypass actual denomination, balanced change, issue, validity or admission-state work',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [cash('value-unit'),cash('amount-check'),cash('change-balance'),cash('payment-record'),venue('ticket-offer'),venue('ticket-issue'),venue('ticket-validity'),venue('entry-record')]){
  assert.ok(route.steps.some(step=>step.id===id))
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)
 }
 const issue=nodes.get(venue('ticket-issue')),entry=nodes.get(venue('entry-record'))
 assert.match(issue.learning_design.understanding_check.materials,/print\/result mismatch/)
 assert.match(entry.learning_design.understanding_check.materials,/failed stored update/)
 assert.match(nodes.get(cash('value-unit')).learning_design.understanding_check.evidence_scope,/supplied-case result/)
 assert.match(nodes.get(cash('payment-record')).learning_design.understanding_check.evidence_scope,/Fictional currency, model objects/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===venue('ticket-issue')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
})

test('venue routes require actual directions, facility use and acknowledged or fallback alert evidence',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const id of [venue('usable-directions'),venue('facility-demonstration'),venue('security-observation'),venue('access-cycle')]){
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false)
 }
 assert.match(nodes.get(venue('usable-directions')).learning_design.input,/actual benign training venue/)
 assert.match(nodes.get(venue('facility-cycle')).learning_design.input,/actual benign training-accommodation/)
 assert.match(nodes.get(venue('security-observation')).learning_design.understanding_check.materials,/no-acknowledgement/)
 assert.match(nodes.get(venue('access-cycle')).learning_design.understanding_check.materials,/handover gap/)
 assert.match(nodes.get(venue('security-observation')).learning_design.understanding_check.evidence_scope,/No emergency-response, restraint/)
})

test('an omitted canonical cash requirement cannot be hidden by a valid-looking usher route',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 const payment=copy.steps.find(step=>step.id===cash('payment-record'))
 payment.requires=payment.requires.filter(id=>id!==cash('change-balance'))
 assert.equal(row(draft).complete,false)
 const intact=dataset.profession_pathways.routes.find(candidate=>nodes.get(candidate.occupation_id)?.label==='hotel concierge')
 assert.equal(auditProfessions(draft).rows.find(row=>row.id===intact.occupation_id).complete,true)
})
