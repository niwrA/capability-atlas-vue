import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyOfficeFoundations, officeFoundationKeys } from '../scripts/profession-office-foundations.mjs'
import { foundationId as f, professionSource } from '../scripts/profession-authoring.mjs'
import { digitalId as digital } from '../scripts/profession-digital.mjs'
import { officeSuiteId as office } from '../scripts/profession-office-suite.mjs'
import { statutoryRecordId as statutory, statutorySkillId, applyStatutoryRecords } from '../scripts/profession-statutory-records.mjs'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditAllSkills } from '../src/pathway-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'

const dataset = await readDataset()
const nodes = new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const design = key => nodes.get(f(key)).learning_design
const required = edge => edge.completion_requirement!=='optional' && edge.completionRequirement!=='optional'
function closureRoute(id) {
 const steps = new Map(), starts = new Set(dataset.starting_foundations.entries.map(entry=>entry.id))
 const parents = new Map()
 for(const edge of dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&required(edge))){
  if(!parents.has(edge.to))parents.set(edge.to,[])
  parents.get(edge.to).push(edge.from)
 }
 function visit(id){
  if(steps.has(id))return
  const requires=starts.has(id)?[]:[...new Set(parents.get(id)||[])]
  steps.set(id,{id,stage:'shared',mode:'activity',requires})
  for(const parent of requires)visit(parent)
 }
 visit(id)
 return {id:'atlas:test:office-foundation:'+id,stages:[{id:'shared'}],steps:[...steps.values()],end_ids:[id],entry_ids:[...steps.values()].filter(step=>!step.requires.length).map(step=>step.id)}
}

test('all nine preserved office foundations have complete authored closures and exact canonical rationale',()=>{
 // Temporary audit targets exercise the real closure algorithm without adding
 // artificial skills or completion credit to the persisted catalogue.
 const capabilities=officeFoundationKeys.map(key=>({id:'atlas:test:office:'+key,label:key,kind:'skill',source:'Test'}))
 const draft={...dataset,capabilities:[...dataset.capabilities,...capabilities],decompositions:[...dataset.decompositions,...capabilities.map((node,index)=>({from:node.id,to:f(officeFoundationKeys[index]),type:'decomposes_into',completion_requirement:'required'}))]}
 const report=auditAllSkills(draft)
 for(const [index,key] of officeFoundationKeys.entries()){
  const node=nodes.get(f(key))
  assert.equal(node.source,professionSource)
  assert.ok(node.previous_authored_draft,'preserve the earlier comparison draft')
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  assert.deepEqual(node.learning_design.dependency_basis.map(item=>item.input_id).sort(),dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===node.id&&required(edge)).map(edge=>edge.from).sort())
  assert.equal(report.rows.find(row=>row.id===capabilities[index].id).authored_complete,true,key)
 }
})

test('old foundation completion cannot bypass new actual storage, table and recovery prerequisites',()=>{
 for(const [key,inputs] of [['records',[digital('edit-fields'),digital('retrieve')]],['tables',[office('sheet-cells'),office('table-sort')]],['versions',[digital('file-identity'),digital('retrieve'),digital('edit-fields')]]]){
  const route=closureRoute(f(key)),actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(route.steps.map(step=>step.id))
  assert.equal(evaluatePilot(route,actual,done).complete,true,key)
  for(const input of inputs){
   assert.ok(done.has(input))
   const partial=new Set(done);partial.delete(input)
   assert.equal(evaluatePilot(route,actual,partial).complete,false,key+': '+input)
  }
 }
})

test('restoration teaches actual separate recovery without losing later history or authorising obsolete use',()=>{
 const current=design('versions')
 assert.equal(current.focus.mode,'introduce')
 assert.equal(current.focus.new_concepts.length,1)
 assert.match(current.input,/actual copy\/save-as\/reopen controls/)
 assert.match(current.task,/separate named recovery location and reopen/)
 assert.match(current.task,/preserved v2/)
 assert.match(current.understanding_check.expected_evidence.join(' '),/does not itself grant operational approval/)
 assert.match(design('tables').understanding_check.materials,/misaligned workbook/)
 assert.match(design('tables').task,/every reordered row and field/)
})

test('communication, handover and short-record checks retain actual meaning, authority and non-completion',()=>{
 assert.match(design('audience').understanding_check.expected_evidence.join(' '),/Q remains withheld/)
 assert.match(design('handover').understanding_check.expected_evidence.join(' '),/does not establish accepted responsibility/)
 assert.match(design('short-record').task,/who supplied the meaning, wording, reading and physical input/)
 assert.match(design('short-record').understanding_check.expected_evidence.join(' '),/Expected is not treated as received/)
 assert.match(design('needs').understanding_check.expected_evidence.join(' '),/withdrawn condition/)
 assert.match(design('procedure').understanding_check.expected_evidence.join(' '),/does not authorise/)
 assert.match(design('evidence').understanding_check.expected_evidence.join(' '),/present result remains unknown/)
})

test('reapplying office foundations preserves their IDs, retained drafts and unrelated records byte for byte',()=>{
 const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]}
 const before=JSON.stringify(draft.learning_units),edges=JSON.stringify(draft.decompositions)
 applyOfficeFoundations(draft)
 assert.equal(JSON.stringify(draft.learning_units),before)
 // The helper replaces owned incoming edges; compare their stable semantic set.
 const key=edge=>JSON.stringify(edge)
 assert.deepEqual(draft.decompositions.map(key).sort(),JSON.parse(edges).map(key).sort())
})

test('statutory source scope keeps all five original required activities and complete current authored closure',()=>{
 const report=auditAllSkills(dataset)
 assert.equal(report.rows.find(row=>row.id===statutorySkillId).authored_complete,true)
 const actual=dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===statutorySkillId&&required(edge)).map(edge=>edge.to).sort()
 assert.deepEqual(actual,['register-map','authorised-change','reconcile','update-trace','review-correct'].map(statutory).sort())
 for(const id of actual){
  const node=nodes.get(id)
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  assert.equal(node.learning_design.scope,'activity')
  assert.ok(node.previous_authored_draft)
  for(const edge of dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)))assert.ok(node.learning_design.dependency_basis.some(item=>item.input_id===edge.from&&item.reason.trim()),edge.from)
 }
 const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]}
 const mapping=applyStatutoryRecords(draft)
 for(const facet of mapping.facets)assert.ok(nodes.get(statutorySkillId).definition.includes(facet.source_fragment),facet.source_fragment)
 assert.deepEqual(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('statutory actual update, later currency and unresolved ownership cannot be replaced by old completion records',()=>{
 const route=closureRoute(statutory('review-correct')),actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(route.steps.map(step=>step.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const input of [statutory('update-trace'),statutory('authorised-change'),f('versions'),f('handover'),office('table-sort')]){
  const partial=new Set(done);partial.delete(input)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,input)
 }
 const last=nodes.get(statutory('review-correct')).learning_design
 assert.match(last.task,/complete current director, secretary, interest and shareholder\/member records/)
 assert.match(last.understanding_check.expected_evidence.join(' '),/declined unresolved handover remains unaccepted/)
 assert.match(nodes.get(statutory('update-trace')).learning_design.task,/every required changed and unchanged field/)
})

test('statutory current jurisdiction, legal-owner and actual filing limits stay explicit',()=>{
 const first=nodes.get(statutory('register-map'))
 assert.match(first.learning_design.input,/fictional Irish company/)
 assert.match(first.learning_design.input,/current UK comparison/)
 assert.match(first.learning_design.input,/no deadlines, disclosure rights or universal fields are inferred/)
 assert.match(first.learning_design.task,/internal records as evidence that an external filing has occurred/)
 assert.ok(first.supporting_sources.some(source=>source.url==='https://cea.gov.ie/FAQs'))
 assert.ok(first.supporting_sources.some(source=>source.url.includes('changes-to-company-registers')))
 const correction=nodes.get(statutory('review-correct')).learning_design
 assert.match(correction.task,/current full legal compliance or completed external filing/)
 assert.equal(correction.effort.observed,false)
})

test('losing a genuine old statutory prerequisite rationale blocks the source route again',()=>{
 const draft={...dataset,learning_units:dataset.learning_units.map(node=>node.id===statutory('reconcile')?{...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==f('tables'))}}:node)}
 const row=auditAllSkills(draft).rows.find(row=>row.id===statutorySkillId)
 assert.equal(row.authored_complete,false)
 assert.ok(row.flags&256)
})
