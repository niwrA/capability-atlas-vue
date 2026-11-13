import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyWorkErgonomics, workErgonomicsId as ergonomics } from '../scripts/profession-work-ergonomics.mjs'
import { applyDomesticMethods, domesticMethodId as domestic } from '../scripts/profession-domestic-methods.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyWorkErgonomics(draft),...applyDomesticMethods(draft)]
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const change=(ids,fn)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?fn(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,id)=>report.rows.find(row=>row.id===id)

test('all five domestic source branches have exact full facets and complete individually authored activity closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,6,4,5,6])
 for(const mapping of mappings){
  const original=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,original.definition)
  assert.equal(row(report,original.id).authored_complete,true,original.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===original.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(original.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
  for(const id of mapping.activity_ids){
   const node=nodes.get(id)
   assert.equal(assessLearningDesign(node).status,'draft_ready',id)
   assert.equal(node.learning_design.scope,'activity');assert.equal(node.learning_design.effort.observed,false)
   const inputs=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from)
   assert.deepEqual(inputs.sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
   for(const input of inputs)assert.ok(nodes.has(input),input)
  }
 }
})

test('the older domestic comparison cannot bypass any new required actual method with an old marked source gate',()=>{
 const route=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id).label==='domestic cleaner')
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const mapping of mappings)for(const id of mapping.activity_ids){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  const progress=evaluatePilot(route,actual,partial)
  assert.equal(progress.steps.get(mapping.skill_id).done,false,id)
  assert.equal(progress.complete,false,id)
 }
})

test('missing actual mattress turning, garment washing, cooking-gear return, shaped finish or implemented ergonomics blocks the full source',()=>{
 const ids=[domestic('mattress-turn'),domestic('clothes-hand-method'),domestic('dish-return'),domestic('textile-shaping'),ergonomics('workplace-adjustment')]
 const broken=change(ids,node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 for(const mapping of mappings)assert.equal(row(report,mapping.skill_id).authored_complete,false,mapping.key)
})

test('full actual handling and shaping dependencies need their causal authoring rationale',()=>{
 const ids=[ergonomics('handling-interval'),domestic('iron-cycle')]
 const broken=change(ids,node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.slice(1)}})),report=auditAllSkills(broken)
 assert.equal(row(report,source('workergonomics')).authored_complete,false)
 assert.equal(row(report,source('ironing')).authored_complete,false)
})

test('reauthoring preserves old scaffold IDs and source data while moving old unrelated electrical attribution into history',()=>{
 for(const key of ['work-reference','work-cycle']){
  const node=nodes.get(ergonomics(key))
  assert.equal(node.learning_domain,'work_organisation')
  assert.equal(node.previous_authored_draft.learning_domain,'electrical')
  assert.ok(node.previous_authored_draft.supporting_sources.some(source=>source.url.includes('nen.nl')))
  assert.equal(node.supporting_sources.some(source=>source.url.includes('nen.nl')),false)
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyWorkErgonomics(draft);applyDomesticMethods(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('mattress-method revisions invalidate the full bed source and domestic context while unrelated postal review stays stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=change([domestic('mattress-turn')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the complete newly reviewed mattress orientation result.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('beds'),'skill_breakdown'),after(source('beds'),'skill_breakdown'))
 const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='domestic cleaner')
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 const postal=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='postman/postwoman')
 assert.equal(before(postal.id,'occupation_pathway'),after(postal.id,'occupation_pathway'))
})
