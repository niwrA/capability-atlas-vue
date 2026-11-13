import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { officeSystemId as system, applyOfficeSystems } from '../scripts/profession-office-systems.mjs'
import { officeMailId as mail, applyOfficeMail } from '../scripts/profession-office-mail.mjs'
import { officeEquipmentId as equipment, applyOfficeEquipment } from '../scripts/profession-office-equipment.mjs'
import { officeOperationId as operation, applyOfficeOperations } from '../scripts/profession-office-operations.mjs'
import { administrativeAssistantId as assistant } from '../scripts/profession-administrative-assistant.mjs'
import { wordProcessingId as word } from '../scripts/profession-word-processing.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { auditProfessions } from '../src/profession-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset)
const mappings=[...applyOfficeSystems(draft),...applyOfficeMail(draft),...applyOfficeOperations(draft)]
const equipmentIds=applyOfficeEquipment(draft)
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id).label===label)
const route=routeFor('administrative assistant')
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changedNode=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})
const row=(report,id)=>report.rows.find(row=>row.id===id)

test('all four new office branches preserve exact source facets and complete whole-activity required closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[9,5,7,6])
 for(const mapping of mappings){
  const source=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,source.definition)
  assert.equal(row(report,mapping.skill_id).authored_complete,true,source.label)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===mapping.skill_id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(source.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 }
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...equipmentIds,operation('order-reference'),operation('order-action')]){
  const node=nodes.get(id)
  assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
})

test('every actual office-system, reservation, mail, routine, equipment and order method is required by the full profession',()=>{
 assert.ok(route)
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...equipmentIds,operation('order-reference'),operation('order-action')]){
  assert.ok(done.has(id),id)
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,id)
 }
})

test('a practice-only mail privacy method cannot pass its source or profession while unrelated reservation work remains authored',()=>{
 const broken=changedNode(mail('mail-data-protection'),node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 const report=auditAllSkills(broken)
 assert.equal(row(report,mappings.find(mapping=>mapping.key==='officemail').skill_id).authored_complete,false)
 assert.equal(row(report,mappings.find(mapping=>mapping.key==='officefacilities').skill_id).authored_complete,true)
 assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false)
})

test('removing causal equipment restoration input reasoning invalidates continuity and the profession',()=>{
 const broken=changedNode(operation('operations-continuity'),node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==equipment('equipment-service-return'))}}))
 assert.equal(row(auditAllSkills(broken),mappings.find(mapping=>mapping.key==='officeroutines').skill_id).authored_complete,false)
 assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false)
})

test('shared actual printing is mandatory for data-entry printing without requiring office-fan or copier operation',()=>{
 const dataEntry=routeFor('data entry clerk'),ids=new Set(dataEntry.steps.map(step=>step.id))
 assert.ok(ids.has(equipment('print-output')))
 assert.equal(ids.has(equipment('appliance-user-method')),false)
 assert.equal(ids.has(equipment('copy-output')),false)
 const dependency=nodes.get(word('written-print')).learning_design.dependency_basis.find(item=>item.input_id===equipment('print-output'))
 assert.ok(dependency)
 const actual=dataEntry.steps.map(step=>nodes.get(step.id));ids.delete(equipment('print-output'))
 assert.equal(evaluatePilot(dataEntry,actual,ids).complete,false)
})

test('administrative assistant retains all twenty exact essentials and all six occupation-body facets',()=>{
 const actual=row(auditProfessions(dataset),route.occupation_id)
 assert.equal(actual.complete,true)
 assert.equal(actual.essentials,20)
 const expected=dataset.role_capability_assertions.filter(edge=>edge.from===route.occupation_id&&edge.type==='esco_essential').map(edge=>edge.to).sort()
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),expected)
 assert.equal(route.occupation_facets.length,6)
 for(const facet of route.occupation_facets)assert.ok(nodes.get(route.occupation_id).definition.includes(facet.source_fragment))
 const work=['brief','statutory-work','business-research','spreadsheet-work','communications','controlled-documents','forms','office-suite','office-systems','facilities-schedules','mail-routines','telephone-support','visitor-direction','supply-ordering','facility-equipment-support','operating-interval']
 const all=route.steps.map(step=>nodes.get(step.id)),done=new Set(all.map(node=>node.id))
 for(const key of work){const partial=new Set(done);assert.ok(partial.delete(assistant(key)));assert.equal(evaluatePilot(route,all,partial).complete,false,key)}
})

test('removing either visitor arrival or the actual supply-order outcome blocks the strict profession audit',()=>{
 for(const id of [assistant('visitor-direction'),operation('order-action'),equipment('copy-output')]){
  const broken=changedNode(id,node=>({...node,learning_design:undefined}))
  assert.equal(row(auditProfessions(broken),route.occupation_id).complete,false,id)
 }
})

test('new office branch authoring is idempotent and retains canonical required edges',()=>{
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyOfficeSystems(draft);applyOfficeMail(draft);applyOfficeEquipment(draft);applyOfficeOperations(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('actual mail method changes invalidate administration review while unrelated CAD review is stable',()=>{
 const before=createReviewFingerprinter(dataset)
 const changed=changedNode(mail('mail-physical-workflow'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Check the newly approved complete custody condition.'}}))
 const after=createReviewFingerprinter(changed),cad=dataset.roles.find(node=>node.label==='footwear CAD patternmaker')
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 assert.equal(before(cad.id,'occupation_pathway'),after(cad.id,'occupation_pathway'))
})
