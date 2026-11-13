import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyDignityCare,dignityCareId as dignity} from '../scripts/profession-dignity-care.mjs'
import {applyFuneralMethods,funeralMethodsId as method} from '../scripts/profession-funeral-methods.mjs'
import {funeralAttendantId as attendant} from '../scripts/profession-funeral-attendant.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyDignityCare(draft),...applyFuneralMethods(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='funeral attendant'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('five complete funeral/dignity sources preserve literal facets and all 32 whole methods with causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,9,5,7,7])
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

test('funeral attendant requires all eight exact released essentials, five occupation clauses and eight contextual whole outcomes',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,8);assert.equal(route.occupation_facets.length,5);assert.equal(route.occupation_outcomes.length,8)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('earlier marked gates cannot bypass any of the forty new full-source or occupation activities',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,40)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})

test('tidy appearance and polite speech cannot replace actual maintained hygiene, diplomacy or any full healthcare-rights clause',()=>{
 const ids=[dignity('hygiene-actions'),dignity('tidy-appearance'),dignity('sensitive-listening'),dignity('tactful-response'),dignity('sensitive-disagreement'),dignity('individual-needs-choice'),dignity('diversity-respect'),dignity('ethical-code-application'),dignity('healthcare-ethical-support'),dignity('privacy-actions'),dignity('healthcare-confidentiality'),dignity('rights-promotion')]
 const broken=changed(ids,node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 for(const key of ['hygienestandards','humanrights','diplomacy'])assert.equal(row(report,source(key)).authored_complete,false,key)
 const healthcareOmitted=changed([dignity('healthcare-ethical-support'),dignity('healthcare-confidentiality')],node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(healthcareOmitted),source('humanrights')).authored_complete,false)
})

test('rehearsed or provider-only work cannot replace full personally assigned lift, carry and both chapel/cemetery placement methods',()=>{
 const broken=changed(['transfer-team-readiness','coordinated-lift-setdown','coordinated-carry','chapel-placement','cemetery-placement'].map(method),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('coffintransfer')).authored_complete,false)
 const practiceOnly=changed([method('cemetery-placement')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(row(auditAllSkills(practiceOnly),source('coffintransfer')).authored_complete,false)
})

test('stock counts or storage entries cannot replace actual qualified equipment eligibility, issue, return, storage and management',()=>{
 const broken=changed(['equipment-condition','equipment-issue','equipment-return','equipment-storage','equipment-management'].map(method),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('funeralequipment')).authored_complete,false)
 const causalGap=changed([method('equipment-issue')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==method('equipment-condition'))}}))
 assert.equal(row(auditAllSkills(causalGap),source('funeralequipment')).authored_complete,false)
})

test('full source skills cannot replace every actual floral offering, mourner direction or complete post-funeral equipment outcome',()=>{
 for(const key of ['service-transfer','floral-reference','floral-handling','mourner-service','post-service-equipment']){
  const broken=changed([attendant(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditProfessions(broken),role.id).complete,false,key)
 }
 const causalGap=changed([attendant('floral-handling')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==attendant('floral-reference'))}}))
 assert.equal(row(auditProfessions(causalGap),role.id).complete,false)
})

test('six preserved scaffold IDs and original healthcare attribution history survive stable authoring without source/campaign changes',()=>{
 assert.equal(dignity('rights-reference'),'atlas:alu:promote-human-rights-646d871b-1');assert.equal(dignity('rights-cycle'),'atlas:alu:promote-human-rights-646d871b-2')
 for(const key of ['rights-reference','rights-cycle']){
  const node=nodes.get(dignity(key));assert.equal(node.learning_domain,'health')
  assert.ok(node.previous_authored_draft.supporting_sources.some(source=>source.url.includes('venvn.nl')))
 }
 for(const key of ['hygiene-reference','hygiene-cycle','diplomacy-reference','diplomacy-cycle'])assert.match(dignity(key),/^atlas:esco-breakdown:.*:[12]$/)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyDignityCare(draft);applyFuneralMethods(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('actual cemetery-placement revisions invalidate coffin and funeral review while independent promotion and postal occupation reviews stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([method('cemetery-placement')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify every complete newly qualified current cemetery-support condition.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('coffintransfer'),'skill_breakdown'),after(source('coffintransfer'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['promotion assistant','postman/postwoman']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
