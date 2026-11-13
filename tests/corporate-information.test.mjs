import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { corporateInformationId as corporate, corporateInformationSkillId, applyCorporateInformation } from '../scripts/profession-corporate-information.mjs'
import { communicationFoundationId as communication, applyCommunicationFoundations } from '../scripts/profession-communication-foundations.mjs'
import { foundationId as f, professionSource } from '../scripts/profession-authoring.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const corporateKeys=['clarify','locate','explain','resolve-doubt','distribute-review']
const communicationKeys=['share-attention-and-turns','connect-symbols-with-meaning','use-first-meaningful-message','expand-and-combine-messages','ask-and-listen']
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const design=id=>nodes.get(id).learning_design
const administration=dataset.pathway_exploration.routes.find(route=>nodes.get(route.occupation_id).label==='administrative assistant')

test('all five original corporate-information activities preserve source breadth and genuine required inputs',()=>{
 const skill=nodes.get(corporateInformationSkillId)
 assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===skill.id&&required(edge)).map(edge=>edge.to).sort(),corporateKeys.map(corporate).sort())
 for(const key of corporateKeys){
  const node=nodes.get(corporate(key))
  assert.equal(node.source,professionSource)
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  assert.ok(node.previous_authored_draft)
  assert.equal(node.supporting_sources[0].url,skill.source_url)
  const incoming=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===node.id&&required(edge))
  assert.equal(incoming.length,3)
  assert.deepEqual(incoming.map(edge=>edge.from).sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
 }
 const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]},mapping=applyCorporateInformation(draft)
 assert.equal(mapping.source_definition,skill.definition)
 for(const facet of mapping.facets)assert.ok(skill.definition.includes(facet.source_fragment),facet.source_fragment)
 assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(corporateKeys.map(corporate)))
 assert.equal(auditAllSkills(dataset).rows.find(row=>row.id===skill.id).authored_complete,true)
})

test('the complete supported communication chain preserves earlier canonical inputs and does not create a new starting assumption',()=>{
 const ids=communicationKeys.map(communication),starts=dataset.starting_foundations.entries.map(entry=>entry.id)
 assert.equal(starts.length,4)
 assert.ok(starts.includes(communication('respond-to-early-signals')))
 const expected=[communication('respond-to-early-signals'),...communicationKeys.slice(0,4).map(communication)]
 for(const [index,id] of ids.entries()){
  const node=nodes.get(id),parents=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from)
  assert.equal(node.source,professionSource)
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  assert.ok(parents.includes(expected[index]))
  assert.ok(!starts.includes(id))
  assert.ok(node.previous_authored_draft)
  assert.match(node.learning_design.reuse.context,/not age milestones, screening, therapy, AAC eligibility requirements/)
  assert.equal(node.learning_design.effort.observed,false)
 }
 const temporary=ids.map(id=>({id:'atlas:test:communication:'+id.split(':').at(-1),label:id,kind:'skill',source:'Test'}))
 const draft={...dataset,capabilities:[...dataset.capabilities,...temporary],decompositions:[...dataset.decompositions,...temporary.map((node,index)=>({from:node.id,to:ids[index],type:'decomposes_into',completion_requirement:'required'}))]}
 const report=auditAllSkills(draft)
 for(const target of temporary)assert.equal(report.rows.find(row=>row.id===target.id).authored_complete,true,target.id)
 assert.deepEqual(design(communication('ask-and-listen')).dependency_basis.map(item=>item.input_id).sort(),[communication('expand-and-combine-messages'),'atlas:alu:pilot:shelf-filler:choice-and-pause'].sort())
})

test('old comparison completion cannot bypass any new corporate or intermediate communication activity',()=>{
 const actual=administration.steps.map(step=>nodes.get(step.id)),done=new Set(administration.steps.map(step=>step.id))
 assert.equal(evaluatePilot(administration,actual,done).complete,true)
 for(const id of [...corporateKeys.map(corporate),...communicationKeys.map(communication),f('audience'),f('versions')]){
  assert.ok(done.has(id),id)
  const partial=new Set(done);partial.delete(id)
  const state=evaluatePilot(administration,actual,partial)
  assert.equal(state.steps.get(corporateInformationSkillId).done,false,id)
  assert.equal(state.complete,false,id)
 }
})

test('a missing intermediate design, practice-only scope or unexplained genuine prerequisite blocks corporate authored closure',()=>{
 for(const change of [
  node=>{delete node.learning_design},
  node=>{node.learning_design.scope='practice_sequence'},
  node=>{node.learning_design.dependency_basis=[]},
 ]){
  const target=structuredClone(nodes.get(communication('connect-symbols-with-meaning')));change(target)
  const draft={...dataset,learning_units:dataset.learning_units.map(node=>node.id===target.id?target:node)}
  assert.equal(auditAllSkills(draft).rows.find(row=>row.id===corporateInformationSkillId).authored_complete,false)
 }
})

test('actual answer, corrected understanding, accepted referral and recipient-side distribution remain separate',()=>{
 assert.match(design(corporate('explain')).task,/public registration at P and eligibility review by the owner, staff reservation through S with availability confirmation/)
 assert.match(design(corporate('locate')).understanding_check.expected_evidence.join(' '),/simulated regulation is not represented as current real legal advice/)
 assert.match(design(corporate('resolve-doubt')).understanding_check.expected_evidence.join(' '),/Referral acceptance does not establish the answer or corrected understanding/)
 assert.match(design(corporate('distribute-review')).task,/proposed, accepted, approved, published and actually received states/)
 assert.match(design(corporate('distribute-review')).understanding_check.expected_evidence.join(' '),/complete correct recipient-side information/)
 assert.match(design(communication('ask-and-listen')).understanding_check.expected_evidence.join(' '),/not reported as accepting before a response/)
 assert.match(design(communication('use-first-meaningful-message')).task,/never claims to establish the first message in the person/)
 assert.match(design(communication('share-attention-and-turns')).understanding_check.expected_evidence.join(' '),/No eye-contact, speech or forced-turn requirement/)
})

test('reapplying communication and corporate authoring preserves retained drafts and unrelated records exactly',()=>{
 const draft={...dataset,learning_units:[...dataset.learning_units],decompositions:[...dataset.decompositions]}
 const before=JSON.stringify(draft.learning_units),edges=draft.decompositions.map(edge=>JSON.stringify(edge)).sort()
 applyCommunicationFoundations(draft);applyCorporateInformation(draft)
 assert.equal(JSON.stringify(draft.learning_units),before)
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),edges)
 for(const key of communicationKeys.slice(0,4)){
  const node=nodes.get(communication(key))
  assert.equal(node.learning_domain,'communication')
  assert.equal(node.previous_authored_draft.learning_domain,'life_parent_early_communication')
  assert.ok(node.previous_authored_draft.supporting_sources.some(source=>source.url.includes('developmental-milestones')))
  assert.ok(node.supporting_sources.every(source=>!source.url.includes('developmental-milestones')))
 }
})

test('corporate answer revisions invalidate the dependent administrative review without changing an unrelated CAD review',()=>{
 const before=createReviewFingerprinter(dataset),target=structuredClone(nodes.get(corporate('explain')))
 target.learning_design.task+=' Recheck the new current approved passage.'
 const draft={...dataset,learning_units:dataset.learning_units.map(node=>node.id===target.id?target:node)},after=createReviewFingerprinter(draft)
 const cad=dataset.roles.find(node=>node.label==='footwear CAD patternmaker')
 assert.notEqual(before(administration.occupation_id,'occupation_pathway'),after(administration.occupation_id,'occupation_pathway'))
 assert.equal(before(cad.id,'occupation_pathway'),after(cad.id,'occupation_pathway'))
})
