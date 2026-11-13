import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyFoodShelfLife, foodShelfLifeId as life } from '../scripts/profession-food-shelf-life.mjs'
import { applyRetailStock, retailStockId as stock } from '../scripts/profession-retail-stock.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditPilot, evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyFoodShelfLife(draft),...applyRetailStock(draft)]
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const skill=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,id)=>report.rows.find(row=>row.id===id)
const changeNode=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})

test('shelf-life determination, stock-use/replenishment, safe storage and actual refill have exact complete source mappings and prerequisite closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[10,4,3,3])
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
   assert.equal(node.learning_design.scope,'activity')
   assert.equal(node.learning_design.effort.observed,false)
   const edges=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge))
   for(const edge of edges)assert.ok(nodes.has(edge.from),edge.from)
   assert.deepEqual(edges.map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
  }
 }
})

test('the original pilot retains every new required retail intermediate and old marked gates cannot bypass any of them',()=>{
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

test('printed-date familiarity cannot replace complete formulation/process/package, production basis, evidence and supported determination methods',()=>{
 for(const key of ['ingredient-formulation','production-process','packaging-scope','study-protocol','study-evidence','production-date-basis','candidate-life-determination','life-review-revalidation']){
  const broken=changeNode(life(key),node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill('foodshelflife')).authored_complete,false,key)
 }
})

test('practice-only study evidence cannot satisfy actual full shelf-life authoring while independent stock-use work remains authored',()=>{
 const broken=changeNode(life('study-evidence'),node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 const report=auditAllSkills(broken)
 assert.equal(row(report,skill('foodshelflife')).authored_complete,false)
 assert.equal(row(report,skill('stockmonitoring')).authored_complete,true)
})

test('complete actual usage, eligible-pending gap, physical storage and refill methods remain separately required',()=>{
 for(const [id,key] of [[stock('usage-reconciliation'),'stockmonitoring'],[stock('replenishment-gap'),'stockmonitoring'],[stock('safe-storage-action'),'storagesafety'],[stock('shelf-refill-action'),'shelfstocking']]){
  const broken=changeNode(id,node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
 }
})

test('missing causal production-time, actual-stock and safety-to-placement rationale blocks the affected full source',()=>{
 for(const [id,parent,key] of [[life('candidate-life-determination'),life('production-date-basis'),'foodshelflife'],[stock('replenishment-gap'),stock('usage-reconciliation'),'stockmonitoring'],[stock('shelf-reference'),stock('storage-cycle'),'shelfstocking']]){
  assert.ok(nodes.get(id).learning_design.dependency_basis.some(item=>item.input_id===parent))
  const broken=changeNode(id,node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==parent)}}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
 }
})

test('source precision preserves old scaffold IDs and byte-stable output without inventing a complete shelf-filler occupation',()=>{
 for(const mapping of mappings){
  const uuid=mapping.skill_id.split('/').at(-1),first='atlas:esco-breakdown:'+uuid+':1',last='atlas:esco-breakdown:'+uuid+':2'
  assert.ok(mapping.activity_ids.includes(first));assert.ok(mapping.activity_ids.includes(last))
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===first&&edge.to===last&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyFoodShelfLife(draft);applyRetailStock(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.profession_pathways,dataset.profession_pathways)
 const role=dataset.roles.find(node=>node.label==='shelf filler'&&node.source==='ESCO')
 const withoutOccupation={...dataset,profession_pathways:{...dataset.profession_pathways,routes:dataset.profession_pathways.routes.filter(route=>route.occupation_id!==role.id)}}
 assert.equal(row(auditProfessions(withoutOccupation),role.id).complete,false)
})

test('shelf-life revisions invalidate dependent retail context reviews while stock activity content and postal review stay stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const changed=changeNode(life('candidate-life-determination'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the newly approved complete actual study-condition bound.'}}))
 const after=createReviewFingerprinter(changed)
 assert.notEqual(before(skill('foodshelflife'),'skill_breakdown'),after(skill('foodshelflife'),'skill_breakdown'))
 // The complete shelf-filler demonstration now depends on qualified shelf-life
 // work. A breakdown review covers all its occupational contexts as well.
 assert.notEqual(before(skill('stockmonitoring'),'skill_breakdown'),after(skill('stockmonitoring'),'skill_breakdown'))
 assert.equal(before(stock('usage-reconciliation'),'activity_content'),after(stock('usage-reconciliation'),'activity_content'))
 const role=dataset.roles.find(node=>node.label==='postman/postwoman'&&node.source==='ESCO')
 assert.equal(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
})
