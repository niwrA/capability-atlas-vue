import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyStaffManagement,staffManagementId as staff} from '../scripts/profession-staff-management.mjs'
import {applyManufacturingCoordination,manufacturingCoordinationId as manufacturing} from '../scripts/profession-manufacturing-coordination.mjs'
import {applyClothingControl,clothingControlId as clothing} from '../scripts/profession-clothing-control.mjs'
import {clothingOperationsManagerId as manager} from '../scripts/profession-clothing-operations-manager.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyStaffManagement(draft),...applyManufacturingCoordination(draft),...applyClothingControl(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='clothing operations manager'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('six full manufacturing/staff/apparel sources retain exact facets and 44 whole activities with complete causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[9,6,7,6,6,10]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,44)
 for(const mapping of mappings){
  const original=nodes.get(mapping.skill_id);assert.equal(mapping.source_definition,original.definition)
  assert.equal(row(report,original.id).authored_complete,true,original.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===original.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(original.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
  for(const id of mapping.activity_ids){
   const node=nodes.get(id);assert.equal(assessLearningDesign(node).status,'draft_ready',id)
   assert.equal(node.learning_design.scope,'activity');assert.equal(node.learning_design.effort.observed,false)
   const inputs=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from)
   assert.deepEqual(inputs.sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
   for(const input of inputs)assert.ok(nodes.has(input),input)
  }
 }
})

test('clothing operations manager requires seven exact released essentials, both occupation clauses and nine contextual whole activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,7);assert.equal(route.occupation_facets.length,2);assert.equal(route.occupation_outcomes.length,9)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any of the 53 new source or actual occupation intermediates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,53)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})

test('a rota cannot replace understood instructions, support, measured performance, improvement, group leadership or working relationships',()=>{
 for(const key of ['understood-instructions','motivation-direction','performance-evidence','improvement-feedback','group-leadership','working-relationships']){
  const broken=changed([staff(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('staffmanagement')).authored_complete,false,key)
 }
})

test('management attendance or plan issue cannot replace all-level/every-person meaning and accepted responsibility',()=>{
 const broken=changed(['plan-audience-responsibility','all-levels-sharing','production-responsibility-check'].map(manufacturing),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('productioncommunication')).authored_complete,false)
 const missingCoverage=changed([manufacturing('all-levels-sharing')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==manufacturing('plan-audience-responsibility'))}}))
 assert.equal(row(auditAllSkills(missingCoverage),source('productioncommunication')).authored_complete,false)
})

test('forecast savings or complete plans cannot replace actual process/resource adjustment, full coordination and all strategy suggestion purposes',()=>{
 const broken=changed(['complete-planning-review','cost-adjustment','actual-coordination','production-result-review','chain-planning-evidence','chain-alternatives','chain-recommendations','chain-review'].map(manufacturing),node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 assert.equal(row(report,source('manufacturingcoordination')).authored_complete,false)
 assert.equal(row(report,source('supplychainanalysis')).authored_complete,false)
})

test('a style drawing cannot replace actual full client demands, production specifications, current agreement and brief-change control',()=>{
 for(const key of ['client-demands','production-specification','brief-consistency','brief-change']){
  const broken=changed([clothing(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('clothingbriefs')).authored_complete,false,key)
 }
})

test('a good garment or green chart cannot replace complete process variation, rules, actual response and sustained controlled flow',()=>{
 for(const key of ['process-variation','process-product-distinction','control-data','control-chart','control-signals','control-response','controlled-flow','control-verification']){
  const broken=changed([clothing(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('apparelprocesscontrol')).authored_complete,false,key)
 }
 const practiceOnly=changed([clothing('controlled-flow')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(row(auditAllSkills(practiceOnly),source('apparelprocesscontrol')).authored_complete,false)
})

test('full source skills cannot replace actual order/delivery schedules, complete apparel control and observed system flow',()=>{
 for(const key of ['order-schedule','delivery-schedule','apparel-control','strategy-review','production-flow']){
  const broken=changed([manager(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)
 }
 const missingDependency=changed([manager('delivery-schedule')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==manager('order-schedule'))}}))
 assert.equal(row(auditProfessions(missingDependency),role.id).complete,false)
})

test('all twelve old scaffold IDs and first-to-second inputs survive stable authoring with unchanged official source and campaign data',()=>{
 const pairs=[[staff,'staff-reference','staff-cycle'],[manufacturing,'plan-reference','plan-communication-cycle'],[manufacturing,'manufacturing-reference','manufacturing-cycle'],[manufacturing,'chain-reference','chain-analysis-cycle'],[clothing,'brief-reference','brief-cycle'],[clothing,'control-reference','process-cycle']]
 for(const [factory,first,last] of pairs){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyStaffManagement(draft);applyManufacturingCoordination(draft);applyClothingControl(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('actual control-rule revisions invalidate apparel and clothing-operations reviews while independent engineering/funeral occupation reviews stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([clothing('control-signals')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck every newly qualified current process rule and complete actual ordered evidence.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('apparelprocesscontrol'),'skill_breakdown'),after(source('apparelprocesscontrol'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['engineering assistant','funeral attendant']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
