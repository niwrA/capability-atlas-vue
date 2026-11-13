import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyPromotionKnowledge,promotionKnowledgeId as knowledge} from '../scripts/profession-promotion-knowledge.mjs'
import {applyPromotionMethods,promotionMethodsId as method} from '../scripts/profession-promotion-methods.mjs'
import {promotionAssistantId as assistant} from '../scripts/profession-promotion-assistant.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyPromotionKnowledge(draft),...applyPromotionMethods(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='promotion assistant'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('all four full promotion sources retain exact facets, all 26 required whole intermediates and causal input accounts',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[6,6,7,7])
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

test('promotion assistant requires all eight exact essentials and all three complete occupation clauses across ten actual work outcomes',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 assert.equal(role.source_status,'released');assert.equal(route.skill_coverage.length,8)
 assert.equal(route.occupation_outcomes.length,10);assert.equal(route.occupation_facets.length,3)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('previous marked gates cannot bypass any new knowledge/method activity or actual contextual outcome',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes]){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('courtesy or a fluent greeting cannot replace full listening, rapport, register and intervention knowledge',()=>{
 const broken=changed(['active-listening','rapport','register','respected-interventions'].map(knowledge),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('communicationprinciples')).authored_complete,false)
 const practiceOnly=changed([knowledge('communication-cycle')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(row(auditAllSkills(practiceOnly),source('communicationprinciples')).authored_complete,false)
})

test('advertising strategy knowledge needs distinct media, full claim meaning and audience fit rather than a good-looking poster',()=>{
 const broken=changed(['advertising-strategies','advertising-claim-meaning','advertising-media','advertising-fit'].map(knowledge),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('advertisingtechniques')).authored_complete,false)
})

test('a campaign plan cannot replace actual advertiser contacts, usable briefings, confirmed meetings, suppliers or prepared coordination results',()=>{
 const broken=changed(['advertiser-contact','campaign-briefing','campaign-meetings','campaign-suppliers','campaign-action-results','promotion-schedule','promotion-content','promotion-delegation','promotion-information','promotion-materials'].map(method),node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 assert.equal(row(report,source('campaignsupport')).authored_complete,false)
 assert.equal(row(report,source('promotionalcoordination')).authored_complete,false)
})

test('full shared skills do not replace actual manager decision, conditional obtaining/receipt or released point-of-sale implementation',()=>{
 const broken=changed(['decision-information','manager-decision','resource-request','resource-receipt','point-of-sale-setup','point-of-sale-work','records-handover'].map(assistant),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditProfessions(broken),role.id).complete,false)
 const missingRationale=changed([assistant('resource-request')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==assistant('manager-decision'))}}))
 assert.equal(row(auditProfessions(missingRationale),role.id).complete,false)
 const missingPeople=changed([method('promotion-information')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==method('promotion-delegation'))}}))
 assert.equal(row(auditAllSkills(missingPeople),source('promotionalcoordination')).authored_complete,false)
})

test('all six earlier scaffold IDs and history survive byte-stable authoring with unchanged official sources and campaign state',()=>{
 for(const [factory,first,last] of [[knowledge,'communication-reference','communication-cycle'],[knowledge,'advertising-reference','advertising-cycle'],[method,'campaign-reference','campaign-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyPromotionKnowledge(draft);applyPromotionMethods(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('actual prepared-material revisions invalidate coordination and promotion review while completed independent financial/postal occupations stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([method('promotion-materials')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify every complete newly qualified current material-output requirement.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('promotionalcoordination'),'skill_breakdown'),after(source('promotionalcoordination'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['fundraising assistant','postman/postwoman']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
