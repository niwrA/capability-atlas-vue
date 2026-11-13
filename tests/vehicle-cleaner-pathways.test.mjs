import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { vehicleKnowledgeId as knowledge } from '../scripts/profession-vehicle-knowledge.mjs'
import { vehicleWorkControlId as work } from '../scripts/profession-vehicle-work-controls.mjs'
import { vehicleSurfaceId as surface } from '../scripts/profession-vehicle-surface-methods.mjs'
import { vehicleSpecialCareId as treatment } from '../scripts/profession-vehicle-special-care.mjs'
import { vehicleCleanerId as vehicle } from '../scripts/profession-vehicle-cleaner.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('vehicle cleaner')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(actualRoute,ids){const actual=actualRoute.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(actualRoute,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(actualRoute,actual,partial).complete,false,nodes.get(id).label)}}

test('vehicle cleaner covers all fifteen essentials and complete actual exterior/interior occupation work',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,15)
 cannotOmit(route,['brief','body-wash','glass-chrome','interior-work','engine-work','fabric-work','stock-workspace','working-instructions','customer-pickup','operating-interval'].map(vehicle))
})

test('rental class and full source control knowledge do not establish identical models, driving or functional readiness',()=>{
 cannotOmit(route,['vehicle-class-reference','vehicle-function-components','vehicle-type-cycle','control-reference','drive-control-functions','lighting-instrumentation','brake-control-functions','control-knowledge-cycle','cleaning-procedure-reference','vehicle-procedure-comparison','cleaning-procedure-cycle'].map(knowledge))
 assert.match(evidence(knowledge('vehicle-function-components')),/Shared class does not establish identical components or operating state/)
 assert.match(evidence(knowledge('brake-control-functions')),/does not establish all braking performance/)
 assert.match(evidence(knowledge('control-knowledge-cycle')),/not universal new-vehicle operation competence/)
 assert.match(evidence(knowledge('cleaning-procedure-cycle')),/not actual cleaning\/polishing performance/)
})

test('company stock profiles/locations and current instruction execution require true events and actual work',()=>{
 cannotOmit(route,['company-stock-reference','company-stock-records','company-stock-cycle','working-instruction-reference','interpret-work-instruction','working-instruction-cycle'].map(work))
 assert.match(evidence(work('company-stock-reference')),/does not establish actual correct location/)
 assert.match(evidence(work('company-stock-records')),/single actual movement is not recorded twice/)
 assert.match(evidence(work('working-instruction-reference')),/does not establish current applicability/)
 assert.match(evidence(work('working-instruction-cycle')),/Correct interpretation does not establish actual required performance/)
})

test('body washing, drying, wax and polish are separately required with complete intact-paint criteria',()=>{
 cannotOmit(route,['wash-reference','body-washing','body-drying','paint-waxing','paint-polishing','vehicle-wash-cycle'].map(surface))
 assert.match(evidence(surface('body-washing')),/does not override actual paint\/coating damage/)
 assert.match(evidence(surface('body-drying')),/does not establish every required final condition/)
 assert.match(evidence(surface('paint-polishing')),/does not establish intact accepted paint/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=surface('body-drying')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('window cleaner')).complete,true)
})

test('full glass/chrome source actions retain qualified material matrix and do not prescribe universal windscreen wax',()=>{
 cannotOmit(route,['exterior-reference','glass-chrome-cleaning','glass-chrome-polishing','glass-chrome-waxing','exterior-cycle'].map(surface))
 assert.match(design(surface('exterior-reference')).input,/glass-waxing\/polishing ambiguity requires current qualified target\/product confirmation/)
 assert.match(design(surface('glass-chrome-waxing')).input,/not.*universal windscreen instruction|rather than replaced by a universal windscreen instruction/)
 assert.match(evidence(surface('glass-chrome-waxing')),/does not establish supported safe target use or required result/)
 assert.match(evidence(surface('exterior-cycle')),/Washing does not complete the other required actual source actions/)
})

test('interior methods retain property authority and all console/dashboard/seat/carpet/hinge/trim stages',()=>{
 cannotOmit(route,['interior-reference','console-dashboard-cleaning','seat-carpet-vacuuming','hinge-trim-cleaning','interior-cycle'].map(surface))
 assert.match(evidence(surface('console-dashboard-cleaning')),/does not establish authority to discard customer property/)
 assert.match(evidence(surface('seat-carpet-vacuuming')),/carpet result does not establish seat performance/)
 assert.match(design(surface('hinge-trim-cleaning')).input,/No door removal, pinch-zone method, lubricant application or repair is inferred/)
})

test('engine and other mechanical-part cleaning require competent actual safe state and complete component/residue results',()=>{
 cannotOmit(route,['engine-reference','engine-clean-setup','engine-degreasing','engine-clean-cycle'].map(treatment))
 assert.match(evidence(treatment('engine-reference')),/Stopped appearance does not establish the required actual safe-access state/)
 assert.match(evidence(treatment('engine-degreasing')),/does not override actual component or residue failure/)
 assert.match(design(treatment('engine-degreasing')).task,/without claiming repair, safe energising or functional readiness/)
})

test('fabric reconditioning, preservatives and separate vinyl/leather revitalisers require every actual treatment result',()=>{
 cannotOmit(route,['fabric-reference','fabric-reconditioning','fabric-preservation','vinyl-revitaliser','leather-revitaliser','fabric-care-cycle'].map(treatment))
 assert.match(evidence(treatment('fabric-preservation')),/does not establish the required preservation\/material result/)
 assert.match(evidence(treatment('vinyl-revitaliser')),/does not override the actual required residue\/grip or finish failure/)
 assert.match(evidence(treatment('leather-revitaliser')),/Vinyl success does not approve actual leather\/coating use/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===treatment('fabric-preservation')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('furniture cleaner')).complete,true)
})

test('clean/orderly area and fully operational customer pickup need actual current state, identity and competent evidence',()=>{
 cannotOmit(route,['work-area-reference','work-area-order','work-area-cycle','pickup-reference','pickup-function-evidence','pickup-preparation','pickup-cycle'].map(work))
 assert.match(evidence(work('work-area-order')),/Cleaning does not release a held tool/)
 assert.match(evidence(work('pickup-reference')),/Cleanliness does not establish the missing actual operational condition/)
 assert.match(evidence(work('pickup-function-evidence')),/does not establish current actual vehicle functions/)
 assert.match(evidence(work('pickup-preparation')),/Vehicle readiness does not establish recipient authority/)
 assert.match(evidence(vehicle('customer-pickup')),/Cleaning does not override the actual failed readiness\/authority criterion/)
})

test('vehicle paint-method revisions invalidate dependent vehicle/source reviews without changing window cleaning',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===surface('paint-polishing')).learning_design.task+=' Recheck the actual current coating-preservation criterion.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/d283f0ad-aff5-4d08-9098-81151ec6c511';assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('window cleaner');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
