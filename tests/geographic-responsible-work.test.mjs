import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyGeographicWork, geographicWorkId as geographic } from '../scripts/profession-geographic-work.mjs'
import { applyResponsibleWork, responsibleWorkId as responsible } from '../scripts/profession-responsible-work.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyGeographicWork(draft),...applyResponsibleWork(draft)]
const allIds=[geographic('map-location-reference'),...mappings.flatMap(mapping=>mapping.activity_ids)]
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const skill=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,id)=>report.rows.find(row=>row.id===id)
const changeNode=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})

test('GIS, full journey analysis, dependable work and environmental implementation preserve exact source facets and complete prerequisite closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[6,4,3,5])
 assert.equal(new Set(allIds).size,19)
 for(const mapping of mappings){
  const source=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,source.definition)
  assert.equal(row(report,mapping.skill_id).authored_complete,true,source.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===mapping.skill_id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 }
 for(const id of allIds){
  const node=nodes.get(id)
  assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  const edges=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge))
  for(const edge of edges)assert.ok(nodes.has(edge.from),edge.from)
  assert.deepEqual(edges.map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
})

test('map-reference and exact-feature foundations cannot be replaced by a practice-only picture while unrelated journey analysis remains authored',()=>{
 for(const id of [geographic('map-location-reference'),geographic('geographic-feature-identity')]){
  const broken=changeNode(id,node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
  const report=auditAllSkills(broken)
  assert.equal(row(report,skill('gis')).authored_complete,false,id)
  assert.equal(row(report,skill('travelalternatives')).authored_complete,true)
 }
})

test('every actual GIS open/inspect, data-commit and live project-retrieval method is required for complete source authoring',()=>{
 for(const key of ['gis-layer-use','gis-attribute-change','gis-project-retrieval']){
  const broken=changeNode(geographic(key),node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill('gis')).authored_complete,false,key)
 }
})

test('full same-basis itinerary comparison, actual commitment action and all environmental outcome parts cannot be omitted',()=>{
 for(const [id,key] of [[geographic('itinerary-time-comparison'),'travelalternatives'],[responsible('dependable-action'),'reliability'],[responsible('environment-criteria-action'),'environmentalmeasures'],[responsible('resource-use-comparison'),'environmentalmeasures'],[responsible('colleague-environment-support'),'environmentalmeasures']]){
  const broken=changeNode(id,node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
 }
})

test('actual connected-route, committed-layer and equal-service environmental rationales remain required',()=>{
 for(const [id,parent,key] of [[geographic('journey-reference'),'atlas:alu:profession-domain:distribution:connected-route','travelalternatives'],[geographic('gis-project-retrieval'),geographic('gis-attribute-change'),'gis'],[responsible('resource-use-comparison'),responsible('environment-criteria-action'),'environmentalmeasures']]){
  const node=nodes.get(id)
  assert.ok(node.learning_design.dependency_basis.some(item=>item.input_id===parent),id)
  const broken=changeNode(id,node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==parent)}}))
  assert.equal(row(auditAllSkills(broken),skill(key)).authored_complete,false,id)
 }
})

test('four source branches improve postman coverage without automatically authoring its occupational work route',()=>{
 const report=auditAllSkills(dataset),complete=new Map(report.rows.map(row=>[row.id,row.authored_complete]))
 const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='postman/postwoman')
 const essential=dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential')
 assert.equal(essential.length,16)
 for(const mapping of mappings){assert.ok(essential.some(edge=>edge.to===mapping.skill_id));assert.equal(complete.get(mapping.skill_id),true)}
 assert.deepEqual(draft.profession_pathways,dataset.profession_pathways)
 const withoutOccupation={...dataset,profession_pathways:{...dataset.profession_pathways,routes:dataset.profession_pathways.routes.filter(route=>route.occupation_id!==role.id)}}
 assert.equal(row(auditProfessions(withoutOccupation),role.id).complete,false)
 assert.equal(auditProfessions(dataset).complete,dataset.profession_pathways.routes.length)
})

test('individual authoring preserves exact older first/cycle IDs and produces byte-stable repeated nodes and required edges',()=>{
 for(const mapping of mappings){
  const uuid=mapping.skill_id.split('/').at(-1),first='atlas:esco-breakdown:'+uuid+':1',last='atlas:esco-breakdown:'+uuid+':2'
  assert.ok(mapping.activity_ids.includes(first));assert.ok(mapping.activity_ids.includes(last))
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===first&&edge.to===last&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyGeographicWork(draft);applyResponsibleWork(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('actual live GIS retrieval revisions invalidate the source review while unrelated completed occupation reviews stay stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const changed=changeNode(geographic('gis-project-retrieval'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the newly required actual live source revision.'}}))
 const after=createReviewFingerprinter(changed)
 assert.notEqual(before(skill('gis'),'skill_breakdown'),after(skill('gis'),'skill_breakdown'))
 for(const label of ['footwear CAD patternmaker','mail clerk']){const id=dataset.roles.find(node=>node.label===label).id;assert.equal(before(id,'occupation_pathway'),after(id,'occupation_pathway'))}
})
