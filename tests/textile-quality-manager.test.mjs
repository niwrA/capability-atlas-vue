import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyYarnMeasurement,yarnMeasurementId as yarn} from '../scripts/profession-yarn-measurement.mjs'
import {applyApparelInspection,apparelInspectionId as apparel} from '../scripts/profession-apparel-inspection.mjs'
import {applyTextileLineQuality,textileLineQualityId as line} from '../scripts/profession-textile-line-quality.mjs'
import {textileQualityManagerId as manager} from '../scripts/profession-textile-quality-manager.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyYarnMeasurement(draft),...applyApparelInspection(draft),...applyTextileLineQuality(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='textile quality manager'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id
test('four full textile quality/measurement sources retain exact facets and 40 whole activities with complete causal inputs',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[10,12,7,11]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,40)
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

test('textile quality manager requires eight exact released essentials, three occupation clauses and fourteen contextual whole activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,8);assert.equal(route.occupation_facets.length,3);assert.equal(route.occupation_outcomes.length,14)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any of the 54 new source or actual occupation intermediates',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=[...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes];assert.equal(ids.length,54)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})



test('nominal labels cannot replace actual three-form preparation, length, mass, direct/inverse counts and all defined conversions',()=>{
 for(const key of ['sample-basis','length-method','mass-method','direct-count','inverse-count','direct-conversion','cotton-conversion','form-transfer']){const broken=changed([yarn(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('yarncount')).authored_complete,false,key)}
})
test('garment evaluation cannot omit any stitching, assembly, attachment, function, decoration, shade, pattern, tape or lining branch',()=>{
 for(const key of ['stitching-check','construction-check','attachment-check','fastener-check','embellishment-check','shading-check','pattern-continuity','pattern-matching','tapes-check','lining-check']){const broken=changed([apparel(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('garmentquality')).authored_complete,false,key)}
})
test('looking at apparel or issuing a rejection notice cannot replace actual tests, full decisions and controlled disposition',()=>{
 for(const key of ['visual-inspection','dimensional-test','functional-test','conformity-decision','nonconforming-disposition']){const broken=changed([apparel(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('apparelinspection')).authored_complete,false,key)}
 const practice=changed([apparel('nonconforming-disposition')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}));assert.equal(row(auditAllSkills(practice),source('apparelinspection')).authored_complete,false)
})
test('one generic fabric sample cannot cover all source-named textile classes and actual production-stage relationships',()=>{
 for(const key of ['yarn-stage','woven-stage','knitted-stage','braided-stage','tufted-stage','nonwoven-stage','finished-stage','garment-stage','stage-comparison']){const broken=changed([line(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditAllSkills(broken),source('textilelinequality')).authored_complete,false,key)}
})
test('complete source skills cannot replace actual quality-system implementation, continued management, understood adoption or product adherence',()=>{
 for(const key of ['system-contract','system-implementation','system-management','system-promotion','product-adherence','line-work']){const broken=changed([manager(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)}
 const missing=changed([manager('system-implementation')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==manager('system-contract'))}}));assert.equal(row(auditProfessions(missing),role.id).complete,false)
})
test('all eight original source IDs and first-to-second inputs survive byte-stable authoring without source-data changes',()=>{
 for(const [factory,first,last] of [[yarn,'count-reference','count-cycle'],[apparel,'garment-reference','garment-cycle'],[apparel,'inspection-reference','inspection-cycle'],[line,'line-reference','line-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyYarnMeasurement(draft);applyApparelInspection(draft);applyTextileLineQuality(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})
test('actual yarn method revisions invalidate dependent line/quality and optional bobbin-linked operations reviews while independent clothing review stays stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([yarn('mass-method')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck every current actual mass-basis and correct-specimen requirement.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('yarncount'),'skill_breakdown'),after(source('yarncount'),'skill_breakdown'))
 assert.notEqual(before(source('textilelinequality'),'skill_breakdown'),after(source('textilelinequality'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 const operations=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='textile operations manager');assert.ok(dataset.role_capability_assertions.some(edge=>edge.from===operations.id&&edge.to==='http://data.europa.eu/esco/skill/21bb2766-92b0-4f52-8747-a92fdbdeac9a'&&edge.type==='esco_optional'));assert.notEqual(before(operations.id,'occupation_pathway'),after(operations.id,'occupation_pathway'))
 for(const label of ['clothing operations manager']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
