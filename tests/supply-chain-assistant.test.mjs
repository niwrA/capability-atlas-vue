import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyManagerSupport,managerSupportId as manager} from '../scripts/profession-manager-support.mjs'
import {applyOfficeSoftwareKnowledge,officeSoftwareKnowledgeId as software} from '../scripts/profession-office-software-knowledge.mjs'
import {applySupplyChainKnowledge,supplyChainKnowledgeId as chain} from '../scripts/profession-supply-chain-knowledge.mjs'
import {applyFinancialNeeds,financialNeedsId as funds} from '../scripts/profession-financial-needs.mjs'
import {supplyChainAssistantId as support} from '../scripts/profession-supply-chain-assistant.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyManagerSupport(draft),...applyOfficeSoftwareKnowledge(draft),...applySupplyChainKnowledge(draft),...applyFinancialNeeds(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='supply chain assistant'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('manager support, five-family software, complete chain principles and financial needs have exact full source facets and intermediate closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,7,5,6])
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

test('supply chain assistant retains all nine exact essentials, all seven body clauses and thirteen complete work activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 assert.equal(route.skill_coverage.length,9);assert.equal(route.occupation_outcomes.length,13);assert.equal(route.occupation_facets.length,7)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('old marked source gates cannot bypass any new source intermediate or full actual chain-support work activity',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes]){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('acknowledged management requests, four software families or a goods-only resource sketch cannot replace full actual source work',()=>{
 const broken=changed([manager('support-action'),software('database-knowledge'),chain('operation-resources')],node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 for(const key of ['managersupport','officesoftware','supplychainprinciples'])assert.equal(row(report,source(key)).authored_complete,false,key)
 assert.equal(row(report,source('financialneeds')).authored_complete,true)
})

test('observed available funds, complete future costs, earliest time-phased gaps and changed forecasts stay independently required',()=>{
 for(const key of ['current-funds','future-resource-costs','time-phased-needs','forecast-revision']){
  const broken=changed([funds(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),source('financialneeds')).authored_complete,false,key)
 }
})

test('full source skills do not replace actual contract/PO preparation, invoice draft/issue, inventory reconciliation or channel/process results',()=>{
 for(const key of ['contract-reference','contract-drafting','purchase-order-preparation','invoice-draft','invoice-issue','inventory-reconciliation','distribution-communication','three-process-follow-up']){
  const broken=changed([support(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditProfessions(broken),role.id).complete,false,key)
 }
})

test('missing causal observed-funds-to-timed-estimate or correct-draft-to-issued-invoice rationale blocks completion',()=>{
 const missingFunds=changed([funds('time-phased-needs')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==funds('current-funds'))}}))
 assert.equal(row(auditAllSkills(missingFunds),source('financialneeds')).authored_complete,false)
 const missingDraft=changed([support('invoice-issue')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==support('invoice-draft'))}}))
 assert.equal(row(auditProfessions(missingDraft),role.id).complete,false)
})

test('new chain breakdown and retained scaffold IDs regenerate byte stably without altering official source or frozen route data',()=>{
 assert.equal(manager('support-reference'),'atlas:esco-breakdown:4bd6e2ad-bf69-4198-b3ac-3baabd9da46e:1')
 assert.equal(software('software-reference'),'atlas:esco-breakdown:cf310cff-0d28-4dbc-9dbb-cc500a3196c2:1')
 assert.equal(funds('fund-reference'),'atlas:esco-breakdown:dccbdbb8-7266-4fb4-a4cf-29056f102f12:1')
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyManagerSupport(draft);applyOfficeSoftwareKnowledge(draft);applySupplyChainKnowledge(draft);applyFinancialNeeds(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('actual invoice-issue revisions invalidate chain-support review while independent sales-support and postal contexts stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([support('invoice-issue')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the complete newly qualified current issued-invoice recipient result.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['sales support assistant','postman/postwoman']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
