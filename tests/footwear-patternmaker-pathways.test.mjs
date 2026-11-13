import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { footwearPatternmakerId as occupation } from '../scripts/profession-footwear-patternmakers.mjs'
import { footwearPatternId as pattern } from '../scripts/profession-footwear-patterns.mjs'
import { footwearCadId as cad } from '../scripts/profession-footwear-cad.mjs'
import { patternGradingId as grade } from '../scripts/profession-pattern-grading.mjs'
import { lastTypeId as last } from '../scripts/profession-last-types.mjs'
import { patternMachineId as machine } from '../scripts/profession-pattern-machinery.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const physical=routeFor('footwear patternmaker'),digital=routeFor('footwear CAD patternmaker')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('footwear patternmakers include all eleven/twelve essentials and complete source-described occupational work',()=>{
 const report=auditProfessions(dataset)
 for(const [route,kind,count] of [[physical,'',11],[digital,'cad-',12]]){
  const result=report.rows.find(row=>row.id===route.occupation_id);assert.equal(result.complete,true);assert.equal(result.essentials,count)
  cannotOmit(route,['design-brief','manual-patterns','cad-patterns','sample-approval','size-series','nesting-variants','consumption','drawing-handoff','teamwork','changed-job'].map(key=>occupation(kind,key)))
 }
 cannotOmit(physical,[occupation('','machine-features')])
})

test('manual last/shell/mean-form and complete upper/bottom methods stay required in both occupations',()=>{
 const ids=['surface-reference','surface-correspondence','shell-capture','mean-form','upper-patterns','bottom-patterns','pattern-cycle'].map(pattern)
 for(const route of [physical,digital])cannotOmit(route,ids)
 assert.match(nodes.get(pattern('surface-correspondence')).learning_design.understanding_check.expected_evidence.join(' '),/landmark swap/)
 assert.match(nodes.get(pattern('upper-patterns')).learning_design.understanding_check.expected_evidence.join(' '),/lining\/interface remains incomplete/)
 assert.match(nodes.get(pattern('bottom-patterns')).learning_design.understanding_check.expected_evidence.join(' '),/insole remains missing/)
 assert.match(nodes.get(pattern('pattern-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/new actual construction/)
})

test('grading has explicit directional point movement and edge-specific allowance foundations before pattern-series work',()=>{
 for(const route of [physical,digital])cannotOmit(route,['point-displacement','edge-allowance','grade-reference','graded-features'].map(grade))
 assert.match(nodes.get(grade('point-displacement')).learning_design.understanding_check.expected_evidence.join(' '),/\(9,5\)/)
 assert.match(nodes.get(grade('edge-allowance')).learning_design.understanding_check.expected_evidence.join(' '),/named edge/)
 assert.match(nodes.get(grade('grade-reference')).learning_design.understanding_check.expected_evidence.join(' '),/Interpolation or a copied percentage is not invented/)
 assert.match(nodes.get(grade('graded-features')).learning_design.understanding_check.expected_evidence.join(' '),/notch remains failed/)
})

test('actual accurate cuts, sample-driven corrections and current-base approval cannot be replaced by generated size labels',()=>{
 for(const [route,kind] of [[physical,''],[digital,'cad-']]){
  cannotOmit(route,[grade('accurate-cut'),grade('sampling-correction'),grade('grading-cycle'),occupation(kind,'sample-approval')])
  assert.ok(nodes.get(occupation(kind,'size-series')).learning_design.dependency_basis.some(input=>input.input_id===occupation(kind,'sample-approval')))
 }
 assert.match(nodes.get(grade('sampling-correction')).learning_design.understanding_check.expected_evidence.join(' '),/unverified pending/)
 assert.match(nodes.get(occupation('cad-','sample-approval')).learning_design.understanding_check.expected_evidence.join(' '),/Old approval does not release/)
})

test('all three source transfers, actual scanner/tablet capture, edits, grade, nesting and technical sheets remain distinct',()=>{
 for(const route of [physical,digital])cannotOmit(route,['design-reference','virtual-flatten','scanner-capture','tablet-capture','pattern-edit','cad-grade','cad-nesting','technical-sheet','cad-cycle'].map(cad))
 assert.match(nodes.get(cad('virtual-flatten')).learning_design.understanding_check.expected_evidence.join(' '),/does not override/)
 assert.match(nodes.get(cad('scanner-capture')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish actual model dimensions/)
 assert.match(nodes.get(cad('tablet-capture')).learning_design.understanding_check.expected_evidence.join(' '),/notch\/hole remains missing/)
 assert.match(nodes.get(cad('cad-grade')).learning_design.understanding_check.expected_evidence.join(' '),/fixed feature remains failed/)
 assert.match(nodes.get(cad('cad-nesting')).learning_design.understanding_check.expected_evidence.join(' '),/invalidates that complete-set yield/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===cad('tablet-capture')).learning_design.scope='practice_sequence'
 for(const route of [physical,digital])assert.equal(row(draft,route).complete,false)
})

test('last identity and placement support manual work while the CAD essential includes the complete type dossier',()=>{
 for(const route of [physical,digital])cannotOmit(route,['last-reference','last-classification','last-placement'].map(last))
 cannotOmit(digital,[last('last-cycle')])
 assert.equal(physical.steps.some(step=>step.id===last('last-cycle')),false)
 assert.match(nodes.get(last('last-reference')).learning_design.understanding_check.expected_evidence.join(' '),/Matching size alone does not clear/)
 assert.match(nodes.get(last('last-placement')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish actual supported placement/)
})

test('physical source machinery keeps every named real method without requiring it for CAD patternmaking',()=>{
 const ids=['fixed-drilling','milling','lathe','pattern-cutting','grinding','hand-drilling','machinery-cycle'].map(machine)
 cannotOmit(physical,ids)
 for(const id of ids)assert.equal(digital.steps.some(step=>step.id===id),false)
})

test('canonical CAD method omissions remain audit failures even if the route endpoint and gates are marked',()=>{
 const draft=structuredClone(dataset),route=draft.profession_pathways.routes.find(route=>route.id===digital.id),missing=cad('tablet-capture')
 for(const step of route.steps)step.requires=step.requires.filter(id=>id!==missing)
 route.steps=route.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,digital).complete,false)
 assert.equal(row(draft,physical).complete,true)
})

test('a revised actual grading rule invalidates both profession reviews and its skill review while distribution stays stable',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===grade('graded-features')).learning_design.task+=' Check the revised actual feature-specific grading rule.'
 const after=createReviewFingerprinter(draft)
 for(const route of [physical,digital])assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const skill='http://data.europa.eu/esco/skill/5a9a6d45-f4e5-437a-8f2d-2671061917ea'
 assert.notEqual(before(skill,'skill_breakdown'),after(skill,'skill_breakdown'))
 const unrelated=routeFor('leaflet distributor');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
