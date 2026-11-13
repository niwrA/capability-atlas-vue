import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { buildingSiteId as site } from '../scripts/profession-building-site-controls.mjs'
import { buildingAssessmentId as assess } from '../scripts/profession-building-assessment.mjs'
import { buildingExteriorMethodId as method } from '../scripts/profession-building-exterior-methods.mjs'
import { buildingExteriorCleanerId as exterior } from '../scripts/profession-building-exterior-cleaner.mjs'
import { windowMethodId as window } from '../scripts/profession-window-methods.mjs'
import { trainCleaningId as train } from '../scripts/profession-train-cleaning.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('building exterior cleaner')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('building exterior cleaner covers all twelve essentials and actual restoration/compliance/condition outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,12)
 cannotOmit(['brief','site-controls','assess-remove','facade-litter','floors','spray-washer','restore','compliance-condition','operating-interval'].map(exterior))
 assert.match(evidence(exterior('compliance-condition')),/signed plan or earlier pass does not establish current actual compliance/)
})

test('actual site boundaries, access and continuous protection cannot be replaced by equipment presence',()=>{
 cannotOmit(['site-reference','site-control-actions','secure-site-cycle','ppe-use-reference','ppe-consistent-use','ppe-use-cycle'].map(site))
 assert.match(evidence(site('site-control-actions')),/Placement does not establish.*effective protection/)
 assert.match(evidence(site('secure-site-cycle')),/earlier pass is not current verified site control/)
 assert.match(evidence(exterior('site-controls')),/Item presence does not establish effective current protection/)
})

test('material separation requires actual contact/movement methods rather than labels or presumed clean state',()=>{
 cannotOmit(['surface-reference','separation-reference','separation-actions','separation-cycle'].map(site))
 assert.match(design(site('separation-actions')).task,/do not restore clean status by relabelling/)
 assert.match(evidence(site('surface-reference')),/Appearance does not establish identical material or compatible treatment/)
})

test('contamination evidence, understood advice and actual chemical/solvent removal remain distinct required actions',()=>{
 cannotOmit(['contamination-evidence','decontamination-advice','contamination-assessment-cycle','removal-reference','chemical-contaminant-removal','solvent-contaminant-removal','contaminant-removal-cycle'].map(assess))
 assert.match(evidence(exterior('assess-remove')),/Advice does not establish actual performed removal/)
 assert.match(design(assess('contaminant-removal-cycle')).input,/chemical.*solvent|solvent.*chemical/i)
})

test('damage monitoring and treatment assessment retain full current region evidence without claiming performed repair',()=>{
 cannotOmit(['damage-reference','damage-monitoring','damage-treatment-assessment','building-damage-cycle'].map(assess))
 assert.match(evidence(assess('building-damage-cycle')),/proposed remedy does not establish actual restored proper condition/)
 assert.match(design(assess('damage-monitoring')).input,/region|viewpoint/i)
})

test('all four named actual spray actions and current optimal-pattern evidence are separately required',()=>{
 cannotOmit(['spray-reference','spray-angle','spray-distance','spray-trigger','spray-overlap','spray-cycle'].map(method))
 assert.match(evidence(method('spray-angle')),/earlier gun direction no longer establishes/)
 assert.match(evidence(method('spray-distance')),/unchanged arm position does not establish/)
 assert.match(evidence(method('spray-trigger')),/Wetness does not establish.*gradual trigger/)
 assert.match(evidence(method('spray-overlap')),/Some overlap does not establish complete/)
 assert.match(evidence(method('spray-cycle')),/final-looking pass does not establish every actual source technique/)
})

test('facade route retains actual intricate ground and elevated facade equipment methods without requiring ladder operation',()=>{
 cannotOmit(['facade-reference','facade-hand-method','facade-cycle'].map(method).concat(window('pole-cycle')))
 assert.match(evidence(method('facade-cycle')),/Ground work does not complete the required actual elevated case/)
 assert.match(design(method('facade-reference')).input,/ground-operated taught pole system/)
 assert.equal(route.steps.some(step=>step.id==='atlas:alu:profession-domain:window-access:ladder-operation'),false)
})

test('pressure-washer route requires actual mechanical operation and all contaminant classes while preserving surrogate scope',()=>{
 cannotOmit(['washer-reference','washer-target-method','washer-cycle'].map(method).concat(train('pressure-cycle')))
 assert.match(design(method('washer-reference')).input,/contamination, paint residue, dirt\/grime and mould/)
 assert.match(evidence(method('washer-target-method')),/Removal does not override actual material damage/)
 assert.match(evidence(method('washer-cycle')),/Missing real field classification\/remediation remains unverified/)
})

test('restoration includes taught preparation and actual compatible repair with full final-condition checks',()=>{
 cannotOmit(['restoration-reference','restoration-preparation','restoration-method'].map(method))
 assert.match(evidence(method('restoration-reference')),/Cosmetic similarity does not establish/)
 assert.match(evidence(method('restoration-preparation')),/Clean appearance does not establish.*prepared state/)
 assert.match(evidence(method('restoration-method')),/Applied repair does not establish.*restored condition/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===method('restoration-method')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('vehicle cleaner')).complete,true)
})

test('canonical actual spray input cannot be deleted from the profession route even when every remaining gate is marked',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=method('spray-trigger')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('vehicle cleaner')).complete,true)
})

test('exterior restoration revisions invalidate dependent occupation reviews without changing vehicle work',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===method('restoration-method')).learning_design.task+=' Recheck the actual compatible restored-finish result.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const unrelated=routeFor('vehicle cleaner');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
