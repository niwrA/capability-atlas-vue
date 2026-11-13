import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { specialistCleaningId as special } from '../scripts/profession-cleaning-specialist-foundations.mjs'
import { kitchenSupportId as kitchen } from '../scripts/profession-kitchen-support.mjs'
import { trainCleaningId as train } from '../scripts/profession-train-cleaning.mjs'
import { hospitalityCleaningId as context } from '../scripts/profession-hospitality-cleaning-profiles.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const kitchenRoute=routeFor('kitchen porter'),trainRoute=routeFor('train cleaner')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('kitchen porter and train cleaner cover thirteen/fifteen actual essentials and every occupation work outcome',()=>{
 const report=auditProfessions(dataset)
 for(const[route,count]of[[kitchenRoute,13],[trainRoute,15]]){const actual=report.rows.find(row=>row.id===route.occupation_id);assert.equal(actual.complete,true);assert.equal(actual.essentials,count)}
 cannotOmit(kitchenRoute,['brief','manual-washing','glass-machine','food-source','area-hygiene','receive-store','stock-rotation','hazard-report','team-service','handover','operating-interval'].map(key=>context('kitchen-porter',key)))
 cannotOmit(trainRoute,['brief','interior-job','public-hygiene','machine-floors','pressure-work','equipment-care','supply-stock','shift-work','operating-interval'].map(key=>context('train-cleaner',key)))
})

test('COSHH retains source substance breadth and real implemented controls rather than approval by familiar label',()=>{
 cannotOmit(kitchenRoute,['substance-reference','assessed-substance-controls','substance-procedure','coshh-cycle','environment-reference','environment-actions','environment-cycle'].map(special))
 assert.match(design(special('substance-reference')).input,/bacteria, allergen and waste oil/)
 assert.match(evidence(special('assessed-substance-controls')),/document does not establish an effective actual control/)
 assert.match(evidence(special('substance-procedure')),/earlier ready state is not reused/)
 assert.match(evidence(special('environment-reference')),/Hygiene success does not establish security/)
})

test('sanitary disinfection covers all surfaces and actual equipment classes, not appearance or a single bench',()=>{
 cannotOmit(kitchenRoute,['disinfection-reference','surface-disinfection-method','disinfection-cycle'].map(special))
 cannotOmit(kitchenRoute,['kitchen-area-reference','kitchen-clean-schedule','kitchen-area-cycle','kitchen-equipment-reference','kitchen-equipment-cycle'].map(kitchen))
 assert.match(evidence(special('disinfection-reference')),/Visual cleanliness does not establish disinfection/)
 assert.match(evidence(kitchen('kitchen-area-reference')),/do not establish storage cleanliness/)
 assert.match(evidence(kitchen('kitchen-clean-schedule')),/actual triggered taught action and recheck remain required/)
 assert.match(evidence(kitchen('kitchen-equipment-cycle')),/utensil result does not complete the missing equipment case/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===special('surface-disinfection-method')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,kitchenRoute).complete,false)
 assert.equal(row(draft,trainRoute).complete,false)
})

test('manual pots/pans washing, glass care and selected dishwasher performance remain separate actual methods',()=>{
 cannotOmit(kitchenRoute,['glassware-reference','glassware-washing','glassware-polishing','glassware-storage','glassware-cycle','dishwasher-reference','dishwasher-loading','dishwasher-operation','dishwasher-unload-check','dishwasher-cycle'].map(kitchen))
 assert.equal(design(context('kitchen-porter','manual-washing')).focus.mode,'introduce')
 assert.match(evidence(kitchen('dishwasher-loading')),/does not override required arrangement\/capacity/)
 assert.match(evidence(kitchen('dishwasher-operation')),/end light does not override the actual process failure/)
 assert.match(evidence(kitchen('dishwasher-unload-check')),/earlier load pass does not override the new article-state failure/)
 assert.match(evidence(kitchen('glassware-polishing')),/Shine does not establish the required hygienic result/)
})

test('kitchen supplies require acceptance, actual protected placement and eligible date rotation',()=>{
 cannotOmit(kitchenRoute,['rotation-reference','rotation-reposition','rotation-cycle'].map(kitchen))
 assert.match(evidence(context('kitchen-porter','receive-store')),/Arrival does not establish accepted ready supply/)
 assert.match(evidence(kitchen('rotation-reference')),/Earlier date does not make held stock eligible/)
 assert.match(evidence(kitchen('rotation-reposition')),/date list alone does not establish correct front placement/)
 assert.match(design(kitchen('rotation-reference')).input,/use-by\/best-before rules are not inferred/)
})

test('hazard receipt, team task completion and handover acknowledgement do not establish clearance or contentment/readiness',()=>{
 cannotOmit(kitchenRoute,['hazard-observation','hazard-notification','hazard-report-cycle'].map(special))
 cannotOmit(kitchenRoute,['hospitality-team-goal','hospitality-team-actions','hospitality-team-result','hospitality-team-cycle','kitchen-handover-reference','kitchen-close-check','kitchen-handover-cycle'].map(kitchen))
 assert.match(evidence(special('hazard-notification')),/draft is not credited as communicated risk/)
 assert.match(evidence(special('hazard-report-cycle')),/Acknowledgement is not repair or clearance/)
 assert.match(evidence(kitchen('hospitality-team-result')),/Internal completion does not establish guest contentment/)
 assert.match(evidence(kitchen('kitchen-handover-cycle')),/Acknowledgement does not establish the failed readiness condition/)
})

test('train pressure washing retains actual configuration, target controls, real operation and complete material/end state',()=>{
 cannotOmit(trainRoute,['pressure-reference','pressure-setup','pressure-operation','pressure-cycle'].map(train))
 assert.match(evidence(train('pressure-setup')),/Physical fit does not establish pressure-system compatibility/)
 assert.match(design(train('pressure-operation')).task,/No dry simulation or helper-only operation is credited/)
 assert.match(evidence(context('train-cleaner','pressure-work')),/approval does not cover the new target/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===trainRoute.id),missing=train('pressure-operation')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,trainRoute).complete,false)
 assert.equal(row(draft,kitchenRoute).complete,true)
})

test('all three actual floor-machine types and each extensive train textile method remain necessary',()=>{
 cannotOmit(trainRoute,['floor-machine-reference','rotary-operation','extractor-operation','walk-behind-operation','floor-machine-care','floor-machine-cycle','train-process-reference','train-procedure-cycle','train-interior-reference','train-dusting','train-upholstery-washing','train-carpet-washing','train-interior-cycle'].map(train))
 assert.match(evidence(train('floor-machine-cycle')),/Two passing machines do not complete the extractor requirement/)
 assert.match(evidence(train('train-carpet-washing')),/Vacuuming is not the required washing\/shampooing process/)
 assert.match(evidence(train('train-upholstery-washing')),/Clean appearance is not accepted upholstery readiness/)
 assert.match(evidence(train('train-procedure-cycle')),/does not override restricted actual access/)
})

test('rotating shifts preserve actual dates, acknowledged relief and represented night-training limits',()=>{
 cannotOmit(trainRoute,['shift-reference','shift-handover','shift-cycle'].map(special))
 assert.match(evidence(special('shift-reference')),/midnight boundary does not duplicate or omit responsibility/)
 assert.match(evidence(special('shift-handover')),/Sending alone is not the required acknowledged handover/)
 assert.match(design(context('train-cleaner','shift-work')).task,/separate represented night conditions from observed actual overnight work/)
 assert.match(evidence(special('public-area-cycle')),/Cleaning success does not complete the required disinfection/)
})

test('revised actual extractor operation invalidates dependent train/source reviews without changing kitchen or leaflet work',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===train('extractor-operation')).learning_design.task+=' Check the current selected textile and recovery criteria.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(trainRoute.occupation_id,'occupation_pathway'),after(trainRoute.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/2ed98048-bf2f-47e5-a0de-fd23d6abe2f6'
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 for(const label of ['kitchen porter','leaflet distributor']){const route=routeFor(label);assert.equal(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))}
})
