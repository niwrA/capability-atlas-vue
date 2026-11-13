import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { footwearMaterialId as material } from '../scripts/profession-footwear-materials.mjs'
import { footwearTechnologyId as technology } from '../scripts/profession-footwear-technology.mjs'
import { footwearQualityId as quality } from '../scripts/profession-footwear-quality.mjs'
import { footwearFinishingPackingId as operator } from '../scripts/profession-footwear-finishing-packing.mjs'
import { footwearQualityControllerId as controller } from '../scripts/profession-footwear-quality-controller.mjs'
import { manufacturingTeamId as team } from '../scripts/profession-manufacturing-teams.mjs'
import { qualityDataId as data } from '../scripts/profession-quality-data.mjs'
import { qualitySystemId as system } from '../scripts/profession-quality-systems.mjs'
import { qualityControlId as control } from '../scripts/profession-quality-control.mjs'
import { technicalCommunicationId as communication } from '../scripts/profession-technical-communication.mjs'
import { finishingId as finish } from '../scripts/profession-finishing.mjs'
import { workshopId as work } from '../scripts/profession-workshop.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const finishing=routeFor('footwear finishing and packing operator'),inspection=routeFor('footwear quality controller')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('the two footwear professions cover their distinct eleven/ten essential sets and actual work outcomes',()=>{
 assert.equal(row(dataset,finishing).complete,true)
 assert.equal(row(dataset,finishing).essentials,11)
 assert.equal(row(dataset,inspection).complete,true)
 assert.equal(row(dataset,inspection).essentials,10)
 assert.equal(finishing.occupation_facets.length,5)
 assert.equal(inspection.occupation_facets.length,8)
 cannotOmit(finishing,['supervisor-brief','finishing-methods','parameter-evidence','appearance-pair','equipment-care','packed-pair','operating-interval'].map(operator))
 cannotOmit(inspection,['inspection-brief','visual-decision','quality-tools-analysis','report-management-handoff','source-system-controls','manufacturing-teamwork','foreign-quality-exchanges','operating-interval'].map(controller))
})

test('actual material identity/layers, upper regions, bottom interfaces, processing and recovery remain separate required concepts',()=>{
 const required=['material-identity','material-properties','material-choice','upper-panels','lining-layer','shape-reinforcement','bottom-assembly','component-processing','component-recovery','component-cycle'].map(material)
 cannotOmit(finishing,required);cannotOmit(inspection,required)
 assert.match(nodes.get(material('material-identity')).learning_design.input,/leather.*textile, plastic and rubber/)
 assert.match(nodes.get(material('component-processing')).learning_design.understanding_check.expected_evidence.join(' '),/approval is not extended/)
 assert.match(nodes.get(material('component-recovery')).learning_design.understanding_check.expected_evidence.join(' '),/does not clear the assembly/)
})

test('footwear process knowledge requires actual upper/bottom cutting, ordered closing, lasting, soling and finishing relations',()=>{
 const required=['cutting-stage','closing-stage','lasting-stage','soling-stage','finishing-stage','technology-cycle'].map(technology)
 cannotOmit(finishing,required);cannotOmit(inspection,required)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===inspection.id)
 copy.steps.find(step=>step.id===technology('technology-cycle')).requires=copy.steps.find(step=>step.id===technology('technology-cycle')).requires.filter(id=>id!==technology('lasting-stage'))
 assert.equal(row(draft,inspection).complete,false,'A plausible stage list cannot omit a canonical intermediate')
 assert.match(nodes.get(technology('closing-stage')).learning_design.understanding_check.expected_evidence.join(' '),/closed seam is not reported as a complete correct upper/)
})

test('finishing requires actual separate named techniques, permitted settings and care rather than footwear knowledge alone',()=>{
 cannotOmit(finishing,['heel-sole-roughing','footwear-colour','bottom-polish','cold-wax','hot-wax','footwear-clean','tack-removal','sock-insertion','hot-air-treeing','cream-dressing','spray-dressing','antique-dressing'].map(finish))
 cannotOmit(finishing,[work('parameter-change'),work('care-cycle'),technology('equipment-care'),technology('machine-care')])
 const inspectionIds=new Set(inspection.steps.map(step=>step.id))
 assert.equal(inspectionIds.has(finish('footwear-cycle')),false,'Quality inspection does not require operating every finishing method')
 assert.equal(inspectionIds.has(work('care-cycle')),false,'Machine/care knowledge must not silently become universal operator-care performance')
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===finish('hot-wax')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,finishing).complete,false)
 assert.equal(row(draft,inspection).complete,true)
})

test('quality control requires current authorised decisions, correct observation/item counts and an understood management report',()=>{
 cannotOmit(inspection,[data('frequency-table'),controller('visual-decision'),controller('quality-tools-analysis'),controller('report-management-handoff')])
 assert.match(nodes.get(controller('visual-decision')).learning_design.understanding_check.expected_evidence.join(' '),/remains held for missing evidence/)
 assert.match(nodes.get(data('frequency-table')).learning_design.understanding_check.expected_evidence.join(' '),/five observations\/four affected items/)
 assert.match(nodes.get(controller('report-management-handoff')).learning_design.understanding_check.expected_evidence.join(' '),/Delivery alone is not called accurate understood reporting/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===data('frequency-table')).learning_design.dependency_basis=[]
 assert.equal(row(draft,inspection).complete,false)
 assert.equal(row(draft,finishing).complete,true)
})

test('complete source-quality, system, foreign-language and textile/clothing team requirements remain visible beyond daily shoe inspection',()=>{
 cannotOmit(inspection,[control('quality-control-cycle'),system('quality-system-cycle'),system('system-corrective'),system('preventive-measure'),communication('foreign-commercial'),communication('foreign-technical'),team('team-cycle')])
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===team('team-handoff')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,inspection).complete,false)
 assert.equal(row(draft,finishing).complete,true)
 assert.match(nodes.get(controller('manufacturing-teamwork')).learning_design.input,/does not silently replace/)
})

test('current footwear quality knowledge requires distinct criteria, defects, methods, equipment and assurance evidence',()=>{
 const required=['quality-criteria','defect-evidence','test-method-evidence','quality-equipment','assurance-cycle'].map(quality)
 cannotOmit(finishing,required);cannotOmit(inspection,required)
 assert.match(nodes.get(quality('assurance-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/Final appearance is not treated as complete quality assurance/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===quality('quality-equipment')).learning_design.understanding_check.materials=''
 assert.equal(row(draft,finishing).complete,false)
 assert.equal(row(draft,inspection).complete,false)
})

test('revising shared footwear quality content invalidates both dependent reviews without changing the distribution route',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===quality('assurance-cycle')).learning_design.task+=' Retain the newly revised actual footwear control point.'
 const after=createReviewFingerprinter(draft)
 for(const route of [finishing,inspection])assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const other=routeFor('leaflet distributor')
 assert.equal(before(other.occupation_id,'occupation_pathway'),after(other.occupation_id,'occupation_pathway'))
})
