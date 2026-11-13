import { domainId as d, sharedId as s, foundationId as f, authorProfessionActivity, professionSource } from './profession-authoring.mjs'

export const serviceSkills={communication:'0da516ee-e70e-4384-be13-f5ff80be8127',welcome:'26a6e6d2-1c9a-4d7e-8c04-5ba16d1f53da',service:'75dfe1ee-5935-42ce-b820-697f827825c3',custody:'16d3b69a-ea61-4d27-a91d-9a4930105b54',tickets:'25886784-2382-4524-88e0-b04c4b5a178c',cleanliness:'726800bd-0ce5-401c-a13f-2388ab5df796',lost:'810b7858-fb19-4c61-b05a-7cd04bb61336'}
const aliases={'clarify-request':['communication',1],'resolve-request':['communication',2],welcome:['welcome',1],'changed-welcome':['welcome',2],'service-agreement':['service',1],'continued-service':['service',2],'item-intake':['custody',1],'item-return':['custody',2],'unique-token':['tickets',1],'ticket-cycle':['tickets',2],'cleanliness-check':['cleanliness',1],'cleanliness-routine':['cleanliness',2],'found-record':['lost',1],'claim-return':['lost',2]}
export const serviceId=key=>aliases[key]?'atlas:esco-breakdown:'+serviceSkills[aliases[key][0]]+':'+aliases[key][1]:d('service:'+key)

const id=serviceId,p=(key,reason)=>[id(key),reason]
const specs=[
 {key:'clarify-request',label:'Check what result a customer is asking for',concept:'A service request needs a confirmed intended result, not merely an assumed meaning.',
  parents:[[s('offer-response'),'Offer a meaning and check the actual response through an accessible exchange.'],[s('match-reference'),'Identify the supplied service or object labels.']],
  input:'Fictional service desk offers coat storage and directions. Customer card says bag and supplies an agreed response method. Clarification choices are store this bag, find the bag counter, or another request. No real customer information is used.',
  task:'Ask or offer an accessible clarification, wait, confirm the intended result and record remaining uncertainty. Do not choose storage merely because the word bag was heard. Use speech, sign, AAC, writing, pictures or an agreed partner interpretation.',
  outputs:['Clarifies the desired result without guessing from a keyword','Confirms the actual response','Records unresolved meaning and support used'],
  variation:{change:'The customer corrects the interpretation from storage to directions.',materials:'A response card explicitly indicates directions, not storage.',prompt:'Acknowledge the correction and restate the intended result.',evidence:['The corrected request is retained.','No storage action is started on the old interpretation.']},
  difficulty:['Treating a familiar word as a complete request.','Offer a concise clarification and confirm the person\'s intended outcome.'],minutes:[5,12,20,65,3,7]},
 {key:'service-agreement',label:'Agree a service within the actual available scope',concept:'A service commitment must match the confirmed need and the provider\'s actual authority and availability.',
  parents:[p('clarify-request','Confirm what the person wants to achieve.'),[s('locate-rule'),'Obtain the applicable service conditions.'],[s('authorisation-boundary'),'Retain unavailable or unauthorised work as a boundary.']],
  input:'Fictional desk policy: store ordinary coats until closing time C; no overnight storage; direct baggage enquiries to desk B. Request cards ask for an ordinary coat until C and overnight storage. Conditions and time labels can be read by a partner.',
  task:'Compare each confirmed request with the supplied service, explain the available option and confirm agreement. For the unavailable overnight request, state the limit and offer the supplied referral without promising that desk B will accept it.',
  outputs:['Matches the request with actual service conditions','Explains and confirms an available agreement','Does not promise an unverified alternative or exception'],
  variation:{change:'The coat store is temporarily unavailable.',materials:'A current status card closes coat intake; referral remains permitted.',prompt:'Update the offered service and confirm what the customer wants next.',evidence:['No storage commitment is made.','The current limit and available referral are communicated.']},
  difficulty:['Promising an outcome to reassure someone before checking availability.','Check the actual scope/status and distinguish a referral from a promise.'],minutes:[8,15,30,90,3,7]},
 {key:'access-preference',label:'Adapt a service exchange to the person\'s stated access preference',concept:'An access adaptation responds to the person\'s expressed need and is checked with them.',
  parents:[p('clarify-request','Check the person\'s intended result.'),[s('offer-response'),'Offer and confirm an accessible alternative.'],[s('authorisation-boundary'),'Retain the actual service and assistance limits.']],
  input:'Customer A requests written/picture choices rather than spoken-only directions; B requests a partner to read the supplied labels. Available alternatives are a high-contrast/picture card, text card and an agreed reader. No ability or diagnosis is inferred from appearance.',
  task:'Ask which available method helps, offer it without imposing it and check the person can use the information. Record any unresolved requirement or referral. Do not treat declining an adaptation as refusing the service.',
  outputs:['Uses an expressed preference instead of an assumption','Offers and checks an available adaptation','Retains choice, consent and unresolved support needs'],
  variation:{change:'The person says the first adaptation is not usable.',materials:'A correction card asks for the other available representation.',prompt:'Acknowledge and try the agreed alternative, checking its usefulness.',evidence:['The person\'s correction changes the method.','Usefulness is checked rather than assumed.','An unavailable support remains an explicit gap.']},
  difficulty:['Choosing assistance for someone without asking whether it helps.','Offer options, wait and check the person\'s response.'],minutes:[8,15,30,90,3,7]},
 {key:'resolve-request',label:'Respond to a customer request and check access to the next step',concept:'Transfer the clarification, scope and access checks to an actual service response.',transfer:true,
  parents:[p('clarify-request','Retain the confirmed intended result.'),p('service-agreement','Offer only a supported service or referral.'),p('access-preference','Use and check the person\'s chosen access method.')],
  input:'Fictional customer asks where to collect a stored bag. The approved information card says collection desk B via marked route R; the person chooses picture directions. A staged answer instead directs them to intake desk A.',
  task:'Clarify collection versus deposit, obtain the current collection information, provide it accessibly and ask the person to show or explain the next step. Correct the staged wrong-desk answer and refer any unavailable information.',
  outputs:['Responds to the actual request with applicable information','Checks that the next step is usable','Corrects or refers unresolved information without guessing'],
  variation:{change:'Desk B closes and the current card names desk C via route S.',materials:'Explicit updated service/route card and the same access preference.',prompt:'Respond using the changed information and check the next step again.',evidence:['Desk C/route S replaces the old answer.','The customer\'s access and understanding are checked.']},
  difficulty:['Delivering an answer without checking whether it solves the actual request.','Confirm the intended outcome and the customer\'s usable next step.'],minutes:[8,20,30,100,3,8]},
 {key:'status-message',label:'Report the actual service status without inventing a completion or wait time',concept:'A status update must distinguish known progress from an estimate or an unresolved outcome.',
  parents:[p('service-agreement','Know what service was actually agreed.'),[s('record-observation'),'Trace a status to the correct service/item record.'],[s('locate-rule'),'Use the current authorised status/estimate source.']],
  input:'Fictional service record A: received, storage location not confirmed, no authorised wait estimate. Record B: ready at collection desk C. An optional separate estimate card explicitly says about five minutes, not a guarantee.',
  task:'Give A/B updates tied to their actual records. Do not call A ready or invent a wait. When the estimate card applies, retain its approximate status and source; state what will be checked next.',
  outputs:['Associates status with the correct record','Distinguishes confirmed progress, estimate and unknown information','Communicates an appropriate next check or update'],
  variation:{change:'A becomes ready but at a changed collection desk.',materials:'Updated A record: ready at desk D; the earlier desk C record concerns B.',prompt:'Update A without borrowing B\'s location.',evidence:['A is reported ready at D.','The item/record identity remains correct.']},
  difficulty:['Using a reassuring invented wait or another customer\'s status.','Use the actual record and label estimates and unknowns explicitly.'],minutes:[5,15,25,75,3,7]},
 {key:'continued-service',label:'Maintain a service agreement through a changed requirement or interruption',concept:'Transfer the familiar service checks through a change rather than treating first contact as completion.',transfer:true,
  parents:[p('service-agreement','Retain the agreed service and its limits.'),p('access-preference','Maintain the person\'s chosen access method.'),p('resolve-request','Provide a checked response or referral.'),p('status-message','Keep updates accurate and traceable.')],
  input:'A role-play begins with agreed coat storage and picture-supported collection information. Midway, the collection point changes and the customer requests assistance not available at that desk. The current status, permitted alternatives and escalation contact are supplied.',
  task:'Acknowledge the change, update the agreement/status accessibly, confirm a usable permitted next step and retain the unavailable assistance for the specified referral. Record whether the person agrees with the revised plan rather than assuming the earlier agreement covers it.',
  outputs:['Maintains an accurate agreement/status through the change','Checks access and the person\'s revised choice','Uses the supplied referral instead of promising unavailable help'],
  variation:{change:'A second customer reports that the revised plan still does not meet their need.',materials:'A response card declines the proposed alternative and supplies a request for the supervisor.',prompt:'Acknowledge the unresolved need and use the permitted escalation.',evidence:['The unresolved requirement is retained accurately.','The agreed escalation and status are communicated without pressure.']},
  difficulty:['Assuming an initial courteous response establishes continued service quality.','Recheck the actual need, access and available outcome after each relevant change.'],minutes:[10,20,40,120,3,8]},
 {key:'welcome',label:'Offer a welcoming beginning without imposing a response',concept:'A welcome acknowledges arrival and offers an accessible way to begin.',
  parents:[[s('offer-response'),'Offer a meaning and notice the actual response.'],[s('authorisation-boundary'),'Respect a pause or refusal and the current service boundary.']],
  input:'A fictional venue entrance, a visible/tactile/text welcome cue and an agreed greeting method. Arrival cards show someone seeking help, someone simply passing and someone signalling pause. No touch or disclosure is required.',
  task:'Acknowledge arrival, offer a friendly accessible opening and wait. Let the person choose whether to engage or proceed; do not demand speech, eye contact or a repeated greeting.',
  outputs:['Offers an accessible acknowledgement of arrival','Waits and respects the person\'s response','Avoids treating a declined exchange as misconduct'],
  variation:{change:'A person cannot use the initial greeting method.',materials:'An expressed request for a supplied text/picture welcome cue.',prompt:'Use the requested cue and allow the person to choose the next step.',evidence:['The offered method changes appropriately.','Engagement remains optional.']},
  difficulty:['Treating one social presentation or response style as a universal requirement.','Offer a usable opening and honour the individual response.'],minutes:[5,12,20,60,3,7]},
 {key:'changed-welcome',label:'Welcome guests in a changed arrival context',concept:'Transfer the accessible welcome to a different supplied venue or group arrival.',transfer:true,
  parents:[p('welcome','Acknowledge arrival without imposing a response.'),p('access-preference','Offer a usable method when an access preference is expressed.')],
  input:'A role-play changes from one guest at a coat counter to two guests at a hotel entrance. One asks for a text welcome and the other declines help. The available welcome information and the service boundary are supplied.',
  task:'Acknowledge each guest, offer the agreed accessible information and respect the declined assistance. Avoid assuming one group member speaks or decides for everyone.',
  outputs:['Welcomes the actual arrivals through usable methods','Keeps individual choices distinct','Does not infer consent or needs from group membership'],
  variation:{change:'The arrival point changes to a venue information desk.',materials:'The new welcome/location card and an expressed access preference.',prompt:'Adapt the welcome while retaining the same respect for individual choice.',evidence:['The current venue information is used.','The person\'s preferred method and response are respected.']},
  difficulty:['Addressing only one group member or imposing a familiar greeting style.','Acknowledge each person and check their actual preferences.'],minutes:[5,15,25,75,3,7]},
]

export function registerServiceGroup(dataset,key,keys,facets,{uuid=serviceSkills[key],activityId=id}={}){
  const skill=dataset.capabilities.find(node=>node.id==='http://data.europa.eu/esco/skill/'+uuid)
  if(!skill)throw new Error('Missing released service skill: '+key)
  for(const edge of dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to==='atlas:esco-breakdown:'+uuid+':1'&&edge.strength==='recommended'&&[s('communication:read-and-produce-practical-texts'),s('numeracy:solve-routine-number-problems')].includes(edge.from))){edge.completion_requirement='optional';edge.authoring_revision={source:professionSource,reason:'The individually authored '+key+' activities specify accessible identity/reference use and their actual narrower inputs. Generic reading/arithmetic remains optional preparation rather than a universal service prerequisite.'}}
  return {skill,mapping:{key,skill_id:skill.id,source_definition:skill.definition,source_scope_notes:skill.scope_notes||{},activity_ids:keys.map(activityId),facets:facets.map(([source_fragment,activities])=>({source_fragment,activity_ids:activities.map(activityId)}))}}
}

export function applyVisitorService(dataset){
  const groups=[
    ['communication',['clarify-request','resolve-request'],[['Respond to and communicate with customers',['clarify-request','resolve-request']],['enable them to access the desired products or services, or any other help they may require',['resolve-request']]]],
    ['welcome',['welcome','changed-welcome'],[['Welcome guests in a friendly manner in a certain place.',['welcome','changed-welcome']]]],
    ['service',['service-agreement','access-preference','status-message','continued-service'],[['customer service is at all times performed in a professional way',['service-agreement','continued-service']],['Help customers or participants feel at ease and support special requirements.',['access-preference','continued-service']],['keeping the customers informed about the current status of their orders or waiting times.',['status-message']]]],
  ]
  const registered=groups.map(([key,keys,facets])=>({...registerServiceGroup(dataset,key,keys,facets),keys}))
  for(const spec of specs)authorProfessionActivity(dataset,{...spec,id:id(spec.key)})
  for(const {skill,keys} of registered)for(const key of keys)if(!dataset.decompositions.some(edge=>edge.type==='decomposes_into'&&edge.from===skill.id&&edge.to===id(key)))dataset.decompositions.push({from:skill.id,to:id(key),type:'decomposes_into',completion_requirement:'required',validation:'proposed',source:professionSource})
  return registered.map(item=>item.mapping)
}
