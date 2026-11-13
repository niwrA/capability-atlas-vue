import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {applyMathematics,mathematicsId as math} from '../scripts/profession-mathematics.mjs'
import {measurementDataId as quantity} from '../scripts/profession-measurement-data.mjs'
import {auditAllSkills} from '../src/pathway-audit.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const draft=structuredClone(dataset),[mapping]=applyMathematics(draft),source=mapping.skill_id
const required=edge=>edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'
const changed=(ids,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>ids.includes(node.id)?change(structuredClone(node)):node)})
const result=data=>auditAllSkills(data).rows.find(row=>row.id===source)

test('mathematics retains its full exact knowledge source and every literal topic, conjecture/proof and field/application facet',()=>{
 assert.equal(nodes.get(source).esco_skill_type,'knowledge')
 assert.equal(mapping.source_definition,nodes.get(source).definition)
 assert.equal(mapping.activity_ids.length,28);assert.equal(mapping.facets.length,4)
 for(const facet of mapping.facets)assert.ok(mapping.source_definition.includes(facet.source_fragment),facet.source_fragment)
 assert.deepEqual(new Set(mapping.facets.flatMap(facet=>facet.activity_ids)),new Set(mapping.activity_ids))
 const row=result(dataset);assert.equal(row.authored_complete,true,JSON.stringify(row.blockers));assert.equal(row.all_inputs_connected,true)
 assert.deepEqual(new Set(row.starting_ids),new Set(dataset.starting_foundations.entries.map(entry=>entry.id)))
})

test('all 28 mathematics intermediates are whole focused designs with complete current causal prerequisite accounts',()=>{
 assert.deepEqual(dataset.decompositions.filter(edge=>edge.type==='decomposes_into'&&edge.from===source&&required(edge)).map(edge=>edge.to).sort(),[...mapping.activity_ids].sort())
 for(const id of mapping.activity_ids){
  const node=nodes.get(id);assert.equal(assessLearningDesign(node).status,'draft_ready',id)
  assert.equal(node.learning_design.scope,'activity');assert.equal(node.learning_design.effort.observed,false)
  const inputs=dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===id&&required(edge)).map(edge=>edge.from)
  assert.deepEqual(inputs.sort(),node.learning_design.dependency_basis.map(item=>item.input_id).sort())
  for(const input of inputs)assert.ok(nodes.has(input),input)
 }
})

test('marked source gates cannot replace any mathematics concept in the complete canonical AND closure',()=>{
 const starts=new Set(dataset.starting_foundations.entries.map(entry=>entry.id)),steps=new Map()
 const visit=id=>{
  if(steps.has(id))return
  const node=nodes.get(id);assert.ok(node,id)
  const inputs=starts.has(id)?[]:[...new Set(dataset.decompositions.filter(edge=>required(edge)&&((edge.type==='decomposes_into'&&edge.from===id)||(edge.type==='prerequisite_for'&&edge.to===id))).map(edge=>edge.type==='decomposes_into'?edge.to:edge.from))]
  steps.set(id,{id,mode:node.kind==='learning_unit'?'activity':'gate',stage:'all',requires:inputs});for(const input of inputs)visit(input)
 }
 visit(source)
 const route={entry_ids:[...starts].filter(id=>steps.has(id)),end_ids:[source],stages:[{id:'all'}],steps:[...steps.values()]},actual=[...steps.keys()].map(id=>nodes.get(id)),done=new Set(steps.keys())
 const full=evaluatePilot(route,actual,done);assert.equal(full.valid,true,JSON.stringify(full.errors));assert.equal(full.complete,true)
 for(const id of mapping.activity_ids){const partial=new Set(done);assert.ok(partial.delete(id));assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
})

test('quantity answers cannot replace structure, spatial, change, chance or statistical knowledge',()=>{
 const broken=changed(['sets','variable','equation','function','coordinate','shape','area','interval-rate','chance-model','statistical-evidence'].map(math),node=>({...node,learning_design:undefined}))
 assert.equal(result(broken).authored_complete,false)
 const practiceOnly=changed([math('fields-applications')],node=>({...node,learning_design:{...node.learning_design,scope:'practice_sequence'}}))
 assert.equal(result(practiceOnly).authored_complete,false)
})

test('patterns, precise conjectures, valid counterexamples and general deductive reasons remain distinct required activities',()=>{
 for(const key of ['logical-claim','pattern','conjecture','counterexample','proof']){
  const broken=changed([math(key)],node=>({...node,learning_design:undefined}));assert.equal(result(broken).authored_complete,false,key)
 }
})

test('missing domain-to-variable, arithmetic-to-proof or reference-quantity-to-rate rationale invalidates knowledge completion',()=>{
 for(const [target,input] of [[math('variable'),math('sets')],[math('proof'),math('distributive-structure')],[math('interval-rate'),quantity('normalised-quantity')]]){
  const broken=changed([target],node=>({...node,learning_design:{...node.learning_design,dependency_basis:node.learning_design.dependency_basis.filter(item=>item.input_id!==input)}}))
  assert.equal(result(broken).authored_complete,false,target)
 }
})

test('both earlier mathematics IDs and canonical first-to-second dependency survive stable authoring without changing official source or route state',()=>{
 assert.equal(math('reference'),'atlas:esco-breakdown:4339176e-3acd-4f7f-a5d9-445bee3d23f2:1')
 assert.equal(math('cycle'),'atlas:esco-breakdown:4339176e-3acd-4f7f-a5d9-445bee3d23f2:2')
 for(const key of ['reference','cycle'])assert.ok(nodes.get(math(key)).previous_authored_draft)
 assert.ok(dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===math('reference')&&edge.to===math('cycle')&&required(edge)))
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units));applyMathematics(draft)
 assert.equal(JSON.stringify(draft.learning_units),JSON.stringify(dataset.learning_units))
 assert.deepEqual(draft.decompositions.map(edge=>JSON.stringify(edge)).sort(),dataset.decompositions.map(edge=>JSON.stringify(edge)).sort())
 for(const key of ['roles','capabilities','role_capability_assertions','profession_pathways','starting_foundations','pathway_audit_baseline'])assert.deepEqual(draft[key],dataset[key],key)
})

test('proof revisions invalidate mathematics review while independent completed occupation reviews remain stable',()=>{
 const before=createReviewFingerprinter(dataset),revised=changed([math('proof')],node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Recheck the full current arbitrary-domain reasoning and explicit assumptions.'}})),after=createReviewFingerprinter(revised)
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const engineering=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='engineering assistant')
 assert.notEqual(before(engineering.id,'occupation_pathway'),after(engineering.id,'occupation_pathway'))
 for(const label of ['funeral attendant','promotion assistant']){const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'),label)}
})
