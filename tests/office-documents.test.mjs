import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { officeDocumentId as doc, applyOfficeDocuments } from '../scripts/profession-office-documents.mjs'
import { professionSource } from '../scripts/profession-authoring.mjs'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditAllSkills } from '../src/pathway-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]}
const mappings=applyOfficeDocuments(draft)
const design=key=>nodes.get(doc(key)).learning_design
const administration=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id).label==='administrative assistant')
const row=(report,key)=>report.rows.find(row=>row.id===mappings.find(mapping=>mapping.key===key).skill_id)

test('all four source document skills have complete authored canonical closures and exact full source facets',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[3,5,8,5])
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

test('all eight original scaffold IDs and their genuine first-to-cycle prerequisites survive the revision',()=>{
 for(const [reference,cycle] of [['collection-reference','business-documents-cycle'],['filing-reference','filing-cycle'],['digital-reference','digital-cycle'],['control-reference','control-cycle']]){
  assert.ok(nodes.get(doc(reference)).previous_authored_draft)
  assert.ok(nodes.get(doc(cycle)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===doc(reference)&&edge.to===doc(cycle)&&required(edge)))
  const generic=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===doc(reference)&&edge.from==='atlas:alu:profession-foundation:communication:read-and-produce-practical-texts')
  assert.ok(generic.length)
  assert.ok(generic.every(edge=>!required(edge)))
  assert.ok(!dataset.starting_foundations.entries.some(entry=>entry.id===doc(reference)||entry.id===doc(cycle)))
 }
})

test('old comparison completion and manually marked skill gates cannot bypass any actual document method',()=>{
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

test('missing PDF method evidence blocks digital documents without inventing that method for unrelated document tasks',()=>{
 const original=nodes.get(doc('document-pdf'))
 const invalid={...dataset,learning_units:dataset.learning_units.map(node=>node.id===original.id?{...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}:node)}
 const report=auditAllSkills(invalid)
 assert.equal(row(report,'digitaldocuments').authored_complete,false)
 for(const key of ['businessdocuments','filing','documentcontrol'])assert.equal(row(report,key).authored_complete,true,key)
 const missingReason={...dataset,learning_units:dataset.learning_units.map(node=>node.id===doc('filing-cycle')?{...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==doc('filing-reference'))}}:node)}
 assert.equal(row(auditAllSkills(missingReason),'filing').authored_complete,false)
})

test('complete source assembly and actual filing require all origins, attached identities and catalogue retrieval',()=>{
 assert.match(design('business-documents-cycle').understanding_check.expected_evidence.join(' '),/complete three-origin source task/)
 assert.match(design('collection-reference').understanding_check.expected_evidence.join(' '),/missing A2 and wrong associated page/)
 assert.match(design('source-batch').task,/full received\/required\/ready\/held\/missing sets/)
 assert.match(design('document-labels').understanding_check.expected_evidence.join(' '),/attachment to the right document/)
 assert.match(design('document-catalogue').task,/retrieve each actual permitted document/)
 assert.match(design('filing-system').understanding_check.expected_evidence.join(' '),/label does not establish an effective access boundary/)
 assert.match(design('filing-cycle').understanding_check.expected_evidence.join(' '),/exact current actual document must be retrieved/)
})

test('conversion and shared-file checks retain full content, feature-loss contracts and effective inherited permissions',()=>{
 assert.match(design('document-pdf').task,/every required page, text element/)
 assert.match(design('document-pdf').understanding_check.expected_evidence.join(' '),/Unverified accessibility is not reported as established/)
 assert.match(design('table-csv').input,/separate value-only CSV for each identified sheet/)
 assert.match(design('table-csv').input,/text ID 001, a comma-containing field/)
 assert.match(design('table-csv').task,/formulas and formatting remain in XLSX/)
 assert.match(design('document-share').understanding_check.expected_evidence.join(' '),/view-only link does not remove pre-existing edit access/)
 assert.match(design('document-publish').understanding_check.expected_evidence.join(' '),/editor.*correct view or successful upload does not establish/)
 for(const key of ['document-pdf','table-csv','document-publish','document-share'])assert.ok(design('digital-cycle').dependency_basis.some(item=>item.input_id===doc(key)))
})

test('complete current control requires actual changes, full readable content and every declared later operational use',()=>{
 assert.match(design('change-identification').understanding_check.expected_evidence.join(' '),/unauthorised extra contact change is identified/)
 assert.match(design('document-readability').understanding_check.expected_evidence.join(' '),/one readable page does not establish complete required readability/)
 assert.match(design('obsolete-use-control').task,/each listed path, including old links\/shortcuts and a later use interval/)
 assert.match(design('obsolete-use-control').understanding_check.expected_evidence.join(' '),/Unknown uncontrolled copies prevent an unqualified full-control claim/)
 assert.match(design('control-cycle').understanding_check.expected_evidence.join(' '),/Signed records do not establish the actual complete current controlled document state/)
 for(const key of ['change-identification','document-readability','obsolete-use-control'])assert.ok(design('control-cycle').dependency_basis.some(item=>item.input_id===doc(key)))
})

test('repeat authoring preserves exact node content, original IDs, unrelated records and semantic prerequisites',()=>{
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyOfficeDocuments(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.ok(nodes.get(doc('document-pdf')).supporting_sources.some(source=>source.url==='https://support.microsoft.com/en-us/word/export-word-document-as-pdf'))
 assert.ok(nodes.get(doc('document-share')).supporting_sources.some(source=>source.url.includes('see-who-a-file-is-shared-with')))
})

test('obsolete-use method revisions invalidate dependent administration reviews while an unrelated CAD review stays unchanged',()=>{
 const before=createReviewFingerprinter(dataset),changed=structuredClone(nodes.get(doc('obsolete-use-control')))
 changed.learning_design.task+=' Verify the newly declared working-copy location.'
 const next={...dataset,learning_units:dataset.learning_units.map(node=>node.id===changed.id?changed:node)},after=createReviewFingerprinter(next)
 const cad=dataset.roles.find(node=>node.label==='footwear CAD patternmaker')
 assert.notEqual(before(administration.occupation_id,'occupation_pathway'),after(administration.occupation_id,'occupation_pathway'))
 assert.equal(before(cad.id,'occupation_pathway'),after(cad.id,'occupation_pathway'))
})
