import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyTextileMaterials,textileMaterialsId as material} from '../scripts/profession-textile-materials.mjs'
import {applyWorkStandards,workStandardsId as standard} from '../scripts/profession-work-standards.mjs'
import {applyTextileProcess,textileProcessId as process} from '../scripts/profession-textile-process.mjs'
import {textileOperationsManagerId as manager} from '../scripts/profession-textile-operations-manager.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyTextileMaterials(draft),...applyWorkStandards(draft),...applyTextileProcess(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='textile operations manager'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id
test('six full textile/material/work sources retain exact facets and 38 whole activities with complete causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,5,7,6,9,7]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,38)
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

test('textile operations manager requires seven exact released essentials, both occupation clauses and eleven contextual whole activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,7);assert.equal(route.occupation_facets.length,2);assert.equal(route.occupation_outcomes.length,11)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any of the 49 new source or actual occupation intermediates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,49)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})


test('actual differences and full application evaluation remain required for both fabrics and accessories',()=>{
 for(const [key,ids] of [['accessories',['accessory-characteristics','accessory-application']],['fabrics',['fabric-characteristics','fabric-behaviour','fabric-application']]])for(const part of ids){const broken=changed([material(part)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source(key)).authored_complete,false,part)}
})
test('approval cannot bypass actual stock, selection, purchase commitment and received-result work',()=>{
 for(const key of ['stock-availability','material-selection','purchase-preparation','actual-purchase','purchase-result']){const broken=changed([material(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('textileorders')).authored_complete,false,key)}
 assert.match(nodes.get(material('actual-purchase')).learning_design.task,/actual|Actually/)
})
test('attendance cannot replace new-method instruction, practice, changed work and maintained standards',()=>{
 for(const key of ['standards-evidence','learning-method','supported-practice','new-work-transfer']){const broken=changed([standard(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('workstandards')).authored_complete,false,key)}
})
test('a plan or two outcomes cannot replace complete actual quality, productivity and delivery control',()=>{
 for(const key of ['production-control-plan','quality-monitor','productivity-monitor','delivery-monitor','textile-control-action']){const broken=changed([process(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('textilecontrol')).authored_complete,false,key)}
 const practice=changed([process('textile-cycle')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}));assert.equal(row(auditAllSkills(practice),source('textilecontrol')).authored_complete,false)
})
test('efficiency knowledge includes every environmental branch, common boundaries and full trade-offs',()=>{
 for(const key of ['efficiency-aims','water-pressure','chemistry-pollution','energy-climate','materials-nature','waste-circularity','issue-tradeoffs']){const broken=changed([process(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('textilechallenges')).authored_complete,false,key)}
})
test('every actual profession intermediate and its causal dependencies remain required',()=>{
 for(const key of ['material-work','purchase-work','standards-work','manufacturing-work','order-schedule','delivery-schedule','textile-control','environmental-work','production-flow']){const broken=changed([manager(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)}
 const missing=changed([manager('delivery-schedule')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==manager('order-schedule'))}}));assert.equal(row(auditProfessions(missing),role.id).complete,false)
})
test('twelve original source IDs, first-to-second inputs and official data survive stable reauthoring',()=>{
 for(const [factory,first,last] of [[material,'accessory-reference','accessory-cycle'],[material,'fabric-reference','fabric-cycle'],[material,'purchase-reference','purchase-cycle'],[standard,'standards-reference','standards-cycle'],[process,'issue-reference','issue-cycle'],[process,'textile-reference','textile-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyTextileMaterials(draft);applyWorkStandards(draft);applyTextileProcess(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})
test('textile control revisions invalidate the dependent route and preserve independent clothing and engineering review fingerprints',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([process('delivery-monitor')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck every current actual delivery dependency and accepted result.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('textilecontrol'),'skill_breakdown'),after(source('textilecontrol'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['clothing operations manager','engineering assistant']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
