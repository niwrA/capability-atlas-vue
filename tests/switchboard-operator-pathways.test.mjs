import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { telephonyFoundationId as phone } from '../scripts/profession-telephony-foundations.mjs'
import { telephonyConnectionId as connection } from '../scripts/profession-telephony-connections.mjs'
import { telephonyMaintenanceId as maintenance } from '../scripts/profession-telephony-maintenance.mjs'
import { switchboardOperatorId as operator } from '../scripts/profession-switchboard-operator.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('telephone switchboard operator'),design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('switchboard operator covers all seven essentials and complete actual connection/enquiry/service-problem outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,7)
 cannotOmit(['brief','telephone-work','connections','customer-enquiries','problem-record','problem-response','system-work','operating-interval'].map(operator))
})

test('communication device operation requires actual transmitted/returned interaction rather than local sound or helper-only controls',()=>{
 cannotOmit(['device-reference','device-operation','device-cycle'].map(phone))
 assert.match(evidence(phone('device-operation')),/Local sound does not establish actual intended recipient communication/)
 assert.match(design(phone('device-operation')).input,/actual contributions recorded/)
 assert.match(evidence(phone('device-cycle')),/connection indication does not establish correct understood interaction/)
})

test('electronic communication retains computer/telephone/email paths and separates data delivery from understood meaning',()=>{
 cannotOmit(['electronic-reference','electronic-evidence','electronic-cycle'].map(phone))
 assert.match(design(phone('electronic-reference')).input,/computer, digital-telephone and email/)
 assert.match(evidence(phone('electronic-reference')),/Local data creation does not establish digital delivery/)
 assert.match(evidence(phone('electronic-evidence')),/Technical delivery does not establish unchanged content or understood meaning/)
})

test('telephone communication needs both actual making and answering with current professional conduct',()=>{
 cannotOmit(['telephone-reference','telephone-answer','telephone-make','telephone-cycle'].map(phone))
 assert.match(evidence(phone('telephone-answer')),/Answering the line does not establish complete professional understood liaison/)
 assert.match(evidence(phone('telephone-make')),/Dialling, ringing or another person answering does not establish the intended liaison/)
 assert.match(evidence(phone('telephone-cycle')),/One completed direction does not establish actual making and answering/)
})

test('incoming enquiries require actual appropriate current information and checked caller understanding',()=>{
 cannotOmit(['enquiry-reference','enquiry-response','incoming-cycle'].map(phone))
 assert.match(evidence(phone('enquiry-response')),/Transmitting correct words does not establish an understood appropriate answer/)
 assert.match(evidence(phone('incoming-cycle')),/Answering the line does not establish answering the actual enquiry/)
})

test('desktop telephony needs actual configured integration and intended-session action/result rather than a contact row or click',()=>{
 cannotOmit(['desktop-reference','desktop-call-actions','desktop-result-check','desktop-cycle'].map(connection))
 assert.match(evidence(connection('desktop-reference')),/displayed number or selected row does not establish a functioning correct-call integration/)
 assert.match(evidence(connection('desktop-call-actions')),/clicked control does not establish the intended actual telephony action/)
 assert.match(evidence(connection('desktop-result-check')),/connected label does not establish current usable intended-participant communication/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===connection('desktop-call-actions')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('building caretaker')).complete,true)
})

test('redirection requires correct actual person/department connection and caller-preserving unavailable-target recovery',()=>{
 cannotOmit(['destination-reference','consult-transfer','transfer-recovery','redirect-cycle'].map(connection))
 assert.match(evidence(connection('consult-transfer')),/Ringing or transfer indication does not establish actual correct-party connection/)
 assert.match(evidence(connection('transfer-recovery')),/unavailable target does not authorise arbitrary disclosure/)
 assert.match(evidence(connection('redirect-cycle')),/Earlier successful transfer does not establish the current correct recipient/)
})

test('source-body switchboard and console work requires actual routed intended-party communication on every required session',()=>{
 cannotOmit(['console-reference','console-operation','console-cycle'].map(connection))
 assert.match(evidence(connection('console-operation')),/Operating controls does not establish an actual correct usable connection/)
 assert.match(evidence(connection('console-cycle')),/One connection does not establish every actual required session result/)
})

test('fault prevention, electrician reports and installations/moves require actual taught checks and complete working handover',()=>{
 cannotOmit(['system-reference','fault-prevention','electrician-report','installation-move'].map(maintenance))
 assert.match(evidence(maintenance('fault-prevention')),/Intact appearance does not establish.*working service/)
 assert.match(evidence(maintenance('electrician-report')),/Report receipt does not establish changed working equipment/)
 assert.match(evidence(maintenance('installation-move')),/Physical placement does not establish correct current installed\/moved service/)
 assert.match(design(maintenance('installation-move')).input,/New installation and relocation are separate required cases/)
})

test('voicemail includes actual private user operation, added service, authorised removal, codes and observed staff use',()=>{
 cannotOmit(['authentication-reference','voicemail-user-method','mailbox-add','mailbox-delete','security-code-management','staff-voicemail-instruction','system-cycle'].map(maintenance))
 assert.match(evidence(maintenance('voicemail-user-method')),/access prompt does not establish correct authorised mailbox\/message use/)
 assert.match(evidence(maintenance('mailbox-add')),/new label does not establish a working correct authorised mailbox/)
 assert.match(evidence(maintenance('mailbox-delete')),/removed row does not establish every required actual mailbox\/data result/)
 assert.match(evidence(maintenance('security-code-management')),/success notice does not establish.*actual account-access result/)
 assert.match(evidence(maintenance('staff-voicemail-instruction')),/Manual delivery does not establish actual understood correct staff use/)
 assert.match(design(maintenance('security-code-management')).input,/Logs contain only result\/status\/account scope, no private code/)
})

test('service problem reports preserve actual symptom/unknown cause and are answered without false restored-service claims',()=>{
 cannotOmit(['problem-record','problem-response'].map(operator))
 assert.match(evidence(operator('problem-record')),/reported symptom does not establish the inferred cause or resolved state/)
 assert.match(evidence(operator('problem-response')),/Acknowledgement or reported repair does not establish restored actual service/)
})

test('canonical mailbox removal cannot be omitted even when all remaining source and route gates are marked',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=maintenance('mailbox-delete')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('building caretaker')).complete,true)
})

test('actual console-method revision invalidates its dependent occupation without changing caretaker repair work',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===connection('console-operation')).learning_design.task+=' Recheck the actual intended participants and selected console session.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const unrelated=routeFor('building caretaker');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
