import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { officeRecordId as record, applyOfficeRecords } from '../scripts/profession-office-records.mjs'
import { professionSource } from '../scripts/profession-authoring.mjs'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditAllSkills } from '../src/pathway-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]},mappings=applyOfficeRecords(draft)
const design=key=>nodes.get(record(key)).learning_design
const administration=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id).label==='administrative assistant')
const skillId=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,key)=>report.rows.find(row=>row.id===skillId(key))

test('forms, task records and corporate email cover the full source scope with complete authored closures and rationale',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[7,4,5])
 for(const mapping of mappings){
  const skill=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,skill.definition)
  assert.equal(row(report,mapping.key).authored_complete,true,mapping.key)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===skill.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(skill.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
  for(const id of mapping.activity_ids){
   const node=nodes.get(id)
   assert.equal(node.source,professionSource)
   assert.equal(assessLearningDesign(node).status,'draft_ready')
   assert.equal(node.learning_design.scope,'activity')
   assert.equal(node.learning_design.effort.observed,false)
   assert.equal(node.supporting_sources[0].url,skill.source_url)
   assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
  }
 }
})

test('all six earlier scaffold IDs preserve their required first-to-cycle input without imposing generic unaided reading',()=>{
 for(const [reference,cycle] of [['form-reference','forms-cycle'],['task-record-reference','task-records-cycle'],['email-reference','email-cycle']]){
  assert.ok(nodes.get(record(reference)).previous_authored_draft)
  assert.ok(nodes.get(record(cycle)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===record(reference)&&edge.to===record(cycle)&&required(edge)))
  const generic=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===record(reference)&&edge.from==='atlas:alu:profession-foundation:communication:read-and-produce-practical-texts')
  assert.ok(generic.length)
  assert.ok(generic.every(edge=>!required(edge)))
  assert.ok(!dataset.starting_foundations.entries.some(entry=>entry.id===record(reference)||entry.id===record(cycle)))
 }
 assert.equal(dataset.starting_foundations.entries.length,4)
})

test('old activity completion and manually marked skill gates cannot skip actual handwriting, work records or addressed drafts',()=>{
 const actual=administration.steps.map(step=>nodes.get(step.id)),done=new Set(administration.steps.map(step=>step.id))
 assert.equal(evaluatePilot(administration,actual,done).complete,true)
 for(const mapping of mappings)for(const id of mapping.activity_ids){
  assert.ok(done.has(id),id)
  const partial=new Set(done);partial.delete(id)
  const state=evaluatePilot(administration,actual,partial)
  assert.equal(state.steps.get(mapping.skill_id).done,false,id)
  assert.equal(state.complete,false,id)
 }
})

test('missing actual writing design blocks forms while digital drafting and work records keep their own valid support paths',()=>{
 for(const change of [node=>{delete node.learning_design},node=>{node.learning_design.scope='practice_sequence'},node=>{node.learning_design.dependency_basis=[]}]){
  const invalid=structuredClone(nodes.get(record('character-copy')));change(invalid)
  const next={...dataset,learning_units:dataset.learning_units.map(node=>node.id===invalid.id?invalid:node)},report=auditAllSkills(next)
  assert.equal(row(report,'forms').authored_complete,false)
  assert.equal(row(report,'corporateemails').authored_complete,true)
  assert.equal(row(report,'taskrecords').authored_complete,true)
 }
})

test('actual personal writing, full reader recovery and real task timing cannot be replaced by a neat helper-written page or effort estimate',()=>{
 assert.match(design('mark-control').task,/helper makes the whole mark.*remaining personal-writing gap/)
 assert.match(design('character-copy').input,/every additional character actually needed.*separately demonstrated\/practised/)
 assert.match(design('character-copy').task,/independent test reader identify the copied character without seeing the intended answer/)
 assert.match(design('character-sequence').understanding_check.expected_evidence.join(' '),/matching length does not establish the exact source sequence/)
 assert.match(design('handwritten-form').understanding_check.expected_evidence.join(' '),/helper-produced legibility do not establish personal legible calligraphy/)
 assert.match(design('forms-cycle').input,/Actual task timing is separate from the unobserved planning estimates/)
 assert.match(design('forms-cycle').understanding_check.expected_evidence.join(' '),/Accurate legible output alone does not establish actual timely completion/)
 assert.match(design('forms-cycle').understanding_check.expected_evidence.join(' '),/guessed unknown field cannot establish accuracy/)
 assert.match(design('forms-cycle').task,/owner-approved digital or helper-written completion as supported form work/)
 assert.match(design('forms-cycle').task,/does not make unaided writing a universal workplace or learner requirement/)
})

test('work-record classification and later progress preserve true source events instead of inferring performed work from reports',()=>{
 assert.match(design('task-record-reference').input,/R can be a prepared draft rather than approved final; C can be saved but unsent/)
 assert.match(design('task-record-classification').task,/every prepared report, correspondence item and task-progress record/)
 assert.match(design('task-progress-update').task,/record update does not itself perform the missing work/)
 assert.match(design('task-progress-update').understanding_check.expected_evidence.join(' '),/missing\/reversed requirement and actual event stay open/)
 assert.match(design('task-records-cycle').understanding_check.expected_evidence.join(' '),/Every required source\/association\/progress event and unresolved ownership state/)
})

test('corporate drafting checks adequate facts, exact actual recipients, complete stored attachments and appropriate internal/external meaning',()=>{
 assert.match(design('email-reference').understanding_check.expected_evidence.join(' '),/hidden-copy field does not authorise restricted or unsupported content/)
 assert.match(design('email-compilation').understanding_check.expected_evidence.join(' '),/Correct body facts.*do not establish the complete appropriate information pack/)
 assert.match(design('email-draft-fields').input,/actual create, To\/Cc\/Bcc, subject, attach, save and reopen-draft controls/)
 assert.match(design('email-draft-fields').understanding_check.expected_evidence.join(' '),/No sent or received state is inferred from a saved draft/)
 assert.match(design('email-composition').understanding_check.expected_evidence.join(' '),/Partner-produced wording is not reported as independent learner composition/)
 assert.match(design('email-cycle').understanding_check.expected_evidence.join(' '),/ready saved draft never by itself establishes sending, receipt or approval/)
 assert.ok(nodes.get(record('email-draft-fields')).supporting_sources.some(source=>source.url==='https://www.rfc-editor.org/rfc/rfc5322'))
})

test('repeated authoring keeps exact activity content, retained drafts, unrelated records and semantic requirements',()=>{
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyOfficeRecords(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('personal-writing method revisions invalidate the dependent administration review while an unrelated CAD route remains stable',()=>{
 const before=createReviewFingerprinter(dataset),changed=structuredClone(nodes.get(record('character-copy')))
 changed.learning_design.task+=' Check the newly taught actual character model.'
 const next={...dataset,learning_units:dataset.learning_units.map(node=>node.id===changed.id?changed:node)},after=createReviewFingerprinter(next)
 const cad=dataset.roles.find(node=>node.label==='footwear CAD patternmaker')
 assert.notEqual(before(administration.occupation_id,'occupation_pathway'),after(administration.occupation_id,'occupation_pathway'))
 assert.equal(before(cad.id,'occupation_pathway'),after(cad.id,'occupation_pathway'))
})
