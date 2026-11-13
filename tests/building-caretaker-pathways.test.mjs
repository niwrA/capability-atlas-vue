import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { caretakerGovernanceId as govern } from '../scripts/profession-caretaker-governance.mjs'
import { buildingManagementId as building } from '../scripts/profession-building-management.mjs'
import { caretakerMaintenanceId as maintenance } from '../scripts/profession-caretaker-maintenance.mjs'
import { buildingCaretakerId as caretaker } from '../scripts/profession-building-caretaker.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('building caretaker'),design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('caretaker includes every ten-source requirement and actual maintenance/security/amenity/resident outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,10)
 cannotOmit(['brief','condition','cleaning','grounds','security-register','repair','amenities','resident-contact','quality-handback','operating-interval'].map(caretaker))
})

test('legal understanding and actual adherence are separately required before continuing changed activity',()=>{
 cannotOmit(['legal-reference','legal-action','legal-cycle'].map(govern))
 assert.match(evidence(govern('legal-reference')),/does not establish current legal applicability/)
 assert.match(evidence(govern('legal-action')),/Knowing the rule does not establish actual adherence/)
 assert.match(evidence(govern('legal-cycle')),/Earlier compliant performance does not establish the changed requirement/)
})

test('organisation-code management needs real leadership and conduct checks rather than merely correct task output',()=>{
 cannotOmit(['code-reference','code-leadership','code-cycle'].map(govern))
 assert.match(evidence(govern('code-reference')),/Seniority or preference does not override/)
 assert.match(evidence(govern('code-leadership')),/correct output does not establish code-compliant leadership/)
})

test('departmental liaison preserves every source example and requires real effective service after acknowledgement',()=>{
 cannotOmit(['manager-reference','manager-handoff','manager-cycle'].map(govern))
 assert.match(design(govern('manager-reference')).input,/sales, planning, purchasing, trading, distribution and technical/)
 assert.match(evidence(govern('manager-handoff')),/Acknowledgement does not establish effective completed service/)
 assert.match(evidence(govern('manager-cycle')),/old agreement is not current feasible service evidence/)
})

test('arrival/departure registration requires actual stored person/company/true-time fields and rejects duplicate events',()=>{
 cannotOmit(['register-reference','register-writing','register-cycle'].map(govern))
 assert.match(evidence(govern('register-reference')),/matching name does not establish the same person\/company\/event/)
 assert.match(evidence(govern('register-writing')),/correct display does not establish the actual stored correct record/)
 assert.match(evidence(govern('register-cycle')),/One actual event is recorded once/)
})

test('energy conservation preserves all definition examples and explicit efficiency exclusion without sacrificing resident needs',()=>{
 cannotOmit(['energy-reference','energy-alternatives','energy-product-example','energy-service-reduction','energy-cycle'].map(govern))
 const mapping=route.skill_coverage.find(item=>item.skill_id==='http://data.europa.eu/esco/skill/ddce2912-bc0f-4a47-aa2b-c1de48bc4b44')
 assert.ok(mapping.facets.some(facet=>facet.source_fragment==='Excludes energy efficiency.'))
 assert.match(design(govern('energy-product-example')).input,/Excludes energy efficiency/)
 assert.match(evidence(govern('energy-alternatives')),/does not by itself establish reduced energy consumed/)
 assert.match(evidence(govern('energy-product-example')),/does not establish lower total energy consumed/)
 assert.match(evidence(govern('energy-service-reduction')),/savings preference does not override the actual required service/)
})

test('inspection walkways need actual safe traversal and every current door/window check rather than old ticks',()=>{
 cannotOmit(['walk-reference','walk-verification','walk-cycle'].map(govern))
 assert.match(evidence(govern('walk-verification')),/earlier checklist does not override actual current failed closure/)
 assert.match(evidence(govern('walk-cycle')),/old pass does not establish current closure/)
 assert.match(design(govern('walk-reference')).task,/closed, locked, safe escape and unobserved states distinct/)
})

test('building condition preserves actual structural/fault/damage scope and full grounds/property cleanliness purposes',()=>{
 cannotOmit(['building-reference','building-inspection','building-fault-assessment','building-cleanliness-assessment','building-condition-cycle'].map(building))
 assert.match(evidence(building('building-fault-assessment')),/does not establish its cause\/severity or structural safety/)
 assert.match(evidence(building('building-cleanliness-assessment')),/does not establish full building\/grounds cleanliness/)
 assert.match(evidence(building('building-condition-cycle')),/Cleanliness does not establish structural/)
})

test('employee cleaning oversight cannot be replaced by names on a plan, completion reports or personal cleaning',()=>{
 cannotOmit(['cleaning-supervision-reference','cleaning-supervision-actions','cleaning-supervision-cycle'].map(building))
 assert.match(evidence(building('cleaning-supervision-reference')),/name on the plan does not establish an accepted competent contribution/)
 assert.match(evidence(building('cleaning-supervision-actions')),/worker report does not establish full actual accepted cleaning/)
 assert.match(evidence(caretaker('cleaning')),/Personal cleaning does not establish the missing employee-supervision/)
})

test('grounds management requires actual planning/direction, real limited care and every natural-area result',()=>{
 cannotOmit(['grounds-reference','grounds-plan','grounds-direct','grounds-bed-care','grounds-cycle'].map(building))
 assert.match(evidence(building('grounds-reference')),/maintained lawn does not establish all actual natural areas/)
 assert.match(evidence(building('grounds-direct')),/Attendance or a booking does not establish actual maintained-area/)
 assert.match(evidence(building('grounds-bed-care')),/Tidiness does not establish maintained living\/ground condition/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===building('grounds-bed-care')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('vehicle cleaner')).complete,true)
})

test('minor repair assistance includes actual taught fit/fastening and full function checks without protected-system authority',()=>{
 cannotOmit(['repair-reference','repair-tool-fit','repair-assistance','repair-cycle'].map(maintenance))
 assert.match(evidence(maintenance('repair-reference')),/small size does not establish the same repair authority/)
 assert.match(evidence(maintenance('repair-tool-fit')),/Visual similarity does not establish compatible engagement/)
 assert.match(evidence(maintenance('repair-assistance')),/attached fitting does not establish accepted repair/)
 assert.match(evidence(maintenance('repair-cycle')),/Booking or attendance does not establish actual repaired accepted condition/)
})

test('heating/hot-water availability needs complete current safe delivered service, not plant display or ticket acknowledgement',()=>{
 cannotOmit(['amenity-reference','amenity-checks','amenity-continuity'].map(maintenance))
 assert.match(evidence(maintenance('amenity-reference')),/running plant indication does not establish actual safe resident service/)
 assert.match(evidence(maintenance('amenity-checks')),/display does not establish current safe delivered service/)
 assert.match(evidence(maintenance('amenity-continuity')),/Acknowledgement or a reported repair does not establish restored resident availability/)
 assert.match(evidence(caretaker('amenities')),/Savings or plant indication does not establish required safe resident availability/)
})

test('canonical actual minor-repair action cannot be omitted even when all remaining route gates are marked',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=maintenance('repair-assistance')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('building exterior cleaner')).complete,true)
})

test('caretaker repair revisions invalidate its own occupation review without changing exterior cleaning',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===maintenance('repair-assistance')).learning_design.task+=' Recheck the actual current retained fitting and function.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const unrelated=routeFor('building exterior cleaner');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
