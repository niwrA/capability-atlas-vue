import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { manufacturingMethodId as method } from '../scripts/profession-manufacturing-methods.mjs'
import { workMeasurementId as time } from '../scripts/profession-work-measurement.mjs'
import { leatherManufacturePlanId as plan } from '../scripts/profession-leather-manufacture-planning.mjs'
import { productionProductivityId as productivity } from '../scripts/profession-production-productivity.mjs'
import { footwearDesignId as design } from '../scripts/profession-footwear-design-knowledge.mjs'
import { operationProcedureId as procedure } from '../scripts/profession-operation-procedures.mjs'
import { footwearSampleId as sample } from '../scripts/profession-footwear-samples.mjs'
import { leatherIndustrialEngineerId as engineering } from '../scripts/profession-leather-industrial-engineer.mjs'
import { footwearProductionOperatorId as operation } from '../scripts/profession-footwear-production-operator.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const engineer=routeFor('leather goods industrial engineer'),operator=routeFor('footwear production machine operator')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const evidence=id=>nodes.get(id).learning_design.understanding_check.expected_evidence.join(' ')
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('engineering and industrial machine production cover all twelve/eleven essentials and complete occupational work',()=>{
 const report=auditProfessions(dataset)
 for(const [route,count] of [[engineer,12],[operator,11]]){const actual=report.rows.find(row=>row.id===route.occupation_id);assert.equal(actual.complete,true);assert.equal(actual.essentials,count)}
 cannotOmit(engineer,['product-brief','technical-methods','operative-times','resource-process-plan','method-line-improvement','objectives-customer','environment-work','communication-data','foreign-exchanges','operating-interval'].map(engineering))
 cannotOmit(operator,['production-brief','sample-source-work','industrial-cutting','industrial-closing','industrial-lasting','industrial-finishing','production-procedures','routine-maintenance','source-teamwork','operating-interval'].map(operation))
})

test('technical methods require current complete stage documents, operations, dependencies and feasible acknowledged work',()=>{
 cannotOmit(engineer,['technical-reference','working-method','operation-sequence','work-distribution','methods-cycle'].map(method))
 assert.match(evidence(method('technical-reference')),/stale linked operation\/card references remain unresolved/)
 assert.match(evidence(method('operation-sequence')),/Joining remains blocked/)
 assert.match(evidence(method('work-distribution')),/not both feasible/)
})

test('distinct actual direct and standard-data timing methods preserve full observations, conditions and quantity types',()=>{
 cannotOmit(engineer,['study-reference','element-boundaries','direct-timing','standard-data-method','operative-time','estimate-comparison','measurement-cycle'].map(time))
 assert.match(evidence(time('direct-timing')),/valid slower observation is not removed/)
 assert.match(evidence(time('standard-data-method')),/nearby element or invented duration is not substituted/)
 assert.match(evidence(time('operative-time')),/old result is not copied/)
 assert.match(evidence(time('estimate-comparison')),/shorter incomplete method does not satisfy/)
 assert.match(nodes.get(time('measurement-cycle')).learning_design.task,/never become estimates of how long a learner needs/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===time('standard-data-method')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,engineer).complete,false)
})

test('complete planning retains resource compatibility, direct/indirect cost policy and maintenance-dependent capacity',()=>{
 cannotOmit(engineer,['model-process','materials-plan','equipment-workforce','cost-scope','cost-calculation','maintenance-arrangement','planning-cycle'].map(plan))
 assert.match(evidence(plan('cost-scope')),/not universal across cost objects/)
 assert.match(evidence(plan('cost-calculation')),/not silently set to zero/)
 assert.match(evidence(plan('maintenance-arrangement')),/not freely available for both/)
 assert.match(evidence(plan('equipment-workforce')),/Speed does not override/)
})

test('productivity uses accepted output, limiting resources and real compatible improvements without inventing customer satisfaction',()=>{
 cannotOmit(engineer,['productivity-reference','resource-capacity','follow-process','method-time-adjustment','line-optimisation','productivity-cycle'].map(productivity))
 assert.match(evidence(productivity('resource-capacity')),/B remains the model's limiting bound/)
 assert.match(evidence(productivity('line-optimisation')),/does not establish actual accepted productivity improvement/)
 assert.match(evidence(engineering('objectives-customer')),/Absent customer evidence remains unknown/)
 assert.match(evidence(engineering('objectives-customer')),/does not clear the actual failed function/)
})

test('creation and ergonomic knowledge retain dated evidence maturity and finished-product/user scope',()=>{
 cannotOmit(operator,['inspiration-brief','technical-design','current-trends','creation-stages','creation-cycle','anatomic-reference','measurement-principles','design-interaction','ergonomics-cycle'].map(design))
 assert.match(nodes.get(design('current-trends')).learning_design.input,/2026-11-11/)
 assert.match(evidence(design('current-trends')),/Universal production\/material validation is not inferred/)
 assert.match(evidence(design('design-interaction')),/does not override the actual finished-product result/)
 assert.match(evidence(design('measurement-principles')),/does not override the actual failed interval/)
})

test('sample creation includes real cutting, closing, lasting, soling and finishing plus all predefined tests and implemented change',()=>{
 cannotOmit(operator,['sample-brief','stage-plan','sample-cutting','sample-closing','sample-lasting','sample-soling','sample-finishing','stage-test-verification','design-improvement','sample-cycle'].map(sample))
 assert.match(evidence(sample('sample-brief')),/missing\/stale required component remains unresolved/)
 assert.match(evidence(sample('sample-soling')),/does not replace actual required joint evidence/)
 assert.match(evidence(sample('stage-test-verification')),/does not verify the changed actual construction/)
 assert.match(evidence(sample('design-improvement')),/not an implemented actual sample improvement/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===sample('sample-lasting')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,operator).complete,false)
})

test('industrial machine methods remain separate from prototypes and systematic procedures cannot skip intermediate evidence',()=>{
 cannotOmit(operator,['industrial-cutting','industrial-closing','industrial-lasting','industrial-finishing'].map(operation))
 cannotOmit(operator,['procedure-reference','procedure-performance','procedure-deviation','procedure-cycle'].map(procedure))
 assert.match(evidence(operation('industrial-cutting')),/does not establish every actual accepted component/)
 assert.match(evidence(procedure('procedure-performance')),/does not establish the missing actual required check/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===operator.id),missing=sample('sample-soling')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,operator).complete,false)
 assert.equal(row(draft,engineer).complete,true)
})

test('ensuring maintenance distinguishes actual performed competent repair from booking, routine care and personal repair skill',()=>{
 cannotOmit(operator,['maintenance-obligations','routine-maintenance','repair-arrangement','maintenance-ensure-cycle'].map(procedure))
 assert.match(evidence(procedure('repair-arrangement')),/booking does not establish actual repair performance/)
 assert.match(evidence(procedure('maintenance-ensure-cycle')),/Routine success does not clear the actual outstanding damage/)
 assert.match(nodes.get(operation('routine-maintenance')).learning_design.input,/not credited as personal repair skill/)
})

test('actual work-measurement revisions invalidate dependent engineering and skill reviews without changing distribution',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===time('direct-timing')).learning_design.task+=' Check the revised current inclusion/condition protocol.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(engineer.occupation_id,'occupation_pathway'),after(engineer.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/e8664a7b-aef5-4db7-89c6-fe50ba22ef07'
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('leaflet distributor');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
