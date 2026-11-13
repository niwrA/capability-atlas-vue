import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { machineCuttingId as machine } from '../scripts/profession-machine-cutting.mjs'
import { patternMachineId as pattern } from '../scripts/profession-pattern-machinery.mjs'
import { patternmakerId as maker } from '../scripts/profession-leather-patternmaker.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods patternmaker')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const cad=key=>'atlas:alu:profession-domain:leather-cad:'+key

test('physical patternmaking covers eight essential sources and all described work outcomes',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,8)
 assert.equal(route.skill_coverage.length,8)
 for(const key of ['design-brief','master-pattern','hand-cut-pattern','machine-features','physical-nesting','consumption-estimate','changed-job']){
  assert.ok(route.occupation_outcomes.includes(maker(key)),key)
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(maker(key))),key)
 }
})

test('automatic cutting needs actual software, material registration, faults, rules, path, execution and care evidence',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const key of ['pattern-library','material-registration','fault-regions','pattern-restrictions','toolpath-check','automatic-run','automatic-care','order-coverage']){
  const id=machine(key),partial=new Set(done);partial.delete(id)
  assert.ok(route.steps.some(step=>step.id===id),key)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===machine('automatic-run')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods CAD patternmaker').complete,true)
})

test('fixed drilling, milling, lathe, cutting, grinding and hand drilling remain separately required',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='patternmachinery')
 for(const[key,fragment]of [['fixed-drilling','drilling machines'],['milling','milling machines'],['lathe','lathe machines'],['pattern-cutting','cutting machines'],['grinding','grinding machines'],['hand-drilling','hand drills']]){
  assert.ok(mapping.facets.some(facet=>facet.source_fragment===fragment&&facet.activity_ids.includes(pattern(key))),key)
  const partial=new Set(done);partial.delete(pattern(key))
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===pattern('machinery-cycle')).requires=copy.steps.find(step=>step.id===pattern('machinery-cycle')).requires.filter(id=>id!==pattern('hand-drilling'))
 assert.equal(row(draft).complete,false)
})

test('die setup, physical output, classification and accepted-order quantities cannot be replaced by cycle count',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['die-selection','machine-settings','machine-cut','cut-classification','machine-care','order-coverage']){
  const id=machine(key),partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 assert.match(nodes.get(machine('order-coverage')).learning_design.input,/B\/rev3 rejected/)
 assert.match(nodes.get(machine('automatic-run')).learning_design.understanding_check.what_changes,/one actual required part is incomplete/)
 assert.match(nodes.get(machine('machine-settings')).learning_design.understanding_check.materials,/actual accepted S1/)
})

test('common consumption uses feasible layout without a CAD barrier while CAD occupation still requires actual CAD nesting',()=>{
 const inputs=nodes.get(cad('consumption')).learning_design.dependency_basis.map(item=>item.input_id)
 assert.ok(inputs.includes('atlas:alu:profession-domain:leather-cutting:nesting'))
 assert.equal(inputs.includes(cad('nesting-variants')),false)
 assert.equal(route.steps.some(step=>step.id===cad('nesting-variants')),false)
 const digitalRoute=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods CAD patternmaker')
 assert.ok(digitalRoute.occupation_outcomes.includes(cad('nesting-variants')))
 const actual=digitalRoute.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 done.delete(cad('nesting-variants'))
 assert.equal(evaluatePilot(digitalRoute,actual,done).complete,false)
 assert.match(nodes.get(maker('consumption-estimate')).learning_design.understanding_check.materials,/five sheets\/120 cm2/)
})

test('a revised physical machine-method lesson invalidates the dependent patternmaker review',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===pattern('hand-drilling')).learning_design.task+=' Check the changed actual approved support arrangement.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const digitalRoute=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods CAD patternmaker')
 assert.equal(before(digitalRoute.occupation_id,'occupation_pathway'),after(digitalRoute.occupation_id,'occupation_pathway'))
})
