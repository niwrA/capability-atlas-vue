import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { furnitureFoundationId as foundation } from '../scripts/profession-furniture-foundations.mjs'
import { furnitureMethodId as method } from '../scripts/profession-furniture-methods.mjs'
import { furnitureCleanerId as furniture } from '../scripts/profession-furniture-cleaner.mjs'
import { roomCleaningId as room } from '../scripts/profession-room-cleaning.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('furniture cleaner'),roomRoute=routeFor('room attendant')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(actualRoute,ids){const actual=actualRoute.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(actualRoute,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(actualRoute,actual,partial).complete,false,nodes.get(id).label)}}

test('furniture cleaner covers all thirteen source essentials and complete actual dust/polish/stain/colour work',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,13)
 cannotOmit(route,['brief','dust-work','clean-stains','polish-work','colour-reference','colour-maintenance','paint-preparation','advice-service','work-area','operating-interval'].map(furniture))
})

test('actual wood, construction, finish and product knowledge do not imply unsupported treatment',()=>{
 cannotOmit(route,['surface-reference','wood-reference','wood-characteristics','wood-cycle','product-reference','product-compatibility','product-cycle'].map(foundation))
 assert.match(evidence(foundation('surface-reference')),/Colour resemblance does not establish the same exposed material/)
 assert.match(evidence(foundation('wood-reference')),/does not establish solid-oak construction/)
 assert.match(evidence(foundation('wood-characteristics')),/Shared species does not establish identical current care compatibility/)
 assert.match(evidence(foundation('product-compatibility')),/hidden location does not excuse actual colour\/coating damage/)
})

test('industry knowledge retains all activities, actual dated company evidence and unknown origin limits',()=>{
 cannotOmit(route,['industry-reference','industry-companies','industry-cycle'].map(foundation))
 assert.match(design(foundation('industry-companies')).input,/2026-11-11/)
 assert.match(design(foundation('industry-companies')).input,/Inter IKEA Group/)
 assert.match(design(foundation('industry-companies')).input,/ercol/)
 assert.match(evidence(foundation('industry-reference')),/Selling does not establish manufacturing/)
 assert.match(evidence(foundation('industry-companies')),/does not establish every item origin/)
})

test('actual source dust tools and stain/soil methods retain collection and colour/finish preservation',()=>{
 cannotOmit(route,['dust-reference','dust-removal','dust-cycle','cleaning-reference','dirt-removal','stain-removal','furniture-clean-cycle','polish-reference','polish-cycle'].map(method))
 assert.match(evidence(method('cleaning-reference')),/Missing finish is not assumed to be removable dirt/)
 assert.match(evidence(method('dirt-removal')),/Soil removal does not excuse actual colour\/finish damage/)
 assert.match(evidence(method('stain-removal')),/Stain fading does not establish a preserved acceptable item/)
 assert.match(evidence(method('dust-removal')),/Redistributed dust does not establish/)
 assert.match(evidence(method('polish-reference')),/Added shine does not override/)
})

test('shared actual polishing depends on furniture material/finish rather than a whole-room assignment',()=>{
 cannotOmit(route,[foundation('surface-reference'),room('furniture-polishing')])
 cannotOmit(roomRoute,[foundation('surface-reference'),room('furniture-polishing'),room('room-reference')])
 const inputs=new Set(design(room('furniture-polishing')).dependency_basis.map(input=>input.input_id))
 assert.equal(inputs.has(foundation('surface-reference')),true)
 assert.equal(inputs.has(room('room-reference')),false)
 assert.equal(route.steps.some(step=>step.id===room('room-reference')),false)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=foundation('surface-reference')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,roomRoute).complete,true)
})

test('paint preparation requires standard/custom scope, every excluded part and actual surface/equipment readiness',()=>{
 cannotOmit(route,['paint-brief','paint-protection','paint-surface-setup','paint-equipment-setup','paint-preparation-cycle'].map(foundation))
 assert.match(evidence(foundation('paint-protection')),/Most covered parts do not complete the missing boundary/)
 assert.match(evidence(foundation('paint-surface-setup')),/Smooth appearance does not override/)
 assert.match(evidence(foundation('paint-equipment-setup')),/Arrangement does not establish compatible ready equipment/)
 assert.match(design(foundation('paint-equipment-setup')).task,/do not apply paint or claim spray-equipment competence/)
})

test('colour maintenance includes actual implemented compatible care/protection and proper comparison conditions',()=>{
 assert.equal(design(furniture('colour-reference')).focus.mode,'introduce')
 assert.equal(design(furniture('colour-maintenance')).focus.mode,'introduce')
 assert.match(evidence(furniture('colour-reference')),/Different viewing conditions alone do not establish actual material colour change/)
 assert.match(design(furniture('colour-maintenance')).task,/perform the actual selected colour-preserving protection\/care method/)
 assert.match(evidence(furniture('colour-maintenance')),/Completed care does not establish the missing actual protection\/result/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===furniture('colour-maintenance')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,roomRoute).complete,true)
})

test('advice requires actual material compatibility, understood scope and separate actual outcome evidence',()=>{
 cannotOmit(route,['advice-reference','advice-exchange','advice-cycle'].map(foundation))
 assert.match(evidence(foundation('advice-reference')),/not transferred to unknown fabric/)
 assert.match(evidence(foundation('advice-exchange')),/delivered explanation is not understood advice/)
 assert.match(evidence(foundation('advice-cycle')),/Understood advice is not observed client care performance/)
})

test('shared furniture-reference revisions invalidate dependent room/polish reviews while leaving linen work alone',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===foundation('surface-reference')).learning_design.task+=' Recheck the current finish identification.'
 const after=createReviewFingerprinter(draft)
 for(const actual of [route,roomRoute])assert.notEqual(before(actual.occupation_id,'occupation_pathway'),after(actual.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/e8a33a3f-5f1e-4148-a2f3-d8d3c9a3f36a';assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('linen room attendant');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
