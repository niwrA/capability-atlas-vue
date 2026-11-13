import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyWeftPreparation,weftPreparationId as weft} from '../scripts/profession-weft-preparation.mjs'
import {applyTextileSketches,textileSketchesId as sketch} from '../scripts/profession-textile-sketches.mjs'
import {applyWeavingMachines,weavingMachinesId as weaving} from '../scripts/profession-weaving-machines.mjs'
import {weavingTechnicianId as technician} from '../scripts/profession-weaving-technician.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyWeftPreparation(draft),...applyTextileSketches(draft),...applyWeavingMachines(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='weaving textile technician'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id
test('three full bobbin/software-sketch/weaving-machine sources retain exact facets and 31 whole activities with complete causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[7,12,12]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,31)
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

test('weaving technician requires eight exact released essentials, complete setup clause and twelve contextual whole activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,8);assert.equal(route.occupation_facets.length,1);assert.equal(route.occupation_outcomes.length,12)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any of the 43 new source or actual occupation intermediates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,43)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})





test('a full spool cannot replace complete actual compatible inputs, ready winding, package/payout and usable finished-bobbin methods',()=>{
 for(const key of ['yarn-bobbin-selection','winder-readiness','winding-operation','package-verification','finished-bobbin']){const broken=changed([weft(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('weftpreparation')).authored_complete,false,key)}
})
test('a picture cannot replace actual editable shapes, paths, curves, appearance, transforms, repeats, product views and manufacturing handover',()=>{
 for(const key of ['canvas-control','shape-outline','path-points','curve-edit','stroke-fill','transform-copy','repeat-pattern','product-sketch','manufacture-clarity','editable-handover']){const broken=changed([sketch(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('textilesketch')).authored_complete,false,key)}
})
test('a saved programme cannot bypass full actual weave mapping, pattern, colour, density and active-state setup',()=>{
 for(const key of ['weave-structure','programme-pattern','programme-colour','programme-density','programme-activation']){const broken=changed([weaving(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('weavingmachines')).authored_complete,false,key)}
})
test('a running loom, provider-made fabric or two passing properties cannot replace actual readiness, threads, operation, all-property evidence and change response',()=>{
 for(const key of ['machine-readiness','thread-system','weaving-operation','fabric-verification','change-response']){const broken=changed([weaving(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('weavingmachines')).authored_complete,false,key)}
 const practice=changed([weaving('weaving-operation')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}));assert.equal(row(auditAllSkills(practice),source('weavingmachines')).authored_complete,false)
})
test('full source worksheets cannot replace actual personal sketch/bobbin/machine work, complete setup interfaces and commissioning',()=>{
 for(const key of ['sketch-work','bobbin-work','weaving-work','setup-plan','actual-setup','commissioning']){const broken=changed([technician(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)}
 const missing=changed([technician('actual-setup')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==technician('setup-plan'))}}));assert.equal(row(auditProfessions(missing),role.id).complete,false)
})
test('six old source IDs and first-to-second dependencies survive stable authoring with every official source field and campaign record preserved',()=>{
 for(const [factory,first,last] of [[weft,'bobbin-reference','bobbin-cycle'],[sketch,'sketch-reference','sketch-cycle'],[weaving,'weaving-reference','weaving-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyWeftPreparation(draft);applyTextileSketches(draft);applyWeavingMachines(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})
test('actual weaving-density revisions invalidate the source and technician, including all direct official source roles, while unrelated service reviews stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([weaving('programme-density')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck every current density unit, actual thread-system and full qualified interface basis.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('weavingmachines'),'skill_breakdown'),after(source('weavingmachines'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const edge of dataset.role_capability_assertions.filter(edge=>edge.to===source('weavingmachines'))){if(dataset.roles.some(r=>r.id===edge.from))assert.notEqual(before(edge.from,'occupation_pathway'),after(edge.from,'occupation_pathway'),edge.from)}
 for(const label of ['leaflet distributor','funeral attendant']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
