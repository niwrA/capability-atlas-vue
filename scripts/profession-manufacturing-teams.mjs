import { domainId as d, authorProfessionActivity, professionSource } from './profession-authoring.mjs'
import { registerServiceGroup } from './profession-service.mjs'
import { coordinationId as coord } from './profession-coordination.mjs'
import { technicalCommunicationId as communication } from './profession-technical-communication.mjs'

const uuid='cab119c5-ff95-4499-b91a-54e9f6c5cde1'
export const manufacturingTeamId=key=>key==='team-agreement'?'atlas:esco-breakdown:'+uuid+':1':key==='team-cycle'?'atlas:esco-breakdown:'+uuid+':2':d('manufacturing-team:'+key)
const id=manufacturingTeamId,p=(key,reason)=>[id(key),reason]

export function applyManufacturingTeams(dataset){
 const specs=[
  {key:'team-agreement',label:'Agree actual manufacturing-team contributions, dependencies and access',concept:'Transfer acknowledged assignment and capacity checks to a shared textile/clothing production task.',transfer:true,
   parents:[[coord('confirmed-assignment'),'Confirm actual accepted responsibility and check-back.'],[coord('capacity-plan'),'Keep actual trained scope/time/support capacity explicit.'],[communication('communication-cycle'),'Check actual shared meaning through usable channels.']],
   input:'A qualified manufacturing supervisor supplies an actual benign textile/clothing training-team task with preparation, assembly and checking colleagues, specifically taught permitted actions and current piece/reference/quality requirements. Each person states usable communication, task access, agreed contribution/support and availability. A learner may perform reference checking rather than operate an untaught machine.',
   task:'Actually agree each contribution and required handoff with colleagues, verify understanding and feasible scope/support and retain a declined/unacknowledged assignment. Respect different working/communication styles and pauses; harmonious teamwork is not compulsory cheerfulness, agreement or hiding a concern.',
   outputs:['Agrees actual acknowledged feasible team contributions and dependencies','Respects usable access, trained-role limits and declined/unresolved work'],
   variation:{change:'A colleague cannot accept the assigned time or method.',materials:'Actual benign team plan and explicit declined assignment/access constraint.',prompt:'Reagree the actual permitted work without inventing acceptance.',evidence:['The declined contribution remains unassigned until a feasible agreement.','No colleague is pressured into an untaught or inaccessible task.']},
   difficulty:['Equating a sent instruction or agreeable tone with accepted feasible team work.','Check actual understanding, contribution, capacity and chosen support.'],minutes:[10,25,90,330,4,12]},
  {key:'team-handoff',label:'Coordinate actual manufacturing handoffs and resolve a work mismatch respectfully',concept:'Transfer actual result evidence, precise communication and supported feedback to colleagues\' shared production work.',transfer:true,
   parents:[p('team-agreement','Keep actual accepted roles/access/dependencies clear.'),[coord('result-evidence'),'Check actual usable required output rather than a done claim.'],[coord('supported-feedback'),'Discuss actual result/support and agreed next action without unsupported personal judgement.']],
   input:'The actual benign textile/clothing team exchanges identified prepared pieces and current check records. One handoff has the correct count but wrong revision; colleagues initially disagree whether it is ready. Current criteria, permitted correction/escalation and actual role/access agreements are supplied.',
   task:'Actually exchange/check the required identified output with colleagues, explain the mismatch using current evidence, invite the actual response and agree a permitted correction/recheck or escalation. Keep respectful disagreement and a raised quality concern legitimate; do not hide the mismatch to preserve an appearance of harmony.',
   outputs:['Coordinates actual usable identified team handoffs','Resolves or escalates actual work mismatches with respectful evidence-based exchange'],
   variation:{change:'The colleague reports done but the required actual result is still missing.',materials:'Actual benign completion message, current criterion and absent required output.',prompt:'Agree the actual next check/responsibility.',evidence:['The missing actual output remains unresolved.','The discussion concerns evidence/support rather than inventing blame or acceptance.']},
   difficulty:['Treating politeness as proof of correct handoff or blaming a colleague from a missing result.','Use actual current output evidence, checked meaning and agreed next action.'],minutes:[10,25,120,420,5,14]},
  {key:'team-cycle',label:'Work with actual textile/clothing manufacturing colleagues through a changed shared task',concept:'Transfer actual accepted contributions, usable handoffs and respectful mismatch resolution through the complete shared manufacturing interval.',transfer:true,
   parents:[p('team-agreement','Confirm actual current contributions/dependencies/access.'),p('team-handoff','Check actual shared outputs and resolve/escalate mismatches.')],
   input:'A qualified supervisor supplies an actual benign textile/clothing training-team interval and current permitted preparation/assembly/check roles. Changes affect piece revision, colleague availability or access method. Record actual learner actions, colleague actions, support, shared results and unresolved responsibility separately; no whole-machine or full-factory competence follows from this teamwork case.',
   task:'Actually cooperate with colleagues, reagree changed contributions, communicate current work/results and complete/check usable handoffs within taught scope. Address disagreement or missing inputs respectfully and hand over actual incomplete work with responsibility. A team\'s finished product does not establish every individual\'s practical operation skill.',
   outputs:['Cooperates with actual colleagues through changed shared manufacturing work','Retains actual handoff/result, individual contribution and support/resolution limits'],
   variation:{change:'The team finishes but one learner\'s recorded action was performed entirely by a colleague.',materials:'Actual benign team result and explicit individual/colleague action register.',prompt:'Report actual individual and shared performance separately.',evidence:['Team success is retained within its scope.','The colleague\'s operation is not assigned to the learner.']},
   difficulty:['Equating team output or agreeable behaviour with each individual\'s complete practical competence.','Record actual contributions, usable exchanges and separately observed results.'],minutes:[15,35,180,660,6,18]},
 ]
 const {mapping}=registerServiceGroup(dataset,'manufacturingteams',specs.map(spec=>spec.key),[['Work harmoniously with colleagues in teams',['team-agreement','team-handoff','team-cycle']],['textile and clothing manufacturing industries',['team-cycle']]],{uuid,activityId:id})
 for(const spec of specs)authorProfessionActivity(dataset,{...spec,id:id(spec.key)})
 for(const to of mapping.activity_ids)if(!dataset.decompositions.some(edge=>edge.type==='decomposes_into'&&edge.from===mapping.skill_id&&edge.to===to))dataset.decompositions.push({from:mapping.skill_id,to,type:'decomposes_into',completion_requirement:'required',validation:'proposed',source:professionSource})
 return mapping
}
