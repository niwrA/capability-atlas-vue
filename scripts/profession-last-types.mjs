import { domainId as d, sharedId as s, authorProfessionActivity, professionSource } from './profession-authoring.mjs'
import { registerServiceGroup } from './profession-service.mjs'
import { workshopId as work } from './profession-workshop.mjs'
import { footwearTypeId as type } from './profession-footwear-types.mjs'

const uuid='f3880260-ef21-401c-a64f-a96f21dc968a'
export const lastTypeId=key=>key==='last-reference'?'atlas:esco-breakdown:'+uuid+':1':key==='last-cycle'?'atlas:esco-breakdown:'+uuid+':2':d('last-types:'+key)
const id=lastTypeId,p=(key,reason)=>[id(key),reason]
export function applyLastTypes(dataset){
 const specs=[
  {key:'last-reference',label:'Identify the actual last and distinguish it from a foot, finished shoe and flat pattern',concept:'A last is an identified three-dimensional manufacturing form whose actual shape and construction references govern the selected shoe model.',
   parents:[[type('part-functions'),'Locate actual upper/bottom functions and construction boundaries.'],[s('match-reference'),'Match actual model, side, size and revision identity.']],
   input:'A qualified footwear practitioner supplies safe physical lasts and paired drawings/patterns/finished samples with actual last/model/side/size/revision identifiers and current use references. One left/right or width variant looks similar. A last label is not a wearer-fit measurement or proof of comfort/protection.',
   task:'Identify the actual last and its current model/side/size/revision, explain its manufacturing-form role and distinguish foot, finished product, last and 2D pattern. Retain an unknown width or mismatched last instead of using a familiar size label as interchangeability.',
   outputs:['Identifies actual last/form role and current identity','Distinguishes actual last, foot, finished shoe and pattern evidence'],
   variation:{change:'The size code matches but the last width or side differs from the current model reference.',materials:'Safe actual paired last/reference cards with an explicit width/side mismatch.',prompt:'Determine actual last suitability.',evidence:['Matching size alone does not clear actual last identity.','The actual width/side mismatch remains unresolved.']},
   difficulty:['Equating a size code or shoe outline with the actual correct last.','Trace actual model/side/width/revision and manufacturing-form reference.'],minutes:[10,25,90,330,4,12]},
  {key:'last-classification',label:'Characterise actual last types using the supplied material and construction axes',concept:'Last types are described under stated material, construction and use characteristics rather than one exclusive visual category.',
   parents:[p('last-reference','Identify actual manufacturing form and current model reference.'),[type('type-axes'),'Keep distinct classification axes and evidenced use limits.']],
   input:'Qualified current last samples/dossiers compare material, solid/articulated construction, form/heel-height context and applicable footwear use. The current factory terminology and permitted use are supplied for each actual type; no assumption that every articulated or plastic last has the same mechanism or function is made.',
   task:'Characterise actual types under each supplied axis, explain actual relevant differences and retain unknown mechanism/material/use evidence. Compare actual current suitability rather than rank a material as universally better or infer a fit/protection claim.',
   outputs:['Explains actual different last-type characteristics under stated axes','Retains actual use, mechanism and evidence boundaries'],
   variation:{change:'Two lasts share the same material but have different construction and permitted handling.',materials:'Actual benign paired type dossiers with explicit differing construction/method.',prompt:'Classify and explain actual method implications.',evidence:['Common material does not establish identical construction.','The actual separate handling/reference limits remain required.']},
   difficulty:['Treating a material label as all construction/use characteristics.','Compare actual independent axes and their current reference evidence.'],minutes:[12,30,120,480,5,16]},
  {key:'last-placement',label:'Explain and practise the specifically taught actual last placement and work environment',concept:'Last placement preserves the actual form identity, required orientation/support and permitted work-area state.',
   parents:[p('last-classification','Identify actual last construction and its permitted handling boundary.'),[work('method-setup'),'Learn/check actual placement/support/preparation method and controls.']],
   input:'A qualified practitioner supplies benign actual training lasts and their current placement/support/handling/storage methods, accessible work area and current identity/orientation/condition checks. Any mechanism, clamp or removal action is separately taught under its own actual instruction; no universal opening or force procedure is invented.',
   task:'Explain the actual placement procedure and work-area requirements, then learn/perform only permitted real placement/support and identity/orientation/condition checks. Keep uncertain stability, untaught mechanism or incompatible support held. Record actual learner/partner contribution; a picture does not establish actual placement.',
   outputs:['Explains/checks actual last placement and work-area requirements','Performs only actual taught benign placement within its support/control scope'],
   variation:{change:'The last identifier is correct but the current required support or orientation is unverified.',materials:'Actual benign placement record with explicit missing support/orientation evidence.',prompt:'Determine actual work readiness.',evidence:['Correct identity does not establish actual supported placement.','The current missing placement requirement remains unresolved.']},
   difficulty:['Treating the right last as ready regardless of actual placement or support.','Check actual identity, taught handling, support/orientation and work state.'],minutes:[15,30,180,720,6,24]},
  {key:'last-cycle',label:'Analyse changed actual last types and their placement/environment requirements',concept:'Transfer actual last identity, type characteristics and placement checks to a changed footwear assignment.',transfer:true,
   parents:[p('last-reference','Identify actual current form/model/side/size and revision.'),p('last-classification','Explain actual last-type characteristics and use limits.'),p('last-placement','Retain actual current placement and work-area method/evidence.')],
   input:'Qualified current benign last dossiers and actual training forms include a changed construction/model, its own permitted handling/placement and prior limited records. Current type terminology and environment controls are supplied; no new mechanism is qualified by a similar name.',
   task:'Characterise/select the actual last under current requirements, explain and check its own placement/work environment and perform only the separately taught permitted action. Retain changed mechanism, missing type/reference or unobserved placement as gaps rather than extend old evidence automatically.',
   outputs:['Covers actual source type/characteristic and placement/environment knowledge','Retains current identity/method/performance and untrained-variant boundaries'],
   variation:{change:'The assignment changes to an untaught articulated last construction.',materials:'Actual current changed type/mechanism request and earlier limited handling record.',prompt:'State actual remaining instruction and evidence.',evidence:['The earlier construction does not qualify the changed mechanism.','Actual current instruction/placement evidence remains required.']},
   supporting_sources:[{title:'Crockett & Jones: last-based pattern development context',url:'https://www.crockettandjones.com/pages/in-the-making-pattern-cutting'}],
   difficulty:['Using one last type or placement record as every form/mechanism.','Trace actual current identity, characteristics, permitted method and result.'],minutes:[20,40,240,960,6,24]},
 ]
 const {mapping}=registerServiceGroup(dataset,'lasttypes',specs.map(spec=>spec.key),[['Different types of lasts and their characterisations.',['last-reference','last-classification','last-cycle']],['procedure for last placement and basic work environment with the last',['last-placement','last-cycle']]],{uuid,activityId:id})
 for(const spec of specs)authorProfessionActivity(dataset,{...spec,id:id(spec.key)})
 for(const to of mapping.activity_ids)if(!dataset.decompositions.some(edge=>edge.type==='decomposes_into'&&edge.from===mapping.skill_id&&edge.to===to))dataset.decompositions.push({from:mapping.skill_id,to,type:'decomposes_into',completion_requirement:'required',validation:'proposed',source:professionSource})
 return mapping
}
