import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { qualityControlId as quality } from '../scripts/profession-quality-control.mjs'
import { qualitySystemId as system } from '../scripts/profession-quality-systems.mjs'
import { technicalCommunicationId as communication } from '../scripts/profession-technical-communication.mjs'
import { leatherQualityControllerId as controller } from '../scripts/profession-leather-quality-controller.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods quality controller')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
function cannotOmit(ids){for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('quality controller covers ten essentials and actual visual, robustness and expedite work outcomes',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,10)
 assert.deepEqual(new Set(route.skill_coverage.map(mapping=>mapping.key)),new Set(['materials','components','processes','quality','digital','finishingknowledge','qualitycontrol','qualitysystems','communicationtechniques','foreigncommercial']))
 assert.ok(route.occupation_facets.some(facet=>facet.source_fragment.includes('robustness, absence of wrinkles')))
 cannotOmit(['specification-plan','surface-inspection','robustness-evidence','expedite-tests','operating-interval'].map(controller))
 assert.equal(route.steps.some(step=>step.id.includes('leather-goods-finishing:')),false,'Inspection knowledge must not require the entire finishing occupation')
})

test('visual acceptance cannot bypass property-specific actual tests or valid method/equipment conditions',()=>{
 cannotOmit(['inspection-scope','visual-comparison','quick-check-performance','laboratory-referral'].map(quality))
 assert.match(nodes.get(controller('surface-inspection')).learning_design.understanding_check.expected_evidence.join(' '),/do not clear the actual seam failure/)
 assert.match(nodes.get(controller('robustness-evidence')).learning_design.understanding_check.expected_evidence.join(' '),/Robustness remains unverified/)
 assert.match(nodes.get(quality('quick-check-performance')).learning_design.understanding_check.expected_evidence.join(' '),/invalid\/held/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===quality('quick-check-performance')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='hand packer').complete,true)
})

test('stock quantities, actual laboratory referral and correction effectiveness remain required source branches',()=>{
 cannotOmit(['stock-quantity-control','laboratory-referral','corrective-measure','quality-control-cycle'].map(quality))
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='qualitycontrol')
 for(const fragment of ['Control the quantity of leather in the warehouse.','Submit components to laboratory control test when necessary.','Define the corrective measures when called for.'])assert.ok(mapping.facets.some(facet=>facet.source_fragment===fragment),fragment)
 assert.match(nodes.get(quality('stock-quantity-control')).learning_design.understanding_check.expected_evidence.join(' '),/Held L2 is not used to clear released L1/)
 assert.match(nodes.get(quality('laboratory-referral')).learning_design.understanding_check.expected_evidence.join(' '),/A remains unverified/)
 assert.match(nodes.get(quality('corrective-measure')).learning_design.understanding_check.expected_evidence.join(' '),/not reported as effective/)
})

test('source quality-system management requires actual manual, implemented controls, customer feedback and corrective/preventive loops',()=>{
 cannotOmit(['policy-objective','quality-manual','policy-implementation','quality-feedback','cause-evidence','system-corrective','preventive-measure','effectiveness-monitor','system-improvement','quality-system-cycle'].map(system))
 assert.match(nodes.get(system('policy-implementation')).learning_design.understanding_check.expected_evidence.join(' '),/Document approval is not reported as implemented control/)
 assert.match(nodes.get(system('quality-feedback')).learning_design.understanding_check.expected_evidence.join(' '),/Customer satisfaction remains unknown/)
 assert.match(nodes.get(system('effectiveness-monitor')).learning_design.understanding_check.expected_evidence.join(' '),/Incompatible results are not used/)
 assert.match(nodes.get(system('system-improvement')).learning_design.understanding_check.expected_evidence.join(' '),/Document revision and actual implementation are reported separately/)
})

test('foreign-language source skill requires actual meaning-bearing production and separate commercial/technical exchanges',()=>{
 cannotOmit(['spoken-meaning','spoken-message','spoken-clarification','foreign-commercial','foreign-technical','foreign-cycle'].map(communication))
 cannotOmit([controller('foreign-exchange')])
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===communication('foreign-technical')).learning_design.understanding_check.materials=''
 assert.equal(row(draft).complete,false,'A generic oral script without an actual changed technical case cannot count')
 assert.match(nodes.get(communication('foreign-cycle')).learning_design.understanding_check.evidence_scope,/does not claim general fluency/)
 assert.match(nodes.get(communication('foreign-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/unknown term is not guessed/)
})

test('a valid-looking contextual route cannot omit actual canonical quality or language inputs',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 copy.steps.find(step=>step.id===controller('source-control-work')).requires=copy.steps.find(step=>step.id===controller('source-control-work')).requires.filter(id=>id!==quality('quality-control-cycle'))
 assert.equal(row(draft).complete,false)
 const other=structuredClone(dataset),otherRoute=other.profession_pathways.routes.find(candidate=>candidate.id===route.id)
 otherRoute.steps.find(step=>step.id===communication('foreign-cycle')).requires=otherRoute.steps.find(step=>step.id===communication('foreign-cycle')).requires.filter(id=>id!==communication('foreign-commercial'))
 assert.equal(row(other).complete,false)
})

test('revising actual quality-system or foreign-language evidence invalidates the dependent profession review only',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===system('effectiveness-monitor')).learning_design.task+=' Retain the newly changed actual monitoring scope.'
 draft.learning_units.find(node=>node.id===communication('foreign-technical')).learning_design.understanding_check.materials+=' A changed actual sample needs clarification.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const hand=dataset.roles.find(node=>node.label==='hand packer')
 assert.equal(before(hand.id,'occupation_pathway'),after(hand.id,'occupation_pathway'))
})
