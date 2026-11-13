import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyRetailMerchandise, retailMerchandiseId as merchandise } from '../scripts/profession-retail-merchandise.mjs'
import { shelfFillerId as shelf } from '../scripts/profession-shelf-filler.mjs'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot,auditPilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=applyRetailMerchandise(draft)
const roleId='http://data.europa.eu/esco/occupation/d35f9e79-5778-43b4-8667-0e3ba1fcb19a'
const row=(report,id)=>report.rows.find(row=>row.id===id)
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})

test('all three remaining merchandise sources retain exact complete scope and every actual intermediate input',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,3,4])
 for(const mapping of mappings){
  const source=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,source.definition)
  assert.equal(row(report,source.id).authored_complete,true,source.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===source.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
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

test('canonical pilot reference IDs survive and marked old gates cannot bypass any new required merchandise method',()=>{
 assert.equal(merchandise('label-reference'),'atlas:alu:pilot:shelf-filler:work-119fe928-401d-4254-9273-dd1c171fe84e')
 assert.equal(merchandise('price-reference'),'atlas:alu:pilot:shelf-filler:work-a5e51fb1-b3b6-49fd-8deb-f96c4d46da81')
 const route=dataset.pilot_pathway,actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(auditPilot(dataset).valid,true)
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const mapping of mappings)for(const id of mapping.activity_ids){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  const progress=evaluatePilot(route,actual,partial)
  assert.equal(progress.steps.get(mapping.skill_id).done,false,id)
  assert.equal(progress.complete,false,id)
 }
})

test('missing actual notation, installation or full advertised-function methods blocks each affected source',()=>{
 const broken=changed([merchandise('price-notation'),merchandise('label-change-action'),merchandise('advertised-function-inspection')],node=>({...node,learning_design:undefined}))
 const report=auditAllSkills(broken)
 for(const mapping of mappings)assert.equal(row(report,mapping.skill_id).authored_complete,false,mapping.key)
 const missingReason=changed([merchandise('merchandise-cycle')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==merchandise('advertised-function-inspection'))}}))
 assert.equal(row(auditAllSkills(missingReason),mappings.find(mapping=>mapping.key==='merchandise').skill_id).authored_complete,false)
})

test('shelf filler contains all eight exact essentials and every occupation clause, with no required body method skippable',()=>{
 const report=auditProfessions(dataset),result=row(report,roleId)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 const route=dataset.profession_pathways.routes.find(route=>route.occupation_id===roleId)
 const source=nodes.get(roleId),actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(route.skill_coverage.length,8)
 const essentials=dataset.role_capability_assertions.filter(edge=>edge.from===roleId&&edge.type==='esco_essential').map(edge=>edge.to).sort()
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),essentials)
 for(const facet of route.occupation_facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const key of ['date-order','expired-removal','rotation-rule','actual-rotation','stock-merchandise-work','after-hours-cleaning','customer-location','next-day-readiness','operating-interval']){
  const id=shelf(key),node=nodes.get(id),partial=new Set(done)
  assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
 const noCleaning=changed([shelf('after-hours-cleaning')],node=>({...node,learning_design:undefined}))
 assert.equal(row(auditProfessions(noCleaning),roleId).complete,false)
})

test('reapplying merchandise authoring is byte stable and preserves official source and existing route data',()=>{
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyRetailMerchandise(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('advertised-function revisions invalidate dependent merchandise and shelf-filler reviews while unrelated postal review stays stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const revised=changed([merchandise('advertised-function-inspection')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the full newly approved current advertised mode.'}}))
 const after=createReviewFingerprinter(revised),source=mappings.find(mapping=>mapping.key==='merchandise').skill_id
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 assert.notEqual(before(roleId,'occupation_pathway'),after(roleId,'occupation_pathway'))
 const postal=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='postman/postwoman')
 assert.equal(before(postal.id,'occupation_pathway'),after(postal.id,'occupation_pathway'))
})
