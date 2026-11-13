import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { footwearLaboratoryId as technician } from '../scripts/profession-footwear-laboratory.mjs'
import { footwearLaboratoryMethodId as method } from '../scripts/profession-footwear-laboratory-methods.mjs'
import { problemSolvingId as problem } from '../scripts/profession-problem-solving.mjs'
import { qualityEvaluationId as evaluation } from '../scripts/profession-quality-evaluation.mjs'
import { auditParticipationId as audit } from '../scripts/profession-audit-participation.mjs'
import { measurementDataId as data } from '../scripts/profession-measurement-data.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='footwear quality control laboratory technician')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
function cannotOmit(ids){for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('footwear laboratory covers eleven essential skills and every test/report/advice/tool/audit/document/external outcome',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,11)
 assert.deepEqual(new Set(route.skill_coverage.map(mapping=>mapping.key)),new Set(['footmaterials','footcomponents','foottechnology','footquality','manufacturingteams','qualitycontrol','laboratory','problemsolving','productinspection','qualityanalysis','producerevaluation']))
 assert.equal(route.occupation_facets.length,8)
 cannotOmit(['laboratory-brief','test-programme','quality-evidence','producer-advice','product-return-work','quality-tools','audit-document-work','external-linkage','manufacturing-teamwork','problem-response','operating-interval'].map(technician))
})

test('all current programme methods require separate actual evidence and cannot be replaced by one passing laboratory test',()=>{
 cannotOmit(['programme-scope','abrasion-method','tensile-method','tear-method','flex-method','adhesion-method','colour-transfer-method','water-entry-method','external-chemical-case','programme-cycle'].map(method))
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===method('tear-method')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods quality control laboratory technician').complete,true)
 assert.match(nodes.get(method('programme-scope')).learning_design.understanding_check.expected_evidence.join(' '),/separately authored, taught and checked/)
 assert.match(nodes.get(method('programme-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/Duplicate reports do not fill distinct method requirements/)
})

test('a newly required programme method cannot be omitted or filled by an unauthored placeholder',()=>{
 const draft=structuredClone(dataset),extra='atlas:test:additional-footwear-method'
 const node=structuredClone(draft.learning_units.find(node=>node.id===method('abrasion-method')));node.id=extra;delete node.learning_design
 draft.learning_units.push(node)
 draft.decompositions.push({from:extra,to:method('programme-cycle'),type:'prerequisite_for',source:'Test current-producer programme revision',completion_requirement:'required'})
 assert.equal(row(draft).complete,false,'Omitted new canonical method must block the old complete route')
 const copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===method('programme-cycle')).requires.push(extra)
 copy.steps.push({id:extra,stage:'work',mode:'activity',requires:[]})
 assert.equal(row(draft).complete,false,'Listing a method without a complete activity design does not complete it')
})

test('normalised results require their own numerical foundation and retain actual denominator meaning',()=>{
 cannotOmit([data('equal-share'),data('normalised-quantity'),method('tensile-method'),method('adhesion-method')])
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===method('tensile-method')).requires=copy.steps.find(step=>step.id===method('tensile-method')).requires.filter(id=>id!==data('normalised-quantity'))
 assert.equal(row(draft).complete,false)
 assert.match(nodes.get(data('normalised-quantity')).learning_design.understanding_check.expected_evidence.join(' '),/current result is 2 U per V/)
 assert.match(nodes.get(method('tensile-method')).learning_design.understanding_check.expected_evidence.join(' '),/Equal raw loads are not automatically equal normalised results/)
})

test('systematic problem solving requires evidence, synthesis, alternatives, priority, acknowledged planning, real action and evaluation',()=>{
 cannotOmit(['problem-gap','collect-information','synthesise-relations','generate-options','prioritise','organise-plan','facilitate-action','evaluate-learn'].map(problem))
 assert.match(nodes.get(problem('prioritise')).learning_design.understanding_check.expected_evidence.join(' '),/Urgency does not make H ready/)
 assert.match(nodes.get(technician('problem-response')).learning_design.understanding_check.expected_evidence.join(' '),/Capacity does not clear missing method conditions/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===problem('synthesise-relations')).learning_design.dependency_basis=[]
 assert.equal(row(draft).complete,false)
})

test('the broad inspection/evaluation requirements retain actual packaging, different-department sendbacks and detailed producer checks',()=>{
 cannotOmit(['inspection-scope','inspection-methods','packaging-inspection','defect-status','department-sendbacks','inspection-cycle','analysis-scope','analysis-inspection-test','analysis-evaluation','analysis-cycle','producer-scope','producer-detail-check','producer-evaluation'].map(evaluation))
 assert.match(nodes.get(evaluation('department-sendbacks')).learning_design.task,/separate actual preparation- and packaging-department sendback cases/)
 assert.match(nodes.get(evaluation('department-sendbacks')).learning_design.understanding_check.expected_evidence.join(' '),/wrong recipient\/unacknowledged handoff remains unresolved/)
 assert.match(nodes.get(evaluation('producer-detail-check')).learning_design.understanding_check.expected_evidence.join(' '),/Signature or other passing rows do not clear it/)
})

test('internal and external audit participation and controlled-document follow-up cannot substitute for one another',()=>{
 cannotOmit(['criterion-evidence','internal-audit','external-audit','audit-document-followup'].map(audit))
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===audit('external-audit')).learning_design.understanding_check.materials=''
 assert.equal(row(draft).complete,false)
 assert.match(nodes.get(audit('external-audit')).learning_design.understanding_check.expected_evidence.join(' '),/unauthorised information is not disclosed/)
 assert.match(nodes.get(audit('audit-document-followup')).learning_design.understanding_check.expected_evidence.join(' '),/separate from implemented practice/)
})

test('method-specific revisions invalidate this occupation and its shared breakdown review without leaking into the other laboratory route',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===method('flex-method')).learning_design.task+=' Check the revised actual endpoint record.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const shared=route.skill_coverage.find(mapping=>mapping.key==='laboratory')
 assert.notEqual(before(shared.skill_id,'skill_breakdown'),after(shared.skill_id,'skill_breakdown'))
 const other=dataset.roles.find(node=>node.label==='leather goods quality control laboratory technician')
 assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'))
})
