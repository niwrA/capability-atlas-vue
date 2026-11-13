import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyEngineeringMethods,engineeringMethodsId as engineering} from '../scripts/profession-engineering-methods.mjs'
import {applyResearchAssistance,researchAssistanceId as research} from '../scripts/profession-research-assistance.mjs'
import {engineeringAssistantId as assistant} from '../scripts/profession-engineering-assistant.mjs'
import {applyMathematics} from '../scripts/profession-mathematics.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {auditProfessions} from '../src/profession-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),mappings=[...applyEngineeringMethods(draft),...applyResearchAssistance(draft)]
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='engineering assistant'),route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const row=(report,id)=>report.rows.find(row=>row.id===id),required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const source=key=>mappings.find(mapping=>mapping.key===key).skill_id

test('four full engineering/research sources preserve exact facets and 24 unique whole methods with causal prerequisite accounts',()=>{
 const report=auditAllSkills(dataset)
 assert.deepEqual(mappings.map(mapping=>mapping.activity_ids.length),[7,6,6,11]);assert.equal(new Set(mappings.flatMap(mapping=>mapping.activity_ids)).size,24)
 assert.deepEqual(mappings[1].activity_ids,mappings[2].activity_ids,'The same genuine interaction methods are shared, not duplicated by source label')
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

test('engineering assistant requires all nine exact essentials, four full occupation clauses and nine contextual activities',()=>{
 const result=row(auditProfessions(dataset),role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers));assert.equal(role.source_status,'released')
 assert.equal(route.skill_coverage.length,9);assert.equal(route.occupation_facets.length,4);assert.equal(route.occupation_outcomes.length,9)
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort())
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes)assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id)
})

test('marked gates cannot bypass any new engineering/research/context activity or the full mathematics branch',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id)),[math]=applyMathematics(structuredClone(dataset))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 const ids=new Set([...mappings.flatMap(mapping=>mapping.activity_ids),...route.occupation_outcomes,...math.activity_ids]);assert.equal(ids.size,61)
 for(const id of ids){const partial=new Set(done);assert.ok(partial.delete(id),id);assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})

test('function or material cost cannot replace full replication, complete costs, all other necessary principles and trade-off analysis',()=>{
 const broken=changed(['replicability-analysis','cost-analysis','other-principles','principle-tradeoffs'].map(engineering),node=>({...node,learning_design:undefined}))
 assert.equal(row(auditAllSkills(broken),source('engineeringprinciples')).authored_complete,false)
 const invalid=changed([engineering('replicability-analysis')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(row(auditAllSkills(invalid),source('engineeringprinciples')).authored_complete,false)
})

test('meeting attendance cannot replace actual current information, discussion, usable contribution and independent common understanding',()=>{
 const broken=changed(['engineering-information','engineering-discussion','engineering-contribution','understanding-reference'].map(engineering),node=>({...node,learning_design:undefined})),report=auditAllSkills(broken)
 assert.equal(row(report,source('engineercollaboration')).authored_complete,false)
 assert.equal(row(report,source('engineerliaison')).authored_complete,false)
})

test('experiment reports or numerical fits cannot replace any actual development, substantive theory or research-quality method',()=>{
 for(const key of ['controlled-comparison','experimental-performance','research-analysis','development-contribution','explanatory-model','theory-testing','theory-contribution','research-quality-control']){
  const broken=changed([research(key)],node=>({...node,learning_design:undefined}))
  assert.equal(row(auditAllSkills(broken),source('researchassistance')).authored_complete,false,key)
 }
})

test('full source skills cannot replace actual file monitoring, experiment assistance, site participation or information collection',()=>{
 for(const key of ['file-monitoring','research-collaboration','site-visit-reference','site-visit-work','information-collection']){
  const broken=changed([assistant(key)],node=>({...node,learning_design:undefined}));assert.equal(row(auditProfessions(broken),role.id).complete,false,key)
 }
 const missingTheory=changed([research('theory-contribution')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==research('theory-testing'))}}))
 assert.equal(row(auditAllSkills(missingTheory),source('researchassistance')).authored_complete,false)
 const missingSite=changed([assistant('site-visit-work')],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==assistant('site-visit-reference'))}}))
 assert.equal(row(auditProfessions(missingSite),role.id).complete,false)
})

test('six earlier scaffold IDs and canonical first-to-second dependencies survive byte-stable authoring and unchanged official sources',()=>{
 for(const [factory,first,last] of [[engineering,'principle-reference','principle-cycle'],[engineering,'understanding-reference','liaison-cycle'],[research,'research-reference','research-cycle']]){
  assert.match(factory(first),/^atlas:esco-breakdown:.*:1$/);assert.match(factory(last),/^atlas:esco-breakdown:.*:2$/)
  for(const key of [first,last])assert.ok(nodes.get(factory(key)).previous_authored_draft)
  assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===factory(first)&&edge.to===factory(last)&&required(edge)))
 }
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 applyEngineeringMethods(draft);applyResearchAssistance(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('substantive theory-contribution revisions invalidate research and engineering review while independent funeral/promotion contexts stay stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([research('theory-contribution')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck the full actual accepted explanatory contribution and current derivation.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source('researchassistance'),'skill_breakdown'),after(source('researchassistance'),'skill_breakdown'))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['funeral attendant','promotion assistant']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
