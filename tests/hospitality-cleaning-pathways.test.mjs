import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { linenServiceId as linen } from '../scripts/profession-linen-services.mjs'
import { roomCleaningId as room } from '../scripts/profession-room-cleaning.mjs'
import { toiletServiceId as toilet } from '../scripts/profession-toilet-services.mjs'
import { cleaningControlId as control } from '../scripts/profession-cleaning-controls.mjs'
import { cleaningSafetyKnowledgeId as safety } from '../scripts/profession-cleaning-safety-knowledge.mjs'
import { hospitalityCleaningId as context } from '../scripts/profession-hospitality-cleaning-profiles.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const linenRoute=routeFor('linen room attendant'),roomRoute=routeFor('room attendant'),toiletRoute=routeFor('toilet attendant')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('three room-service professions cover every seven/nine/twelve source essential and full occupation body',()=>{
 const report=auditProfessions(dataset)
 for(const[route,count]of[[linenRoute,7],[roomRoute,9],[toiletRoute,12]]){const actual=report.rows.find(row=>row.id===route.occupation_id);assert.equal(actual.complete,true);assert.equal(actual.essentials,count)}
 cannotOmit(linenRoute,['retrieve-wash','stock-operations','supply-control','guest-laundry','food-source','inventory-availability','operating-interval'].map(key=>context('linen-room-attendant',key)))
 cannotOmit(roomRoute,['brief','clean-job','make-bed','tidy-linen','restock-ready','company-controls','guest-service','food-source','operating-interval'].map(key=>context('room-attendant',key)))
 cannotOmit(toiletRoute,['brief','clean-fixtures','service-periods','maintenance-defects','supplies','customer-service','daily-reports','operating-interval'].map(key=>context('toilet-attendant',key)))
})

test('laundry alternatives, provider custody and ready linen are actual distinct requirements',()=>{
 cannotOmit(linenRoute,['laundry-intake','laundry-send','collection-cycle','washing-sort','hand-washing','machine-washing','washed-condition','washing-cycle','laundered-state','protected-linen-handling','linen-storage'].map(linen))
 assert.match(design(context('linen-room-attendant','retrieve-wash')).task,/no item is required to undergo both alternatives/)
 assert.match(evidence(context('linen-room-attendant','retrieve-wash')),/missing actual item receipt remains unresolved/)
 assert.match(evidence(context('linen-room-attendant','brief')),/not credited as that garment-care competence/)
 assert.match(evidence(context('room-attendant','make-bed')),/Earlier readiness does not override/)
})

test('linen operations retain every daily method and actual inventory identity without duplicate stock',()=>{
 cannotOmit(linenRoute,['linen-distribution','linen-rotation','linen-maintenance','linen-operation-cycle','linen-stock-cycle','guest-service-monitor','guest-return','guest-laundry-cycle'].map(linen))
 assert.match(evidence(context('linen-room-attendant','stock-operations')),/held old item remains excluded/)
 assert.match(evidence(context('linen-room-attendant','guest-laundry')),/mismatched return remains blocked/)
 assert.match(evidence(context('linen-room-attendant','inventory-availability')),/single issue is counted once/)
 assert.match(evidence(context('linen-room-attendant','operating-interval')),/old availability decision is not reused/)
})

test('cleaning supply orders do not establish arrival and refills require actual customer usability',()=>{
 cannotOmit(linenRoute,['supply-reference','supply-usage','supply-replenishment','supply-cycle'].map(linen))
 cannotOmit(toiletRoute,['supply-availability','supply-refill','restock-cycle'].map(toilet))
 assert.match(evidence(context('linen-room-attendant','supply-control')),/not counted as usable supply/)
 assert.match(evidence(context('toilet-attendant','supplies')),/not usable customer supply/)
 assert.match(evidence(context('room-attendant','restock-ready')),/does not establish usable approved supply/)
})

test('room source methods cannot collapse into a tidy appearance or a floor motion',()=>{
 cannotOmit(roomRoute,['glass-method','glass-cycle','furniture-polishing','hard-floor-scrubbing','waste-collection','waste-area-care','waste-cycle','working-area-clean','duties-cycle','room-cycle'].map(room))
 assert.match(evidence(room('hard-floor-scrubbing')),/does not override the required failed condition/)
 assert.match(evidence(context('room-attendant','clean-job')),/does not credit the omitted method/)
 assert.match(evidence(context('room-attendant','operating-interval')),/does not replace the directed public-area requirement/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===roomRoute.id),missing=room('hard-floor-scrubbing')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,roomRoute).complete,false)
 assert.equal(row(draft,linenRoute).complete,true)
})

test('hazardous chemical and CIP source scope stays explicit and real management cannot be skipped',()=>{
 cannotOmit(roomRoute,['chemical-reference','chemical-use','chemical-storage','chemical-disposal','chemical-management','chemical-cycle','company-reference','employee-activity-check','company-correction','company-cycle'].map(control))
 const source=nodes.get('http://data.europa.eu/esco/skill/51a26193-9abe-4bce-9108-f50835be1c35')
 assert.match(source.definition,/\(CIP\)/);assert.match(source.scope_notes.en.join(' '),/hazardous materials/)
 assert.match(JSON.stringify(design(control('chemical-reference'))),/CIP/)
 assert.match(evidence(context('room-attendant','company-controls')),/not credited as verified compliant performance/)
 assert.match(design(context('room-attendant','company-controls')).task,/actual assigned employee activities/)
})

test('PPE and sector knowledge do not establish actual protected performance or current legal compliance',()=>{
 cannotOmit(toiletRoute,['protection-purpose','protection-condition','task-protection-selection','ppe-cycle'].map(safety))
 cannotOmit(roomRoute,['requirement-register','source-types','task-applicability','hygiene-environment','regulations-cycle'].map(safety))
 cannotOmit(toiletRoute,['control-plan','implemented-prevention','incident-intervention','prevention-cycle'].map(control))
 assert.match(evidence(context('toilet-attendant','brief')),/rather than crediting a PPE knowledge answer/)
 assert.match(design(context('room-attendant','brief')).input,/fresh qualified applicability check/)
})

test('toilet work requires all service periods, actual correct-cubicle signing and explicit own hours/signature',()=>{
 cannotOmit(toiletRoute,['fixture-reference','toilet-method','sink-cubicle-method','fixture-details','fixture-cycle','fault-reference','out-of-order-sign','fault-cycle','report-reference','work-hours-signature','report-cycle'].map(toilet))
 assert.match(evidence(context('toilet-attendant','service-periods')),/earlier pass is not current cleaning evidence/)
 assert.match(evidence(context('toilet-attendant','maintenance-defects')),/actual affected cubicle receives/)
 assert.match(evidence(context('toilet-attendant','daily-reports')),/verified actual hours/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===context('toilet-attendant','service-periods')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,toiletRoute).complete,false)
 assert.equal(row(draft,linenRoute).complete,true)
})

test('actual cleaning method revisions invalidate dependent room/skill reviews without changing leaflet delivery',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===room('hard-floor-scrubbing')).learning_design.task+=' Check revised current floor compatibility.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(roomRoute.occupation_id,'occupation_pathway'),after(roomRoute.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/7bb01a18-4637-4535-ba18-258f48f705b8'
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('leaflet distributor');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
