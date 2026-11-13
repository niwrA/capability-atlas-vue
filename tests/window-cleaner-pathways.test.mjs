import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { windowAccessId as access } from '../scripts/profession-window-risk-access.mjs'
import { windowMethodId as method } from '../scripts/profession-window-methods.mjs'
import { cleaningReportingWasteId as reporting } from '../scripts/profession-cleaning-reporting-waste.mjs'
import { windowCleanerId as window } from '../scripts/profession-window-cleaner.mjs'
import { toiletServiceId as records } from '../scripts/profession-toilet-services.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('window cleaner')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(actualRoute,ids){const actual=actualRoute.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(actualRoute,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(actualRoute,actual,partial).complete,false,nodes.get(id).label)}}

test('window cleaner covers all seventeen essentials and complete interior/exterior/higher-window occupation outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,17)
 cannotOmit(route,['brief','materials-preparation','frame-protection','glass-work','higher-window-work','pole-work','reports','nonhazard-waste','supply-equipment','operating-interval'].map(window))
})

test('risk knowledge retains full current factors, actual control monitoring and assessment records',()=>{
 cannotOmit(route,['risk-reference','risk-monitor-record','risk-cycle','access-selection'].map(access))
 assert.match(evidence(access('risk-reference')),/Unchanged height does not establish unchanged risk conditions/)
 assert.match(evidence(access('risk-monitor-record')),/signed plan does not override the actual current control failure/)
 assert.match(evidence(access('risk-cycle')),/old plan is not a current assessment for the new task/)
 assert.match(evidence(access('access-selection')),/Reach does not establish an appropriate approved access method/)
})

test('source safety-belt wording does not bypass actual complete system use or capable emergency arrangements',()=>{
 cannotOmit(route,['fall-system-reference','fall-system-use','emergency-readiness'].map(access))
 assert.match(design(access('fall-system-reference')).input,/source phrase safety belts for support is retained/)
 assert.match(evidence(access('fall-system-reference')),/does not establish the required complete compatible system/)
 assert.match(evidence(access('fall-system-use')),/Ground rehearsal does not override a failed actual operating-stage check/)
 assert.match(evidence(access('emergency-readiness')),/written plan alone does not establish actual capable recovery arrangements/)
})

test('actual selected ladder-window performance remains necessary despite all ground and preparation gates',()=>{
 cannotOmit(route,[method('ladder-preparation'),access('ladder-operation'),window('higher-window-work')])
 assert.match(evidence(window('higher-window-work')),/do not establish actual higher-window performance/)
 assert.match(design(access('ladder-operation')).input,/actual observed approved operation and are not its substitute/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=access('ladder-operation')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('room attendant')).complete,true)
})

test('products and every source ladder/cradle/rope preparation case retain user/provider checks without operation credit',()=>{
 cannotOmit(route,['materials-reference','window-product-preparation','ladder-preparation','cradle-preparation','rope-preparation','materials-cycle'].map(method))
 assert.match(evidence(method('materials-reference')),/Ladder readiness does not establish cradle or rope preparation/)
 assert.match(evidence(method('cradle-preparation')),/Technical paperwork alone does not complete actual user readiness/)
 assert.match(design(method('rope-preparation')).task,/Do not infer independent abseiling/)
 assert.match(evidence(method('materials-cycle')),/do not complete the missing actual preparation case/)
})

test('frame-sheet and sponge/detergent work require actual actions and full preserved glass/frame results',()=>{
 cannotOmit(route,['frame-reference','frame-sheet-application','frame-cycle','hand-window-method'].map(method))
 assert.match(evidence(method('frame-sheet-application')),/Most-covered does not complete the actual missing border/)
 assert.match(evidence(method('frame-cycle')),/clean appearance does not establish performed sheet protection/)
 assert.match(evidence(method('hand-window-method')),/Clarity alone does not establish complete glass\/frame acceptance/)
})

test('actual pole system setup and both elevated window/facade cases require compatible controls and observed results',()=>{
 cannotOmit(route,['pole-reference','pole-setup','pole-operation','pole-cycle'].map(method))
 assert.match(evidence(method('pole-reference')),/Reach does not establish current permitted pole use/)
 assert.match(evidence(method('pole-operation')),/Improved appearance does not override/)
 assert.match(evidence(method('pole-cycle')),/window pass does not establish facade performance/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===method('pole-operation')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('drapery and carpet cleaner')).complete,true)
})

test('damage observation timing, actual client/supervisor receipt and full hours/own-signature records remain distinct',()=>{
 cannotOmit(route,['window-damage-reference','window-damage-notification','window-damage-cycle','reporting-reference','reporting-actions','reporting-cycle'].map(reporting))
 cannotOmit(route,['report-reference','work-hours-signature','report-cycle'].map(records))
 assert.match(evidence(reporting('window-damage-reference')),/Observation time alone does not establish damage cause or responsibility/)
 assert.match(evidence(reporting('window-damage-notification')),/internal record does not establish required notification/)
 assert.match(evidence(reporting('reporting-cycle')),/Acknowledgement does not establish actual resolution/)
 assert.match(evidence(window('reports')),/correct receipt\/hours\/signature evidence remains outstanding/)
})

test('non-hazardous classification does not establish any route and excluded incineration cannot satisfy disposal',()=>{
 cannotOmit(route,['nonhazard-reference','nonhazard-disposal','nonhazard-cycle'].map(reporting))
 assert.match(design(reporting('nonhazard-reference')).focus.goal,/does not remove ordinary handling risks/)
 assert.match(evidence(reporting('nonhazard-reference')),/does not establish the actual non-hazardous classification/)
 assert.match(evidence(reporting('nonhazard-disposal')),/does not establish accepted authorised disposal/)
 assert.match(evidence(reporting('nonhazard-cycle')),/excluded incineration route does not satisfy/)
})

test('actual ladder-operation revisions invalidate window review while preserving preparation and leaflet evidence',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===access('ladder-operation')).learning_design.task+=' Recheck current actual combined access/support task conditions.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const unrelated=routeFor('leaflet distributor');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
 // Preparation knowledge does not itself depend on performing the later actual
 // ladder operation; changing operation alone must not rewrite its evidence.
 const source='http://data.europa.eu/esco/skill/be3e49f5-c9ff-4ddc-a811-c345a8010c35'
 assert.equal(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
})
