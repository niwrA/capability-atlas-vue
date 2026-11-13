import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { officeSuiteId as office } from '../scripts/profession-office-suite.mjs'
import { officeCommunicationId as communicate } from '../scripts/profession-office-communications.mjs'
import { officeGovernanceId as govern } from '../scripts/profession-office-governance.mjs'
import { receptionOperationId as reception } from '../scripts/profession-reception-operations.mjs'
import { receptionistId as receptionist } from '../scripts/profession-receptionist.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('receptionist'),design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('receptionist covers all thirteen essentials and actual business first-contact/reception outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,13)
 cannotOmit(['brief','welcome-enquiry','telephone','messages','visitor-instructions','office-documents','appointments-logs','reception-area','operating-interval'].map(receptionist))
})

test('actual Office document/format/page/header/graphic actions remain separately required with preserved content',()=>{
 cannotOmit(['office-reference','document-create','basic-format','page-break','header-footer','graphic-insert'].map(office))
 assert.match(evidence(office('document-create')),/correct display does not establish the actual stored intended document/)
 assert.match(evidence(office('page-break')),/Blank-line pagination does not establish an actual structural page break/)
 assert.match(evidence(office('header-footer')),/One correct page does not establish the actual required page-level scope/)
 assert.match(evidence(office('graphic-insert')),/visible image does not establish correct complete graphic\/document content/)
})

test('automatic contents needs real heading structure and current generated/update results',()=>{
 cannotOmit(['heading-structure','automatic-contents'].map(office))
 assert.match(evidence(office('heading-structure')),/Bold appearance does not establish an actual structural heading/)
 assert.match(evidence(office('automatic-contents')),/earlier contents table does not establish current correct automatic contents/)
 assert.match(design(office('automatic-contents')).input,/manually typed contents imitation contrasts with the generated field/)
})

test('address-database letter merge requires complete actual person/address/field and all-recipient outputs',()=>{
 cannotOmit(['address-data','form-letter-merge'].map(office))
 assert.match(evidence(office('address-data')),/Matching names do not establish the same actual person\/address/)
 assert.match(evidence(office('form-letter-merge')),/one correct letter does not establish the full correct recipient set/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===office('form-letter-merge')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('telephone switchboard operator')).complete,true)
})

test('spreadsheets require actual input-cell formulas and changed-input recalculation instead of a typed answer',()=>{
 cannotOmit(['sheet-cells','sheet-calculation'].map(office))
 assert.match(evidence(office('sheet-cells')),/Similar display does not establish correct actual cell\/record\/type/)
 assert.match(evidence(office('sheet-calculation')),/previously correct displayed total does not establish current intended-cell auto-calculation/)
 assert.match(design(office('sheet-calculation')).task,/typed constant, wrong reference, formula-as-text or incompatible-unit/)
})

test('Office images and sort/filter tables require actual usable files and intact full underlying records',()=>{
 cannotOmit(['image-create','table-sort','table-filter','office-cycle'].map(office))
 assert.match(evidence(office('image-create')),/saved slide does not establish the required actual created image file/)
 assert.match(evidence(office('table-sort')),/Correct-looking order does not establish preserved actual record associations/)
 assert.match(evidence(office('table-filter')),/earlier visible subset does not establish the changed criterion or preserved full data/)
})

test('internal communications need actual required channels and current full recipient/content results',()=>{
 cannotOmit(['internal-reference','internal-distribution','internal-cycle'].map(communicate))
 assert.match(design(communicate('internal-distribution')).input,/really delivers training messages/)
 assert.match(evidence(communicate('internal-distribution')),/Sending or placement alone does not establish the required actual internal communication/)
})

test('phone/fax/post/email messages need actual complete receipt/processing and correct-person passing',()=>{
 cannotOmit(['message-reference','message-intake-process','message-handoff','message-cycle'].map(communicate))
 assert.match(design(communicate('message-intake-process')).input,/actual receiving\/processing is observed/)
 assert.match(evidence(communicate('message-intake-process')),/Registration does not establish complete unchanged actual message processing/)
 assert.match(evidence(communicate('message-handoff')),/Forwarding does not establish full correct-person message receipt/)
})

test('verbal visitor instructions require real understood correct following rather than assent or a handout',()=>{
 cannotOmit(['instruction-reference','instruction-delivery','instruction-cycle'].map(communicate))
 assert.match(evidence(communicate('instruction-delivery')),/Assent or repetition does not establish actual correct following/)
 assert.match(evidence(receptionist('visitor-instructions')),/Assent\/repetition does not establish actual correctly followed instructions/)
})

test('company-policy and service knowledge preserve full current scope while guideline adherence needs real action',()=>{
 cannotOmit(['policy-reference','policy-interpretation','policy-cycle','guideline-reference','guideline-action','guideline-cycle','service-principles','service-evaluation-knowledge','service-knowledge-cycle'].map(govern))
 assert.match(evidence(govern('guideline-action')),/correct explanation does not establish actual guideline adherence/)
 assert.match(evidence(govern('service-evaluation-knowledge')),/Delivery success does not establish actual user satisfaction or loyalty/)
})

test('older required policy/guideline IDs retain their drafts while current activities lose unrelated healthcare attribution',()=>{
 const preserved=[['policy-reference','atlas:alu:company-policies-f75b740c-1'],['policy-cycle','atlas:alu:company-policies-f75b740c-2'],['guideline-reference','atlas:alu:adhere-to-organisational-guidelines-aa238394-1'],['guideline-cycle','atlas:alu:adhere-to-organisational-guidelines-aa238394-2']]
 for(const [key,id] of preserved){
  assert.equal(govern(key),id);cannotOmit([id])
  const node=nodes.get(id);assert.equal(node.learning_domain,'office');assert.equal(node.previous_authored_draft.learning_domain,'health')
  assert.ok(node.previous_authored_draft.definition.length>0)
  assert.ok(node.previous_authored_draft.supporting_sources.some(source=>source.url.includes('who.int')))
  assert.deepEqual(node.supporting_sources,[])
 }
})

test('logbooks require actual true events in current established formats without invented or duplicate activity',()=>{
 cannotOmit(['log-reference','log-entry','log-cycle'].map(reception))
 assert.match(evidence(reception('log-reference')),/note somewhere does not establish the required actual logbook\/format/)
 assert.match(evidence(reception('log-entry')),/One actual event is recorded once/)
 assert.match(evidence(reception('log-cycle')),/earlier complete-looking log does not establish current required coverage/)
})

test('appointments require separately actual acceptance, feasible stored schedule and correct authorised cancellation',()=>{
 cannotOmit(['appointment-reference','appointment-accept','appointment-schedule','appointment-cancel','appointment-cycle'].map(reception))
 assert.match(evidence(reception('appointment-reference')),/matching clock label or name does not establish the same feasible appointment/)
 assert.match(evidence(reception('appointment-schedule')),/booked-looking display does not establish the correct actual feasible reservation/)
 assert.match(evidence(reception('appointment-cancel')),/disappeared row does not establish the correct complete authorised cancellation/)
})

test('reception organisation/appearance and actual hygiene are separate complete required results',()=>{
 cannotOmit(['area-reference','area-organising','area-hygiene','area-cycle'].map(reception))
 assert.match(evidence(reception('area-organising')),/Neatness does not establish permitted usable visitor access or privacy/)
 assert.match(evidence(reception('area-hygiene')),/Clean appearance does not establish the actual required hygiene process\/result/)
})

test('canonical actual appointment cancellation cannot be omitted even when every remaining route gate is marked',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=reception('appointment-cancel')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('telephone switchboard operator')).complete,true)
})

test('actual Office-merge revisions invalidate receptionist/source reviews while preserving switchboard operation',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===office('form-letter-merge')).learning_design.task+=' Recheck every actual current person/address field and complete recipient output.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/f683ae1d-cb7c-4aa1-b9fe-205e1bd23535';assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('telephone switchboard operator');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
