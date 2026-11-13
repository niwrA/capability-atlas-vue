import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { officeAnalysisId as analysis, applyOfficeAnalysis } from '../scripts/profession-office-analysis.mjs'
import { officeSuiteId as office } from '../scripts/profession-office-suite.mjs'
import { professionSource, foundationId as f } from '../scripts/profession-authoring.mjs'
import { preserveIndividualRevisions } from '../scripts/authoring-records.mjs'
import { refinedInputs, refinementId } from '../scripts/foundation-refinement.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditExploration } from '../src/foundation-model.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]},mappings=applyOfficeAnalysis(draft)
const timeKeys=['dated-time-reference','time-duration','timeline-conflicts','coordinate-schedule']
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const design=key=>nodes.get(analysis(key)).learning_design
const skillId=key=>mappings.find(mapping=>mapping.key===key).skill_id
const row=(report,key)=>report.rows.find(row=>row.id===skillId(key))
const administration=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id).label==='administrative assistant')

test('spreadsheet, four-field business research and scheduling have complete source facets and authored prerequisite closures',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[4,5,4])
 for(const mapping of mappings){
  const skill=nodes.get(mapping.skill_id)
  assert.equal(mapping.source_definition,skill.definition)
  assert.equal(row(report,mapping.key).authored_complete,true,mapping.key)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===skill.id&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
  for(const facet of mapping.facets)assert.ok(skill.definition.includes(facet.source_fragment),facet.source_fragment)
  assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 }
 for(const id of [...mappings.flatMap(mapping=>mapping.activity_ids),...timeKeys.map(analysis)]){
  const node=nodes.get(id)
  assert.equal(node.source,professionSource)
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  assert.equal(node.learning_design.scope,'activity')
  assert.equal(node.learning_design.effort.observed,false)
  assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
})

test('old completion cannot bypass any actual new spreadsheet, research or time/scheduling activity',()=>{
 const actual=administration.steps.map(step=>nodes.get(step.id)),done=new Set(administration.steps.map(step=>step.id))
 assert.equal(evaluatePilot(administration,actual,done).complete,true)
 for(const mapping of mappings)for(const id of mapping.activity_ids){
  const partial=new Set(done);partial.delete(id)
  assert.ok(done.has(id),id)
  assert.equal(evaluatePilot(administration,actual,partial).steps.get(mapping.skill_id).done,false,id)
 }
 for(const id of timeKeys.map(analysis)){
  assert.ok(done.has(id),id)
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(administration,actual,partial).steps.get(skillId('scheduling')).done,false,id)
 }
})

test('a practice-only chart or missing exact dated-time rationale blocks its own source branch without inventing unrelated barriers',()=>{
 const chart=nodes.get(analysis('chart-create'))
 const invalid={...dataset,learning_units:dataset.learning_units.map(node=>node.id===chart.id?{...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}:node)}
 const report=auditAllSkills(invalid)
 assert.equal(row(report,'spreadsheets').authored_complete,false)
 assert.equal(row(report,'businessresearch').authored_complete,true)
 assert.equal(row(report,'scheduling').authored_complete,true)
 const time=nodes.get(analysis('time-duration'))
 const missing={...dataset,learning_units:dataset.learning_units.map(node=>node.id===time.id?{...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==analysis('dated-time-reference'))}}:node)}
 assert.equal(row(auditAllSkills(missing),'scheduling').authored_complete,false)
})

test('actual spreadsheet math, complete organisation and data-bound diagrams cannot be replaced by a picture or stale range',()=>{
 const parents=design('spreadsheet-cycle').dependency_basis.map(item=>item.input_id)
 for(const id of [office('sheet-cells'),office('sheet-calculation'),office('table-sort'),office('table-filter'),analysis('chart-create')])assert.ok(parents.includes(id),id)
 assert.match(design('chart-create').input,/approved source range excluding a separate total/)
 assert.match(design('chart-create').task,/count B from 4 to 5/)
 assert.match(design('chart-create').understanding_check.expected_evidence.join(' '),/Every actual category\/value\/reference and changed-input result/)
 assert.match(design('chart-meaning').understanding_check.expected_evidence.join(' '),/does not establish a cause or business forecast/)
})

test('business research requires actual complete relevant legal, accounting, finance and commercial evidence rather than links or advice',()=>{
 for(const key of ['research-reference','research-search','research-collection','research-cycle'])assert.match(design(key).input+' '+design(key).task,/legal.*accounting.*finance.*commercial/)
 assert.match(design('research-search').task,/actual query\/source path, issuer, publication\/effective\/reference\/access dates/)
 assert.match(design('research-source-check').task,/later amendments or replacement statistical series/)
 assert.match(design('research-source-check').task,/do not infer legal compliance.*finance eligibility\/suitability or business demand/)
 assert.match(design('research-collection').understanding_check.expected_evidence.join(' '),/Four headings or many URLs do not establish complete source-faithful information/)
 assert.match(design('research-cycle').understanding_check.expected_evidence.join(' '),/Success in three fields does not establish all required/)
 assert.ok(nodes.get(analysis('research-search')).supporting_sources.some(source=>source.url.includes('frc.org.uk/library/standards')))
})

test('timed feasibility retains complete intervals, actual reference, all resources/dependencies and model versus actual plan results',()=>{
 assert.match(design('dated-time-reference').understanding_check.expected_evidence.join(' '),/Matching clock labels do not establish the same instant/)
 assert.match(design('dated-time-reference').understanding_check.expected_evidence.join(' '),/unsupported ambiguous local time stays unresolved/)
 assert.match(design('time-duration').understanding_check.expected_evidence.join(' '),/full 40-minute requirement exceeds the 30-minute available window/)
 assert.match(design('timeline-conflicts').task,/every affected interval/)
 assert.match(design('coordinate-schedule').task,/model practice distinct from actual calendar entry, confirmed appointments or performed work/)
 assert.match(design('coordinate-schedule').understanding_check.expected_evidence.join(' '),/70 minutes of required work fit the 60-minute window/)
 assert.match(design('schedule-build').task,/every required procedure step\/appointment and approved working-hour condition/)
 assert.match(design('schedule-revision').understanding_check.expected_evidence.join(' '),/planner edit does not by itself cancel or confirm/)
})

test('the preserved scheduling and duration IDs retain input history and every comparison uses their current declared refinement',()=>{
 assert.equal(analysis('coordinate-schedule'),f('schedule'))
 assert.equal(analysis('time-duration'),f('time-duration'))
 assert.deepEqual(nodes.get(analysis('coordinate-schedule')).previous_authored_draft.required_inputs,[f('sequence'),f('time-duration')])
 assert.deepEqual(nodes.get(analysis('time-duration')).previous_authored_draft.required_inputs,['atlas:alu:pilot:shelf-filler:count-and-compare','atlas:alu:pilot:shelf-filler:read-symbols','atlas:alu:pilot:shelf-filler:two-step-routine'])
 const expected=refinedInputs.schedule.map(refinementId),change=dataset.pathway_exploration.refinement.changes.find(change=>change.target_id===f('schedule'))
 assert.deepEqual(change.after,expected)
 assert.deepEqual(design('coordinate-schedule').dependency_basis.map(item=>item.input_id),expected)
 for(const route of [dataset.pilot_pathway,...dataset.pathway_exploration.routes]){
  const step=route.steps.find(step=>step.id===f('schedule'))
  if(step)assert.deepEqual([...step.requires].sort(),[...expected].sort(),route.id)
 }
 assert.equal(auditExploration(dataset).valid,true)
})

test('comparison proposal generation cannot overwrite complete current individual time foundations and repeated authoring is byte-stable',()=>{
 const current=timeKeys.map(key=>nodes.get(analysis(key)))
 const earlier=current.map(node=>({id:node.id,kind:'learning_unit',source:'Earlier comparison sketch',definition:'Earlier unreviewed task'}))
 assert.deepEqual(preserveIndividualRevisions(dataset.learning_units,earlier),current)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyOfficeAnalysis(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
})

test('actual chart-method revisions invalidate dependent administration review without changing an unrelated CAD occupation',()=>{
 const before=createReviewFingerprinter(dataset),changed=structuredClone(nodes.get(analysis('chart-create')))
 changed.learning_design.task+=' Verify the newly required actual series reference.'
 const next={...dataset,learning_units:dataset.learning_units.map(node=>node.id===changed.id?changed:node)},after=createReviewFingerprinter(next)
 const cad=dataset.roles.find(node=>node.label==='footwear CAD patternmaker')
 assert.notEqual(before(administration.occupation_id,'occupation_pathway'),after(administration.occupation_id,'occupation_pathway'))
 assert.equal(before(cad.id,'occupation_pathway'),after(cad.id,'occupation_pathway'))
})
