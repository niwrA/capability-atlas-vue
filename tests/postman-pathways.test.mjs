import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyDataProtectionKnowledge, dataProtectionKnowledgeId as protection } from '../scripts/profession-data-protection-knowledge.mjs'
import { applyRoadUse, roadUseId as road } from '../scripts/profession-road-use.mjs'
import { postmanId as postman } from '../scripts/profession-postman.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyDataProtectionKnowledge(draft),...applyRoadUse(draft)]
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id).label==='postman/postwoman')
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const skill=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,id)=>report.rows.find(row=>row.id===id)
const changeNode=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})
const work=['brief','mail-preparation','local-geographic-work','journey-analysis','work-organisation','environmental-work','dependable-work','road-work','mail-traces','recipient-identity','recipient-signature','residence-business-delivery','operating-interval']

test('all three final postman source branches retain exact full source facets and complete whole-activity closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[14,9,6])
 for(const mapping of mappings){
  const source=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,source.definition)
  assert.equal(row(report,source.id).authored_complete,true,source.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===source.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 }
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...work.map(postman)]){
  const node=nodes.get(id)
  assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  const edges=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge))
  for(const edge of edges)assert.ok(nodes.has(edge.from),edge.from)
  assert.deepEqual(edges.map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
})

test('postman/postwoman retains all sixteen exact essentials and complete four-facet source-description work',()=>{
 assert.ok(route)
 const actual=row(auditProfessions(dataset),route.occupation_id)
 assert.equal(actual.complete,true)
 assert.equal(actual.essentials,16)
 const expected=dataset.role_capability_assertions.filter(edge=>edge.from===route.occupation_id&&edge.type==='esco_essential').map(edge=>edge.to).sort()
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),expected)
 assert.equal(route.occupation_facets.length,4)
 for(const facet of route.occupation_facets)assert.ok(nodes.get(route.occupation_id).definition.includes(facet.source_fragment),facet.source_fragment)
})

test('none of the twenty-nine final source intermediates or thirteen occupational work activities can be bypassed by marked gates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...work.map(postman)]){
  const partial=new Set(done);assert.ok(partial.delete(id),id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('data protection cannot collapse into confidentiality while purpose, ethics, current regulations or protocols are missing',()=>{
 for(const key of ['lawfulness','fairness','transparency','purpose-limitation','data-minimisation','data-accuracy','storage-limitation','accountability','ethical-issues','regulatory-scope','protocol-meaning']){
  const broken=changeNode(protection(key),node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill('dataprotectionknowledge')).authored_complete,false,key)
 }
})

test('complete road-rule knowledge and signal recognition do not substitute for the full performed road-action branch',()=>{
 const broken=changeNode(road('road-signal-action'),node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 const report=auditAllSkills(broken)
 assert.equal(row(report,skill('roadlaw')).authored_complete,true)
 assert.equal(row(report,skill('trafficsignals')).authored_complete,false)
 assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false)
})

test('recipient verification, signature receipt and actual residence/business delivery remain separate whole-work requirements even when every source skill is authored',()=>{
 for(const key of ['recipient-identity','recipient-signature','residence-business-delivery']){
  const broken=changeNode(postman(key),node=>({...node,learning_design:undefined}))
  assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false,key)
  for(const mapping of mappings)assert.equal(row(auditAllSkills(broken),mapping.skill_id).authored_complete,true,key)
 }
})

test('missing actual observation-to-action and correct-recipient-to-signature rationale blocks completion',()=>{
 for(const [id,parent] of [[road('signal-interpretation'),road('complete-road-observation')],[postman('recipient-signature'),postman('recipient-identity')]]){
  assert.ok(nodes.get(id).learning_design.dependency_basis.some(item=>item.input_id===parent))
  const broken=changeNode(id,node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==parent)}}))
  assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false,id)
 }
})

test('optional orientation scaffolds stay optional and repeated precise source authoring is byte-stable',()=>{
 for(const mapping of mappings){
  const uuid=mapping.skill_id.split('/').at(-1),first='atlas:esco-breakdown:'+uuid+':1',last='atlas:esco-breakdown:'+uuid+':2',optional='atlas:esco-entry-practice:'+uuid
  assert.ok(mapping.activity_ids.includes(first));assert.ok(mapping.activity_ids.includes(last))
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===first&&edge.to===last&&required(edge)))
  assert.ok(dataset.decompositions.some(edge=>edge.type==='decomposes_into'&&edge.from===mapping.skill_id&&edge.to===optional&&!required(edge)))
  assert.equal(route.steps.some(step=>step.id===optional),false)
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyDataProtectionKnowledge(draft);applyRoadUse(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('actual recipient-signature revisions invalidate postal occupation review while unrelated mail-clerk/CAD review is stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const changed=changeNode(postman('recipient-signature'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Check the newly required exact current signed receipt association.'}}))
 const after=createReviewFingerprinter(changed)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 for(const label of ['mail clerk','footwear CAD patternmaker']){const id=dataset.roles.find(node=>node.label===label).id;assert.equal(before(id,'occupation_pathway'),after(id,'occupation_pathway'))}
})
