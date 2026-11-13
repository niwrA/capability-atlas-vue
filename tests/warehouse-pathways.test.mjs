import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { auditAllSkills } from '../src/pathway-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { warehouseId as warehouse } from '../scripts/profession-warehouse.mjs'
import { productionId as production } from '../scripts/profession-production-planning.mjs'
import { leatherWarehouseId as leather } from '../scripts/profession-leather-warehouse.mjs'
import { coordinationId as coord } from '../scripts/profession-coordination.mjs'
import { butlerId as butler } from '../scripts/profession-hotel-butler.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods warehouse operator')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('leather warehouse covers nine essentials and actual classification, forecasting and departmental readiness',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,9)
 assert.equal(route.skill_coverage.length,9)
 for(const key of ['classify-register','material-requirements','timed-stock-cover','purchase-forecast','production-kits','warehouse-control','warehouse-system','production-control']){
  assert.ok(route.occupation_outcomes.includes(leather(key)),key)
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(leather(key))),key)
 }
 assert.ok(route.occupation_facets.some(facet=>facet.source_fragment==='forecast purchases'))
})

test('actual stock identity, eligibility, events, physical workflow and reconciliation cannot be bypassed',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['stock-position','available-stock','stock-movement','identified-handling','receiving','putaway','picking','dispatch','count-reconciliation']){
  const id=warehouse(key),partial=new Set(done);partial.delete(id)
  assert.ok(route.steps.some(step=>step.id===id),key)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===warehouse('identified-handling')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods manual operator').complete,true)
})

test('using a verified WMS does not require configuring it while layout implementation still does',()=>{
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===warehouse('wms-setup')).learning_design.scope='practice_sequence'
 const report=auditAllSkills(draft)
 assert.equal(report.rows.find(row=>row.id==='http://data.europa.eu/esco/skill/7c821387-b428-4f75-b5a7-7b038aa81cfd').authored_complete,true)
 assert.equal(report.rows.find(row=>row.id==='http://data.europa.eu/esco/skill/20f013ea-748a-40c3-82c6-f839b5175ba5').authored_complete,false)
 assert.equal(row(draft).complete,false)
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['wms-receive','wms-putaway','wms-pick','wms-ship','opening-balance','layout-implementation']){
  const partial=new Set(done);partial.delete(warehouse(key))
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
})

test('shared coordination is required in both production warehousing and housekeeping without importing hotel work into production',()=>{
 const hotel=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='hotel butler')
 for(const candidate of [route,hotel]){
  const actual=candidate.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
  for(const key of ['confirmed-assignment','capacity-plan','result-evidence','supported-feedback']){
   assert.ok(candidate.steps.some(step=>step.id===coord(key)),key)
   const partial=new Set(done);partial.delete(coord(key))
   assert.equal(evaluatePilot(candidate,actual,partial).complete,false,key)
  }
 }
 for(const key of ['housekeeping-assignment','housekeeping-capacity','interior-result','staff-feedback']){
  assert.equal(nodes.get(butler(key)).learning_design.focus.mode,'transfer')
  assert.equal(route.steps.some(step=>step.id===butler(key)),false)
 }
})

test('production phases, compatible metrics, cross-department work and actual correction checks remain required',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['production-brief','route-dependencies','resource-plan','production-schedule','department-handoff','productivity-reference','production-options','deviation-report','corrective-plan']){
  const id=production(key),partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='production')
 for(const fragment of ['optimise quality, productivity and safety','Collaborate with all linked departments','production, quality, productivity deviations','propose corrective measures'])assert.ok(mapping.facets.some(facet=>facet.source_fragment===fragment))
})

test('stock after the need date and a forecast alone cannot replace actual current material readiness',()=>{
 assert.match(nodes.get(leather('timed-stock-cover')).learning_design.input,/arrives after D/)
 assert.match(nodes.get(leather('purchase-forecast')).learning_design.understanding_check.evidence_scope,/supplied-case result/)
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['material-requirements','timed-stock-cover','purchase-forecast','production-kits']){
  const partial=new Set(done);partial.delete(leather(key))
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===leather('operating-interval')).requires=copy.steps.find(step=>step.id===leather('operating-interval')).requires.filter(id=>id!==leather('purchase-forecast'))
 assert.equal(row(draft).complete,false)
})
