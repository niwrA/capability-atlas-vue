import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyCustomerRecords, customerRecordId as customer } from '../scripts/profession-customer-records.mjs'
import { applyWorkLiaison, workLiaisonId as liaison } from '../scripts/profession-work-liaison.mjs'
import { applyPostalOperations, postalOperationId as postal } from '../scripts/profession-postal-operations.mjs'
import { mailClerkId as clerk } from '../scripts/profession-mail-clerk.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyCustomerRecords(draft),...applyWorkLiaison(draft),...applyPostalOperations(draft)]
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id).label==='mail clerk')
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const row=(report,id)=>report.rows.find(row=>row.id===id)
const skill=key=>mappings.find(mapping=>mapping.key===key).skill_id
const changeNode=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})
const work=['brief','mail-service','sorting','item-traces','work-records','customer-records','staff-liaison','carrier-liaison','delivery-organisation','operating-interval']

test('all twelve new source branches have exact full source facets and whole-activity prerequisite closure',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[3,4,3,3,4,4,3,3,4,3,3,3])
 assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,40)
 for(const mapping of mappings){
  const source=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,source.definition)
  assert.equal(row(report,source.id).authored_complete,true,source.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===source.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 }
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...work.map(clerk)]){
  const node=nodes.get(id)
  assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
})

test('mail clerk retains all fifteen exact essentials and every full occupation-body facet',()=>{
 assert.ok(route)
 const actual=row(auditProfessions(dataset),route.occupation_id)
 assert.equal(actual.complete,true)
 assert.equal(actual.essentials,15)
 const expected=dataset.role_capability_assertions.filter(edge=>edge.from===route.occupation_id&&edge.type==='esco_essential').map(edge=>edge.to).sort()
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),expected)
 assert.equal(route.occupation_facets.length,5)
 for(const facet of route.occupation_facets)assert.ok(nodes.get(route.occupation_id).definition.includes(facet.source_fragment),facet.source_fragment)
})

test('none of the forty new required intermediates or ten occupational work steps can be bypassed by marked gates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...work.map(clerk)]){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('unexpected source rental evidence and actual goods/livestock negotiation cannot be silently omitted',()=>{
 for(const [id,key] of [[customer('rental-evidence'),'customerpersonaldata'],[liaison('carrier-negotiation'),'carrierliaison']]){
  const broken=changeNode(id,node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
  assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false,id)
 }
})

test('practice-only mail-chain reconstruction cannot satisfy source or profession even when all statuses are marked',()=>{
 const broken=changeNode(postal('mail-history-trace'),node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 const report=auditAllSkills(broken)
 assert.equal(row(report,skill('mailingsystems')).authored_complete,false)
 assert.equal(row(report,skill('dailypriorities')).authored_complete,true)
 assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false)
})

test('missing causal complete-condition or compromise rationale blocks the affected required source branch',()=>{
 for(const [id,parent,key] of [[postal('integrity-cycle'),postal('integrity-reference'),'mailintegrity'],[liaison('carrier-negotiation'),liaison('compromise-proposal'),'carrierliaison']]){
  const broken=changeNode(id,node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==parent)}}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
  assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false,id)
 }
})

test('source authoring preserves existing scaffold IDs, canonical first-to-cycle requirements and byte-stable repeated output',()=>{
 for(const mapping of mappings){
  const uuid=mapping.skill_id.split('/').at(-1)
  const first='atlas:esco-breakdown:'+uuid+':1',last='atlas:esco-breakdown:'+uuid+':2'
  assert.ok(mapping.activity_ids.includes(first));assert.ok(mapping.activity_ids.includes(last))
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===first&&edge.to===last&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyCustomerRecords(draft);applyWorkLiaison(draft);applyPostalOperations(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('actual mail-recipient trace revisions invalidate dependent mail review while unrelated CAD and data-entry review are stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const broken=changeNode(postal('mail-history-trace'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Check the newly required actual recipient-side custody evidence.'}}))
 const after=createReviewFingerprinter(broken)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 for(const label of ['footwear CAD patternmaker','data entry clerk']){const id=dataset.roles.find(node=>node.label===label).id;assert.equal(before(id,'occupation_pathway'),after(id,'occupation_pathway'))}
})
