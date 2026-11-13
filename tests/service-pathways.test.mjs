import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { auditExploration } from '../src/foundation-model.js'
import { auditPilot, evaluatePilot } from '../src/pilot-model.js'
import { reconcileAuthoredRoutes } from '../scripts/reconcile-authored-routes.mjs'
import { serviceId } from '../scripts/profession-service.mjs'
import { distributionId } from '../scripts/profession-distribution.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const profession=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)

test('cloak-room and leaflet routes cover distinct occupational outcomes and every essential skill',()=>{
  const report=auditProfessions(dataset)
  for(const[label,count]of [['cloak room attendant',7],['leaflet distributor',6]]){
    const route=profession(label),row=report.rows.find(row=>row.id===route.occupation_id)
    assert.equal(row.complete,true)
    assert.equal(row.essentials,count)
    assert.ok(row.activities>=40)
  }
  const cloak=profession('cloak room attendant')
  assert.ok(cloak.occupation_facets.some(facet=>facet.source_fragment.includes('exchange tickets')))
  assert.ok(cloak.occupation_facets.some(facet=>facet.source_fragment.includes('requests and complaints')))
  const leaflet=profession('leaflet distributor')
  assert.ok(leaflet.occupation_facets.some(facet=>facet.source_fragment.includes('via mailboxes')))
  assert.ok(leaflet.occupation_facets.some(facet=>facet.source_fragment.includes('people on the streets')))
})

test('custody learning separates current token identity, verification and unresolved claims',()=>{
  const ticket=nodes.get(serviceId('unique-token')),claim=nodes.get(serviceId('claim-check')),hold=nodes.get(serviceId('claim-hold'))
  assert.match(ticket.learning_design.understanding_check.materials,/still open/)
  assert.match(claim.learning_design.input,/not a legal ownership test/)
  assert.ok(claim.learning_design.outputs.some(text=>text.includes('independent')))
  assert.ok(hold.learning_design.outputs.some(text=>text.includes('unresolved')))
  const route=profession('cloak room attendant'),actualNodes=route.steps.map(step=>nodes.get(step.id)),all=new Set(actualNodes.map(node=>node.id))
  all.delete(serviceId('claim-check'))
  assert.equal(evaluatePilot(route,actualNodes,all).complete,false)
})

test('weather scenarios require applicable reviewed controls rather than assumed universal climate tolerance',()=>{
  for(const key of ['condition-plan','heat-sun-plan','cold-wet-plan','wind-plan','field-conditions'])assert.ok(nodes.get(distributionId(key)))
  const field=nodes.get(distributionId('field-conditions'))
  assert.match(field.learning_design.understanding_check.evidence_scope,/physiological tolerance/)
  assert.match(field.learning_design.input,/never requires deliberately exposing/)
  assert.ok(field.supporting_sources.some(source=>source.url==='https://www.hse.gov.uk/temperature/employer/outdoor-working.htm'))
  const draft=structuredClone(dataset)
  draft.learning_units.find(node=>node.id===field.id).learning_design.dependency_basis=[]
  const report=auditProfessions(draft)
  assert.equal(report.rows.find(row=>row.id===profession('leaflet distributor').occupation_id).complete,false)
  assert.equal(report.rows.find(row=>row.id===profession('cloak room attendant').occupation_id).complete,true)
})

test('older comparison routes retain newly required canonical work and cannot bypass its evidence',()=>{
  assert.equal(auditExploration(dataset).valid,true)
  const draft=structuredClone(dataset),target=dataset.capabilities.find(node=>node.source==='ESCO'&&node.label==='maintain relationship with customers').id
  const route=draft.pathway_exploration.routes.find(route=>route.steps.some(step=>step.id===target))
  assert.ok(route)
  const extra='atlas:test:required-service-check'
  draft.learning_units.push({id:extra,kind:'learning_unit',label:'New actual service requirement',authoring_origin:'individual'})
  draft.decompositions.push({from:target,to:extra,type:'decomposes_into',completion_requirement:'required'},{from:draft.starting_foundations.entries[0].id,to:extra,type:'prerequisite_for'})
  assert.equal(auditPilot(draft,route).valid,false)
  reconcileAuthoredRoutes(draft)
  assert.equal(auditPilot(draft,route).valid,true)
  assert.deepEqual(route.steps.find(step=>step.id===extra).requires,[draft.starting_foundations.entries[0].id])
  const actualNodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>draft[key]).map(node=>[node.id,node]))
  const completed=new Set(route.steps.map(step=>step.id));completed.delete(extra)
  assert.equal(evaluatePilot(route,route.steps.map(step=>actualNodes.get(step.id)),completed).complete,false)
})
