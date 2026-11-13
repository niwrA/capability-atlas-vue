import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyNonwovenKnowledge,nonwovenKnowledgeId as knowledge} from '../scripts/profession-nonwoven-knowledge.mjs'
import {applyTechnicalTextileSpecifications,technicalTextileSpecificationsId as specification} from '../scripts/profession-technical-textile-specifications.mjs'
import {applyNonwovenFilament,nonwovenFilamentId as filament} from '../scripts/profession-nonwoven-filament.mjs'
import {nonwovenTechnicianId as technician} from '../scripts/profession-nonwoven-technician.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyNonwovenKnowledge(draft),...applyTechnicalTextileSpecifications(draft),...applyNonwovenFilament(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='nonwoven textile technician'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id
test('three full nonwoven knowledge/development/manufacturing sources retain exact facets and 31 whole activities with complete causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[8,8,15]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,31)
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

test('nonwoven technician requires eight exact released essentials, complete setup clause and eleven contextual whole activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,8);assert.equal(route.occupation_facets.length,1);assert.equal(route.occupation_outcomes.length,11)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any of the 42 new source or actual occupation intermediates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,42)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})




test('knowledge retains every specification, development, formation, consolidation, property and evaluation concept without claiming actual operation',()=>{
 assert.equal(nodes.get(source('nonwoventechnology')).esco_skill_type,'knowledge')
 for(const key of ['web-formations','filament-principles','bonding-principles','specification-manufacture','property-evaluation','development-choices']){const broken=changed([knowledge(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('nonwoventechnology')).authored_complete,false,key)}
})
test('copying a template cannot replace actual functional requirement, measurable target, feasible design and full verification development',()=>{
 for(const key of ['performance-needs','measurable-contract','material-choice','verification-plan','developed-specification','review-change']){const broken=changed([specification(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('technicaltextilespec')).authored_complete,false,key)}
})
test('a running line or craft web cannot replace full actual readiness, active configuration, feed, filament, consolidation and accepted-output methods',()=>{
 for(const key of ['process-readiness','recipe-configuration','material-feed','filament-operation','web-consolidation','output-collection']){const broken=changed([filament(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('nonwovenfilament')).authored_complete,false,key)}
})
test('production and a contractor report cannot bypass personally assigned monitoring, maintenance, verified return and full efficiency/productivity',()=>{
 for(const key of ['process-monitoring','deviation-response','maintenance-planning','maintenance-state','maintenance-action','return-verification','efficiency-results']){const broken=changed([filament(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('nonwovenfilament')).authored_complete,false,key)}
 const practice=changed([filament('maintenance-action')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}));assert.equal(row(auditAllSkills(practice),source('nonwovenfilament')).authored_complete,false)
})
test('a recipe file or full source worksheets cannot replace actual complete setup interfaces, commissioning or personally assigned occupation work',()=>{
 for(const key of ['specification-work','manufacturing-work','setup-plan','actual-setup','commissioning']){const broken=changed([technician(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)}
 const missing=changed([technician('actual-setup')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==technician('setup-plan'))}}));assert.equal(row(auditProfessions(missing),role.id).complete,false)
})
test('six original source IDs, first-to-second dependencies and official source data survive stable reauthoring',()=>{
 for(const [factory,first,last] of [[knowledge,'technology-reference','technology-cycle'],[specification,'spec-reference','spec-cycle'],[filament,'filament-reference','filament-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyNonwovenKnowledge(draft);applyTechnicalTextileSpecifications(draft);applyNonwovenFilament(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})
test('actual maintenance revisions invalidate filament and nonwoven occupation review including the official optional operations-manager link, while independent quality-manager and knowledge reviews stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([filament('maintenance-action')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck every current complete personally assigned maintenance operation and compatible resulting condition.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('nonwovenfilament'),'skill_breakdown'),after(source('nonwovenfilament'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['textile quality manager','clothing operations manager']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
 const operations=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='textile operations manager');assert.ok(dataset.role_capability_assertions.some(edge=>edge.from===operations.id&&edge.to===source('nonwovenfilament')&&edge.type==='esco_optional'));assert.notEqual(before(operations.id,'occupation_pathway'),after(operations.id,'occupation_pathway'))
 for(const key of ['nonwoventechnology','technicaltextilespec'])assert.equal(before(source(key),'skill_breakdown'),after(source(key),'skill_breakdown'),key)
})
