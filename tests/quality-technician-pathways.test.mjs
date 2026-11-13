import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { leatherQualityTechnicianId as leather } from '../scripts/profession-leather-quality-technician.mjs'
import { footwearQualityTechnicianId as footwear } from '../scripts/profession-footwear-quality-technician.mjs'
import { footwearTypeId as type } from '../scripts/profession-footwear-types.mjs'
import { materialResponseId as response } from '../scripts/profession-material-response.mjs'
import { measurementDataId as data } from '../scripts/profession-measurement-data.mjs'
import { laboratoryTestingId as lab } from '../scripts/profession-laboratory-testing.mjs'
import { footwearLaboratoryMethodId as method } from '../scripts/profession-footwear-laboratory-methods.mjs'
import { qualitySystemId as system } from '../scripts/profession-quality-systems.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const leatherRoute=routeFor('leather goods quality technician'),footwearRoute=routeFor('footwear quality technician')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('quality technicians cover their eleven/fourteen source sets and distinct laboratory versus standards-management outcomes',()=>{
 assert.equal(row(dataset,leatherRoute).complete,true);assert.equal(row(dataset,leatherRoute).essentials,11)
 assert.equal(row(dataset,footwearRoute).complete,true);assert.equal(row(dataset,footwearRoute).essentials,14)
 assert.equal(leatherRoute.occupation_facets.length,7);assert.equal(footwearRoute.occupation_facets.length,6)
 cannotOmit(leatherRoute,['material-test','component-test','finished-product-test','results-report','measures-improvement-feedback','operating-interval'].map(leather))
 cannotOmit(footwearRoute,['standards-register','source-system-control','results-report','corrective-advice','objectives-improvement-feedback','operating-interval'].map(footwear))
})

test('finished-product, used-material and component laboratory cases remain separate actual required performances',()=>{
 cannotOmit(leatherRoute,[lab('laboratory-performance'),leather('material-test'),leather('component-test'),leather('finished-product-test')])
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===leather('component-test')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,leatherRoute).complete,false)
 assert.equal(row(draft,footwearRoute).complete,true)
 assert.match(nodes.get(leather('results-report')).learning_design.understanding_check.expected_evidence.join(' '),/Finished-product evidence remains missing/)
})

test('shared loading, tearing and interface concepts are required before the practical methods using them',()=>{
 const required=['loading-response','tear-propagation','interface-separation'].map(response)
 cannotOmit(leatherRoute,required)
 const oldFootwearLab=routeFor('footwear quality control laboratory technician')
 cannotOmit(oldFootwearLab,required)
 for(const [operation,core] of [['tensile-method','loading-response'],['tear-method','tear-propagation'],['adhesion-method','interface-separation']]){
  assert.ok(nodes.get(method(operation)).learning_design.dependency_basis.some(input=>input.input_id===response(core)))
 }
 assert.match(nodes.get(response('interface-separation')).learning_design.understanding_check.expected_evidence.join(' '),/not called separated/)
})

test('supplied-result interpretation stays distinct from actually operating a laboratory programme',()=>{
 const ids=new Set(footwearRoute.steps.map(step=>step.id))
 assert.equal(ids.has(lab('laboratory-performance')),false)
 assert.equal(ids.has(method('programme-cycle')),false)
 assert.equal(ids.has(leather('material-test')),false)
 cannotOmit(footwearRoute,[data('arithmetic-mean'),data('normalised-quantity'),data('decision-rule')])
 cannotOmit(leatherRoute,[data('decision-rule'),lab('interpretation-rule')])
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===data('decision-rule')).learning_design.scope='practice_sequence'
 for(const route of [footwearRoute,leatherRoute,routeFor('leather goods quality control laboratory technician'),routeFor('footwear quality control laboratory technician')])assert.equal(row(draft,route).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leaflet distributor').complete,true)
})

test('footwear analysis retains type axes, actual part functions and current system-specific size correspondence',()=>{
 cannotOmit(footwearRoute,['type-axes','part-functions','size-context','chart-correspondence','types-cycle'].map(type))
 assert.match(nodes.get(type('type-axes')).learning_design.understanding_check.expected_evidence.join(' '),/axes remain distinct and can overlap/)
 assert.match(nodes.get(type('size-context')).learning_design.understanding_check.expected_evidence.join(' '),/source-system ambiguity remains unresolved/)
 assert.match(nodes.get(type('chart-correspondence')).learning_design.understanding_check.expected_evidence.join(' '),/No interpolation, neighbouring row or invented offset/)
 assert.match(nodes.get(type('chart-correspondence')).learning_design.input,/not universal UK\/EU conversion or fit promises/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===footwearRoute.id)
 copy.steps.find(step=>step.id===type('types-cycle')).requires=copy.steps.find(step=>step.id===type('types-cycle')).requires.filter(id=>id!==type('chart-correspondence'))
 assert.equal(row(draft,footwearRoute).complete,false)
})

test('actual implemented source controls, corrective/preventive effects and customer feedback cannot be replaced by a technical pass',()=>{
 for(const route of [leatherRoute,footwearRoute])cannotOmit(route,[system('quality-system-cycle'),system('quality-feedback'),system('effectiveness-monitor')])
 assert.match(nodes.get(leather('measures-improvement-feedback')).learning_design.understanding_check.expected_evidence.join(' '),/unmet customer requirement remains unresolved/)
 assert.match(nodes.get(footwear('objectives-improvement-feedback')).learning_design.understanding_check.expected_evidence.join(' '),/Customer satisfaction remains unknown/)
 assert.match(nodes.get(footwear('standards-register')).learning_design.understanding_check.expected_evidence.join(' '),/new actual required method remains a gap/)
})

test('neither a missing laboratory level nor an unlisted sizing prerequisite can be hidden by complete marked gates',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===leatherRoute.id)
 copy.steps.find(step=>step.id===leather('results-report')).requires=copy.steps.find(step=>step.id===leather('results-report')).requires.filter(id=>id!==leather('finished-product-test'))
 assert.equal(row(draft,leatherRoute).complete,false)
 const other=structuredClone(dataset)
 other.learning_units.find(node=>node.id===type('size-context')).learning_design.dependency_basis=[]
 assert.equal(row(other,footwearRoute).complete,false)
 assert.equal(row(other,leatherRoute).complete,true)
})

test('shared decision-rule revisions invalidate dependent reports while unrelated service reviews remain stable',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===data('decision-rule')).learning_design.task+=' Retain the actual changed declared decision basis.'
 const after=createReviewFingerprinter(draft)
 for(const route of [leatherRoute,footwearRoute,routeFor('footwear quality control laboratory technician')])assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const other=routeFor('leaflet distributor')
 assert.equal(before(other.occupation_id,'occupation_pathway'),after(other.occupation_id,'occupation_pathway'))
})
