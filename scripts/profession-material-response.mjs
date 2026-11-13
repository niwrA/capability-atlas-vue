import { sharedId as s, foundationId as f, authorProfessionActivity } from './profession-authoring.mjs'

export const materialResponseId=key=>s('material-response:'+key)
const id=materialResponseId,p=(key,reason)=>[id(key),reason]

export function applyMaterialResponse(dataset){
 const specs=[
  {key:'loading-response',label:'Distinguish an applied pull from the actual specimen response',concept:'A loading action and its observed specimen response are different quantities; a prescribed test relates them under stated conditions.',
   parents:[[f('observe'),'Describe an actual change without inventing cause or hidden properties.'],[s('instruction-action'),'Identify the actual prescribed action and requested observation.'],[s('record-observation'),'Keep action, specimen and observed response attached.']],
   input:'A familiar supporter provides safe large soft paper/foam props or accessible descriptions and a qualified benign loading demonstration. One sample extends visibly under its permitted pull; another behaves differently. Actual instrument examples label applied-load and extension/response channels separately. No freehand force, elastic-release, maximum-load or strength challenge is prescribed.',
   task:'Identify the supplied loading action and describe the actual change separately, matching each observed channel to its stated meaning. Compare changed safe examples without assuming every material has the same response or that visible extension is failure. Model observations are not measured material strength.',
   outputs:['Distinguishes actual applied loading from observed specimen response','Retains specimen/condition identity and model-versus-measured-result limits'],
   variation:{change:'The recorded load is unchanged but the actual specimen response differs.',materials:'Two benign supplied specimen/response records with the same labelled loading value.',prompt:'Describe what is the same and what actually differs.',evidence:['Loading value and specimen response remain distinct.','Equal load is not automatically equal extension or material performance.']},
   difficulty:['Calling an observed stretch the force or assuming a pull produces the same response in every specimen.','Keep actual action/load and observed response in their own channels and scope.'],minutes:[5,15,45,150,4,10]},
  {key:'tear-propagation',label:'Distinguish a growing material tear from an unnotched specimen response',concept:'Tearing concerns growth through material from the prescribed opening/geometry, not every kind of specimen rupture.',
   parents:[p('loading-response','Keep actual loading and observed response distinct.'),[s('match-reference'),'Locate the actual prescribed specimen/region/geometry.']],
   input:'Safe large pre-prepared paper/foam examples or diagrams show a prescribed existing opening growing within one material versus an unnotched sample changing/rupturing. A supporter supplies the preparation; no cutting/blade action or material-strength inference is required. Qualified laboratory examples identify their own actual required tear geometry and path.',
   task:'Locate the actual starting geometry and observed propagation path, distinguish it from a different specimen/failure response and retain the method/geometry identity. Explain why a different tear shape or unnotched rupture is not automatically the same test; model action does not establish a measured tear property.',
   outputs:['Identifies actual prescribed tear origin/path within material','Keeps tear geometry/method distinct from other rupture and model evidence'],
   variation:{change:'A record describes rupture of an unnotched sample rather than propagation from the required opening.',materials:'Actual benign paired geometry/path diagrams and current required tear reference.',prompt:'Determine which actual observation matches the stated property/method.',evidence:['The unnotched result is not relabelled as the prescribed tear result.','The required geometry/path remains part of the evidence.']},
   difficulty:['Calling any broken specimen a valid tearing result.','Trace actual prescribed opening, material path and method geometry.'],minutes:[5,15,60,210,4,12]},
  {key:'interface-separation',label:'Distinguish joined-part separation from rupture inside one material',concept:'Failure can occur at the interface between parts or within a part; the actual location limits what the observation establishes.',
   parents:[p('loading-response','Separate actual loading action from observed response.'),[s('match-reference'),'Locate actual part identities and their supplied interface.']],
   input:'Safe large joined/separated card or fabric props and diagrams identify parts A/B and interface I. One supplied example separates at I; another tears inside A while I stays joined. A qualified practitioner supplies permitted benign demonstrations; no adhesive formulation, uncontrolled pulling or bond-strength conclusion is prescribed.',
   task:'Locate actual joined parts/interface and describe where separation/rupture occurred. Keep interface separation, material tear and unobserved regions distinct, and state why a load or separated appearance without failure-location evidence cannot establish the required interface property. Practical testing remains its separately taught method.',
   outputs:['Identifies actual interface versus within-material failure location','Retains property/location and model-versus-actual-test evidence limits'],
   variation:{change:'Part A tears while the required interface remains joined.',materials:'Actual benign diagram/prop showing within-A rupture and intact I.',prompt:'State the actual observed failure and what remains unverified.',evidence:['The observed material tear is retained.','The intact required interface is not called separated from that observation.']},
   difficulty:['Using any rupture or separation load as the required interface result.','Identify actual parts, interface and observed failure location before interpreting the result.'],minutes:[5,15,60,210,4,12]},
 ]
 for(const spec of specs)authorProfessionActivity(dataset,{...spec,id:id(spec.key)})
}
