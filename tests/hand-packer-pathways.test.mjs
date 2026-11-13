import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { handPackerId as hand } from '../scripts/profession-hand-packer.mjs'
import { workInstructionId as instruction } from '../scripts/profession-work-instructions.mjs'
import { packagingKnowledgeId as knowledge } from '../scripts/profession-packaging-knowledge.mjs'
import { labelHandlingId as labels } from '../scripts/profession-labels-handling.mjs'
import { packingId as packing } from '../scripts/profession-packing.mjs'
import { packagingEquipmentId as equipment } from '../scripts/profession-packaging-equipment.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='hand packer')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
function cannotOmit(ids){for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('hand packing requires all ten official essentials and actual collection, packing and label outcomes',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,10)
 assert.deepEqual(new Set(route.skill_coverage.map(mapping=>mapping.key)),new Set(['writteninstructions','checklists','packmaterials','packprocess','goodslabels','heavyhandling','packgoods','stackgoods','packequipment','securegoods']))
 cannotOmit(['collect-assignment','manual-packing-methods','goods-label-verification','operating-interval'].map(hand))
 assert.equal(route.occupation_facets.length,2)
 // A generic hand-packing route must not inherit a leather warehouse/system job.
 assert.equal(route.steps.some(step=>step.id.includes('leather-warehouse:')||step.id.includes('leather-goods-packing:')),false)
})

test('written access, actual conditional procedure and every-item checklist evidence remain separate required activities',()=>{
 cannotOmit(['written-reference','written-sequence','written-cycle','checklist-scope','checklist-evidence','checklist-cycle'].map(instruction))
 assert.match(nodes.get(instruction('written-reference')).learning_design.understanding_check.evidence_scope,/independent word decoding/)
 assert.match(nodes.get(instruction('written-sequence')).learning_design.understanding_check.materials,/occupied tray B/)
 assert.match(nodes.get(instruction('checklist-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/fully ticked form does not establish compliance/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===instruction('written-sequence')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods packing operator').complete,true)
})

test('material properties, conversion, label storage and each packaging-process knowledge branch are required',()=>{
 cannotOmit(['material-properties','material-conversion','label-material-storage','materials-cycle','design-development','decoration-printing','machinery-line-flow','process-cycle'].map(knowledge))
 assert.match(nodes.get(knowledge('material-conversion')).learning_design.task,/manufacturing machines/)
 assert.match(nodes.get(knowledge('machinery-line-flow')).learning_design.understanding_check.materials,/wrong roll identity/)
 assert.match(nodes.get(knowledge('process-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/separate from line\/material acceptance/)
})

test('current legal and other applicable label information cannot be replaced by a readable printed label',()=>{
 cannotOmit(['label-applicability','label-field-check','label-physical-check','label-compliance-cycle'].map(labels))
 cannotOmit([equipment('marking-labelling-tool'),hand('goods-label-verification')])
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='goodslabels')
 assert.ok(mapping.facets.some(facet=>facet.source_fragment==='legal, technological, hazardous and others'))
 assert.match(nodes.get(labels('label-applicability')).learning_design.input,/not real legal obligations/)
 assert.match(nodes.get(labels('label-field-check')).learning_design.understanding_check.expected_evidence.join(' '),/Presence and readability alone/)
 assert.match(nodes.get(labels('label-physical-check')).learning_design.understanding_check.materials,/swapped labels/)
})

test('heavier-load work requires actual assessment and separately taught performance with exact support boundaries',()=>{
 cannotOmit(['handling-assessment','assessed-lifting-method','heavy-handling-cycle'].map(labels))
 cannotOmit([hand('handling-assignment')])
 const method=nodes.get(labels('assessed-lifting-method')).learning_design
 assert.match(method.input,/qualified assessment permits a real selected lifting task/)
 assert.match(method.understanding_check.evidence_scope,/light prop.*not independent manual lifting evidence/)
 assert.match(nodes.get(labels('handling-assessment')).learning_design.understanding_check.expected_evidence.join(' '),/does not substitute an unassessed unaided lift/)
 assert.match(nodes.get(labels('heavy-handling-cycle')).learning_design.understanding_check.materials,/harmless model only pending review/)
})

test('hand packing retains all container, stacking, actual equipment and securing methods',()=>{
 cannotOmit(['manual-box','manual-bag','manual-other-container','stack-plan','stack-cycle'].map(packing))
 cannotOmit(['plastic-strapping','adhesive-applicator','tape-tool','marking-labelling-tool','band-result','secure-cycle'].map(equipment))
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===hand('manual-packing-methods')).requires=copy.steps.find(step=>step.id===hand('manual-packing-methods')).requires.filter(id=>id!==equipment('secure-cycle'))
 assert.equal(row(draft).complete,false,'Canonical securing input cannot be omitted from a contextual route')
})

test('all new hand-packing intermediates have concrete changed-case tasks and unobserved provisional effort',()=>{
 for(const step of route.steps){const node=nodes.get(step.id);if(node.kind!=='learning_unit'||node.authoring_origin!=='individual')continue
  assert.equal(assessLearningDesign(node).status,'draft_ready',node.label)
  assert.equal(node.learning_design.effort.observed,false,node.label)
  assert.equal(node.learning_design.effort.confidence,'low',node.label)
  assert.ok(node.learning_design.understanding_check.materials,node.label)
 }
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===labels('label-field-check')).learning_design.dependency_basis=[]
 assert.equal(row(draft).complete,false,'Unexplained intermediates cannot count as complete')
})
