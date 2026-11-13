import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyAccountManagement,accountManagementId as accounts} from '../scripts/profession-account-management.mjs'
import {applyFundraising,fundraisingId as fundraising} from '../scripts/profession-fundraising.mjs'
import {fundraisingAssistantId as assistant} from '../scripts/profession-fundraising-assistant.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyAccountManagement(draft),...applyFundraising(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='fundraising assistant'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('account supervision, full actual fundraising and all donor-contact actor classes retain exact source facets and every intermediate',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[8,7,4])
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

test('fundraising assistant has all seven exact essentials, all seven occupation clauses and thirteen complete work activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 assert.equal(route.skill_coverage.length,7);assert.equal(route.occupation_outcomes.length,13);assert.equal(route.occupation_facets.length,7)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('old marked gates cannot bypass any of the nineteen new source methods or thirteen actual charity-assistant outcomes',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes]){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('balanced totals or financial knowledge cannot replace full actual maintained documents, information, calculations and proper decisions',()=>{
 for(const key of ['financial-document-control','financial-information-check','financial-calculation-check','financial-decision-supervision','financial-correction-review']){
  const broken=changed([accounts(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),source('accountmanagement')).authored_complete,false,key)
 }
})

test('genuine event handoff, online recipient results and actual appropriate donor approaches remain separately required',()=>{
 const broken=changed([fundraising('event-custody-result'),fundraising('online-gift-result'),fundraising('donor-approach')],node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 assert.equal(row(report,source('fundraising')).authored_complete,false)
 assert.equal(row(report,source('donorcontact')).authored_complete,false)
 assert.equal(row(report,source('accountmanagement')).authored_complete,true)
 const practiceOnly=changed([fundraising('online-gift-result')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(row(auditAllSkills(practiceOnly),source('fundraising')).authored_complete,false)
})

test('full source skills do not replace actual survey administration/targeting, gift/grant processing, both filing systems or donor letters',()=>{
 for(const key of ['survey-application','survey-targeting','donation-processing','grant-payment-processing','fundraising-records','paper-electronic-filing','donation-acknowledgement','thank-you-letters']){
  const broken=changed([assistant(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditProfessions(broken),role.id).complete,false,key)
 }
})

test('missing causal current-decision-to-review and actual-donation-to-grant-processing rationale blocks completion',()=>{
 const missingDecision=changed([accounts('financial-correction-review')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==accounts('financial-decision-supervision'))}}))
 assert.equal(row(auditAllSkills(missingDecision),source('accountmanagement')).authored_complete,false)
 const missingDonation=changed([assistant('grant-payment-processing')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==assistant('donation-processing'))}}))
 assert.equal(row(auditProfessions(missingDonation),role.id).complete,false)
})

test('old account scaffold IDs and attribution history survive byte-stable authoring with unchanged official source and campaign data',()=>{
 assert.equal(accounts('account-reference'),'atlas:alu:manage-accounts-e2e15494-1')
 assert.equal(accounts('account-cycle'),'atlas:alu:manage-accounts-e2e15494-2')
 for(const key of ['account-reference','account-cycle']){
  const node=nodes.get(accounts(key))
  assert.equal(node.learning_domain,'finance')
  assert.ok(node.previous_authored_draft.supporting_sources.some(source=>source.url.includes('ifrs.org')))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyAccountManagement(draft);applyFundraising(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('actual online-fund result revisions invalidate fundraising source and profession reviews while independent chain/postal contexts stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([fundraising('online-gift-result')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify every complete newly qualified current genuine-gift/beneficiary result.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('fundraising'),'skill_breakdown'),after(source('fundraising'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['supply chain assistant','postman/postwoman']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
