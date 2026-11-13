import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { laboratoryTestingId as lab } from '../scripts/profession-laboratory-testing.mjs'
import { environmentalManufacturingId as environment } from '../scripts/profession-environmental-manufacturing.mjs'
import { measurementDataId as data } from '../scripts/profession-measurement-data.mjs'
import { leatherLaboratoryId as technician } from '../scripts/profession-leather-laboratory.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods quality control laboratory technician')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
function cannotOmit(ids){for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('laboratory technician covers ten essential sources and all actual standard, test, report, external and proposal outcomes',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,10)
 assert.deepEqual(new Set(route.skill_coverage.map(mapping=>mapping.key)),new Set(['materials','components','processes','quality','digital','qualitycontrol','foreigncommercial','qualitysystems','laboratory','environment']))
 assert.equal(route.occupation_facets.length,7)
 cannotOmit(['actual-laboratory-work','analysis-report','external-cooperation','corrective-preventive','quality-system-work','environment-work','foreign-exchange','digital-report-handoff','operating-interval'].map(technician))
 assert.equal(route.steps.some(step=>step.id.includes('leather-quality-controller:')),false,'Shared source methods do not require the full other occupation')
})

test('a referral or report cannot replace actual sample preparation, conditions, setup, performance and raw data',()=>{
 cannotOmit(['standard-scope','specimen-plan','specimen-preparation','conditioning-record','procedure-preparation','laboratory-performance','valid-data-set'].map(lab))
 assert.match(nodes.get(lab('standard-scope')).learning_design.understanding_check.expected_evidence.join(' '),/scope mismatch remains unresolved/)
 assert.match(nodes.get(lab('conditioning-record')).learning_design.understanding_check.expected_evidence.join(' '),/Elapsed time does not establish the missing condition/)
 assert.match(nodes.get(lab('laboratory-performance')).learning_design.understanding_check.expected_evidence.join(' '),/not reported as complete valid data/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===lab('laboratory-performance')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods quality controller').complete,true)
})

test('laboratory analysis retains separate numerical foundations and actual valid input-set dependencies',()=>{
 cannotOmit(['same-unit-sum','equal-share','arithmetic-mean'].map(data))
 cannotOmit([lab('valid-data-set'),lab('result-analysis'),lab('interpretation-rule')])
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===lab('result-analysis')).requires=copy.steps.find(step=>step.id===lab('result-analysis')).requires.filter(id=>id!==data('arithmetic-mean'))
 assert.equal(row(draft).complete,false,'A plausible laboratory context cannot skip its canonical calculation foundation')
 assert.match(nodes.get(lab('valid-data-set')).learning_design.understanding_check.expected_evidence.join(' '),/A remains in the valid set/)
 assert.match(nodes.get(lab('result-analysis')).learning_design.understanding_check.expected_evidence.join(' '),/three-reading mean is 4 U/)
})

test('reports and outsourced tests preserve sample, method, construction and decision scope',()=>{
 cannotOmit(['laboratory-report','outsourced-laboratory','laboratory-cycle'].map(lab))
 assert.match(nodes.get(lab('laboratory-report')).learning_design.understanding_check.expected_evidence.join(' '),/Signature does not clear the specimen\/result mismatch/)
 assert.match(nodes.get(lab('outsourced-laboratory')).learning_design.understanding_check.expected_evidence.join(' '),/method\/construction gap remains unresolved/)
 assert.match(nodes.get(lab('interpretation-rule')).learning_design.understanding_check.expected_evidence.join(' '),/inconclusive\/referred/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===lab('laboratory-cycle')).requires=copy.steps.find(step=>step.id===lab('laboratory-cycle')).requires.filter(id=>id!==lab('outsourced-laboratory'))
 assert.equal(row(draft).complete,false,'Internal test success cannot omit required external cooperation')
})

test('the essential environmental branch requires actual different-stage practices and compatible scoped results',()=>{
 cannotOmit(['stage-boundary','flow-inventory','release-risk','prevent-material-waste','reduce-process-loss','verify-impact','environment-cycle'].map(environment))
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='environment')
 assert.ok(mapping.facets.some(facet=>facet.source_fragment==='Reduce environmentally harmful work practices in different stages'))
 assert.match(nodes.get(environment('stage-boundary')).learning_design.understanding_check.expected_evidence.join(' '),/not reported as eliminating the finishing impact/)
 assert.match(nodes.get(environment('reduce-process-loss')).learning_design.understanding_check.expected_evidence.join(' '),/mandatory control is preserved/)
 assert.match(nodes.get(environment('verify-impact')).learning_design.understanding_check.expected_evidence.join(' '),/not reported as overall environmental improvement/)
})

test('unexplained sample handling and missing changed environmental cases prevent authored completion',()=>{
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===lab('specimen-preparation')).learning_design.dependency_basis=[]
 assert.equal(row(draft).complete,false)
 const other=structuredClone(dataset)
 other.learning_units.find(node=>node.id===environment('verify-impact')).learning_design.understanding_check.materials=''
 assert.equal(row(other).complete,false)
 assert.equal(auditProfessions(other).rows.find(row=>row.label==='hand packer').complete,true)
})

test('changed actual lab-method or environment evidence invalidates dependent source reviews while the unrelated distribution route stays stable',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===lab('conditioning-record')).learning_design.task+=' Recheck the changed actual method-specific condition evidence.'
 draft.learning_units.find(node=>node.id===environment('stage-boundary')).learning_design.understanding_check.materials+=' Include the actual changed external provider.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const shared=route.skill_coverage.find(mapping=>mapping.key==='qualitycontrol')
 assert.notEqual(before(shared.skill_id,'skill_breakdown'),after(shared.skill_id,'skill_breakdown'),'Shared source-breakdown reviews include their contextual variants')
 const other=dataset.roles.find(node=>node.label==='leaflet distributor')
 assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'))
})
