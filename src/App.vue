<script setup>
import { ref, shallowRef, computed, watch, onScopeDispose, nextTick } from 'vue'
import { createCatalogueModel } from './catalogue-model.js'
import { createInspectionModel, conceptType } from './inspection-model.js'

const { dataset, loadDetail } = defineProps(['dataset', 'loadDetail'])

const nodes = [...dataset.roles.map(r => ({...r, kind:'role'})), ...dataset.capabilities.map(c => ({...c, kind:'skill'})), ...(dataset.learning_units||[]), ...(dataset.framework_outcomes||[]), ...(dataset.qualifications||[])]
const byId = Object.fromEntries(nodes.map(n => [n.id,n]))
const outcomeLinks=dataset.outcome_capability_links||[]
const qualificationRequirements=dataset.qualification_requirements||[]
const relations = [...dataset.role_capability_assertions, ...dataset.decompositions, ...outcomeLinks, ...qualificationRequirements]
const inspectionModel=createInspectionModel(nodes,relations)
const workbenchTab=ref('inspect'),inspectorTab=ref('overview'),learningTab=ref('goals')
const workbenchTabs=[{id:'inspect',label:'Inspect concepts'},{id:'learning',label:'Learning workspace'},{id:'catalogue',label:'Catalogue & coverage'}]
const inspectorTabs=[{id:'overview',label:'Overview'},{id:'io',label:'Inputs & outputs'},{id:'relationships',label:'Relationships'},{id:'evidence',label:'Evidence & status'}]
const learningTabs=[{id:'goals',label:'Saved goals'},{id:'next',label:'Next activities'},{id:'route',label:'Learning route'}]
const libraryQuery=ref(''),libraryKind=ref('all'),librarySort=ref('links'),libraryPage=ref(1)
watch([libraryQuery,libraryKind,librarySort],()=>{libraryPage.value=1},{flush:'sync'})
const libraryResults=computed(()=>inspectionModel.search({query:libraryQuery.value,kind:libraryKind.value,sort:librarySort.value,page:libraryPage.value}))
const relatedQuery=ref(''),relatedDirection=ref('all'),relatedSort=ref('links'),relatedPage=ref(1)
watch([relatedQuery,relatedDirection,relatedSort],()=>{relatedPage.value=1},{flush:'sync'})
const roleRelationType=e=>e.relationType||e.escoType||e.type
const isRoleRequired=e=>['esco_essential','atlas_required'].includes(roleRelationType(e))
const isRoleOptional=e=>['esco_optional','atlas_optional'].includes(roleRelationType(e))
const isOptionalLink=e=>isRoleOptional(e)||e.completion_requirement==='optional'||e.completionRequirement==='optional'
const roleEdges = {}
for(const edge of dataset.role_capability_assertions)(roleEdges[edge.from]??=[]).push(edge)
const roleDescriptor=n=>n?.role_family==='life'?'Atlas life role':n?.role_family==='profession'?'Atlas profession pilot':'ESCO occupation'
const roleProgressLabel=n=>n?.source==='ESCO'?'Essential skill step progress':n?.role_family==='profession'?'Core profession step progress':'Atlas core-step progress'
const adj = Object.fromEntries(nodes.map(n=>[n.id, []]))
for (const e of relations) { if(adj[e.from]&&adj[e.to]) { adj[e.from].push({id:e.to,edge:e,dir:'out'});adj[e.to].push({id:e.from,edge:e,dir:'in'}) } }
const stored = (key, fallback) => { try {const x=localStorage.getItem('atlas-learner:'+key);return x?JSON.parse(x):fallback} catch {return fallback} }
const storedText = (key, fallback) => { try {const x=localStorage.getItem('atlas-learner:'+key);if(!x)return fallback;try{return JSON.parse(x)}catch{return x}} catch {return fallback} }
const earliestDevelopmentStartIds=['atlas:alu:development:communication:respond-to-early-signals','atlas:alu:development:numeracy:notice-small-quantities']
const earliestDevelopmentStartId=earliestDevelopmentStartIds[0]
const completed=ref(stored('completed',[])), assessmentCoverage=ref(stored('assessmentCoverage',{})), favorites=ref(stored('favorites',[])), center=ref(stored('center',earliestDevelopmentStartId))
const inspectionHistory=ref([byId[center.value]?center.value:earliestDevelopmentStartId]),historyIndex=ref(0)
const search=ref(''), depth=ref(1), selectedTab=ref('next'), showAll=ref(false), hovered=ref('')
const showOptional=ref(true)
const hideCompleted=ref(false)
const appVersion=__APP_VERSION__
const graphMode=ref('path'), pathGoal=ref(storedText('pathGoal','')), routeDepth=ref(stored('routeDepth',2))
const zoom=ref(1), pan=ref({x:0,y:0}), drag=ref(null), graphCanvas=ref(null)
watch(completed, v=>localStorage.setItem('atlas-learner:completed',JSON.stringify(v)),{deep:true})
watch(assessmentCoverage, v=>localStorage.setItem('atlas-learner:assessmentCoverage',JSON.stringify(v)),{deep:true})
watch(favorites, v=>localStorage.setItem('atlas-learner:favorites',JSON.stringify(v)),{deep:true})
watch(favorites,v=>{if(!v.includes(pathGoal.value))pathGoal.value=v[0]||''},{deep:true,immediate:true})
watch(center,v=>localStorage.setItem('atlas-learner:center',JSON.stringify(v)))
watch(pathGoal,v=>localStorage.setItem('atlas-learner:pathGoal',JSON.stringify(v)))
watch(routeDepth,v=>localStorage.setItem('atlas-learner:routeDepth',JSON.stringify(v)))
const completedSet=computed(()=>new Set(completed.value))
const isDone = id=>completedSet.value.has(id)
const isFav = id=>favorites.value.includes(id)
const isLearnerNode = id=>['skill','learning_unit'].includes(byId[id]?.kind)
const mappedLearningUnitsForNode=id=>{
 const node=byId[id]
 if(!node||!['framework_outcome','qualification'].includes(node.kind))return []
 const outcomeIds=node.kind==='framework_outcome'?[id]:qualificationRequirements.filter(e=>e.to===id).map(e=>e.from)
 return [...new Set(outcomeLinks.filter(e=>outcomeIds.includes(e.to)).map(e=>e.from).filter(unitId=>byId[unitId]?.kind==='learning_unit'))]
}
const requirementCoverageForNode=id=>{
 const node=byId[id]
 if(!node||!['framework_outcome','qualification'].includes(node.kind))return {mapped:0,total:0}
 const outcomes=node.kind==='framework_outcome'?[id]:qualificationRequirements.filter(e=>e.to===id).map(e=>e.from)
 const mapped=new Set(outcomeLinks.filter(e=>outcomes.includes(e.to)).map(e=>e.to))
 return {mapped:mapped.size,total:new Set(outcomes).size}
}
const isDecomposition = edge=>['decomposes_into','contains_candidate'].includes(edge.type)
const decompositionEdges=Object.fromEntries(nodes.map(n=>[n.id,[]]))
const decompositionChildren=Object.fromEntries(nodes.map(n=>[n.id,[]]))
for(const e of dataset.decompositions)if(isDecomposition(e)&&decompositionChildren[e.from]){decompositionEdges[e.from].push(e);decompositionChildren[e.from].push(e.to)}
const catalogueModel=createCatalogueModel(dataset,{nodes,byId,roleEdges,decompositionEdges})
const catalogueOverview=catalogueModel.overview
const numberFormatter=new Intl.NumberFormat('en')
const formatCount=value=>numberFormatter.format(value)
const browseOpen=ref(false),browseGroup=ref('esco'),browseQuery=ref(''),browseCoverage=ref('all'),browsePage=ref(1)
watch([browseGroup,browseQuery,browseCoverage],()=>{browsePage.value=1},{flush:'sync'})
const browseResults=computed(()=>catalogueModel.browse({group:browseGroup.value,query:browseQuery.value,coverage:browseCoverage.value,page:browsePage.value}))
const clearBrowseFilters=()=>{browseGroup.value='esco';browseQuery.value='';browseCoverage.value='all';browsePage.value=1}
const isRequiredDecomposition=e=>e.completion_requirement!=='optional'&&e.type!=='contains_candidate'
const stepCache=new Map()
const collectSteps=roots=>{
 const key=JSON.stringify(roots)
 if(stepCache.has(key))return stepCache.get(key)
 const required=new Map(),optional=new Map()
 const add=(map,id,ancestors)=>{const prior=map.get(id)||new Set();for(const ancestor of ancestors)prior.add(ancestor);map.set(id,prior)}
 const visitRequired=(id,ancestors=[])=>{
  if(ancestors.includes(id))return
  const next=[...ancestors,id],children=(decompositionEdges[id]||[]).filter(isRequiredDecomposition)
  if(!children.length)add(required,id,ancestors)
  for(const edge of children)visitRequired(edge.to,next)
  for(const edge of decompositionEdges[id]||[])if(!isRequiredDecomposition(edge))visitOptional(edge.to,next)
 }
 const visitOptional=(id,ancestors=[])=>{
  if(ancestors.includes(id))return
  const next=[...ancestors,id],children=decompositionEdges[id]||[]
  if(!children.length){add(optional,id,ancestors);return}
  for(const edge of children)visitOptional(edge.to,next)
 }
 for(const root of roots)visitRequired(root)
 for(const id of required.keys())optional.delete(id)
 const result={required:[...required].map(([id,ancestors])=>({id,ancestors:[...ancestors]})),optional:[...optional.keys()]}
 if(stepCache.size>=512)stepCache.delete(stepCache.keys().next().value)
 stepCache.set(key,result)
 return result
}
const progressForRoots=roots=>{
 const {required,optional}=collectSteps(roots)
 const done=required.filter(step=>isDone(step.id)||step.ancestors.some(parent=>(assessmentCoverage.value[parent]||[]).includes(step.id))).length
 const stale=new Set(required.flatMap(step=>step.ancestors.filter(parent=>isDone(parent)&&!isDone(step.id)&&!(assessmentCoverage.value[parent]||[]).includes(step.id)))).size
 const total=required.length
 return {done,total,optional:optional.length,stale,percent:total?Math.round(done*100/total):0}
}
const progressCache=computed(()=>{completed.value;assessmentCoverage.value;return new Map()})
const calculateProgressForNode=id=>{
 const node=byId[id]
 if(!node)return {done:0,total:0,optional:0,stale:0,percent:0}
 if(node.kind==='role'){
  const essentials=(roleEdges[id]||[]).filter(isRoleRequired).map(e=>e.to)
  return progressForRoots(essentials)
 }
 if(['framework_outcome','qualification'].includes(node.kind))return progressForRoots(mappedLearningUnitsForNode(id))
 return progressForRoots([id])
}
const progressForNode=id=>{
 const cache=progressCache.value
 if(!cache.has(id))cache.set(id,calculateProgressForNode(id))
 return cache.get(id)
}
const progressByNode=computed(()=>{
 const ids=new Set([center.value,...favorites.value,...displayGraph.value.vertices.map(n=>n.id)])
 return Object.fromEntries([...ids].filter(id=>byId[id]).map(id=>[id,progressForNode(id)]))
})
const focusedProgress=computed(()=>progressForNode(center.value))
const hasRequiredSubsteps=id=>(decompositionEdges[id]||[]).some(isRequiredDecomposition)
const assessmentNeedsReview=id=>hasRequiredSubsteps(id)&&isDone(id)&&collectSteps([id]).required.some(step=>!isDone(step.id)&&!(assessmentCoverage.value[id]||[]).includes(step.id))
const completionActionLabel=id=>hasRequiredSubsteps(id)?(isDone(id)?(assessmentNeedsReview(id)?'Review required-step assessment':'Reopen required-step assessment'):'Assess required steps complete'):(isDone(id)?'Mark incomplete':'Mark complete')
const toggleDone = id=>{
 if(!isLearnerNode(id))return
 if(isDone(id)){
  completed.value=completed.value.filter(x=>x!==id)
  const next={...assessmentCoverage.value};delete next[id];assessmentCoverage.value=next
 }else{
  completed.value=[...completed.value,id]
  if(hasRequiredSubsteps(id))assessmentCoverage.value={...assessmentCoverage.value,[id]:collectSteps([id]).required.map(step=>step.id)}
 }
}
const toggleFav=id=>{favorites.value=isFav(id)?favorites.value.filter(x=>x!==id):[...favorites.value,id]}
const focus=(id,{recordHistory=true}={})=>{
 if(!byId[id])return
 if(recordHistory&&id!==center.value){inspectionHistory.value=[...inspectionHistory.value.slice(0,historyIndex.value+1),id];historyIndex.value=inspectionHistory.value.length-1}
 center.value=id;zoom.value=1;pan.value={x:0,y:0};search.value=''
}
async function bringInspectionIntoView(){
 await nextTick();if(typeof document==='undefined')return
 const main=document.querySelector('.workbench-main'),heading=document.querySelector('.concept-header h2')
 if(window.matchMedia('(max-width: 760px)').matches)heading?.scrollIntoView({block:'start'})
 else if(main)main.scrollTop=0
 heading?.focus({preventScroll:true})
}
const inspectConcept=(id,tab)=>{focus(id);workbenchTab.value='inspect';if(tab)inspectorTab.value=tab;bringInspectionIntoView()}
const stepInspection=direction=>{const index=historyIndex.value+direction;if(index<0||index>=inspectionHistory.value.length)return;historyIndex.value=index;focus(inspectionHistory.value[index],{recordHistory:false});workbenchTab.value='inspect';bringInspectionIntoView()}
watch(center,()=>{relatedPage.value=1;relatedQuery.value=''},{flush:'sync'})
const inspectionMetrics=computed(()=>inspectionModel.metrics(center.value))
const nearbyConcepts=computed(()=>inspectionModel.neighbourhood(center.value))
const relatedResults=computed(()=>{
 const rows=inspectionModel.connections(center.value,{query:relatedQuery.value,direction:relatedDirection.value,sort:relatedSort.value}),pages=Math.max(1,Math.ceil(rows.length/15)),page=Math.min(relatedPage.value,pages)
 return {items:rows.slice((page-1)*15,page*15),total:rows.length,page,pages}
})
async function changeTab(event,tabs,current){
 const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return
 event.preventDefault();const container=event.currentTarget?.parentElement;let index=tabs.findIndex(tab=>tab.id===current.value)
 index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length
 current.value=tabs[index].id
 await nextTick();container?.querySelector(`[data-tab="${tabs[index].id}"]`)?.focus()
}
const workbenchKey=event=>changeTab(event,workbenchTabs,workbenchTab)
const inspectorKey=event=>changeTab(event,inspectorTabs,inspectorTab)
const learningKey=event=>changeTab(event,learningTabs,learningTab)
const searchText=nodes.map(n=>(n.label+' '+(n.label_nl||'')+' '+n.id+' '+(n.sector||'')+' '+(n.notation||'')).toLowerCase())
const results=computed(()=>{
 const query=search.value.trim().toLowerCase(),matches=[]
 if(query)for(let i=0;i<nodes.length&&matches.length<20;i++)if((nodes[i].source_status!=='obsolete'||query===nodes[i].id.toLowerCase())&&searchText[i].includes(query))matches.push(nodes[i])
 return matches
})
const neighbors=id=>(adj[id]||[]).map(a=>byId[a.id]).filter(Boolean)
const relationships=(id)=>adj[id]||[]
const focusDetail=shallowRef(null),detailLoading=ref(false),detailError=ref(''),detailErrorAction=ref('retry')
let detailRequest=0
onScopeDispose(()=>detailRequest++)
async function refreshDetail(){
 const request=++detailRequest,id=center.value
 detailLoading.value=true;detailError.value='';detailErrorAction.value='retry';focusDetail.value=null
 try{
  const detail=await loadDetail(id)
  if(request===detailRequest)focusDetail.value=detail
 }catch(error){if(request===detailRequest){detailError.value=error.message;detailErrorAction.value=error.action==='reload'?'reload':'retry'}}
 finally{if(request===detailRequest)detailLoading.value=false}
}
if(!byId[center.value])center.value=earliestDevelopmentStartId
watch(center,refreshDetail,{immediate:true})
const focusNode=computed(()=>focusDetail.value?.id===center.value?focusDetail.value:byId[center.value]||nodes[0])
const functionalContract=computed(()=>inspectionModel.contract(center.value,focusDetail.value?.id===center.value?focusDetail.value:null))
const openGoalRoute=id=>{pathGoal.value=id;focus(id);workbenchTab.value='learning';learningTab.value='route';graphMode.value='path'}
const pathwayCoverage=catalogueModel.coverageFor
const focusedCoverage=computed(()=>pathwayCoverage(center.value))
const reloadCatalogue=()=>window.location.reload()
const exploreGoalRelations=()=>{const target=learningPath.value.targetId;if(target)focus(target);graphMode.value='relations'}
const getGoalSkills=goalId=>{
 if(!byId[goalId]) return []
 const goalKind=byId[goalId].kind
 const roots=goalKind==='role'?(roleEdges[goalId]||[]).filter(isRoleRequired).map(e=>e.to):['framework_outcome','qualification'].includes(goalKind)?mappedLearningUnitsForNode(goalId):[goalId]
 const set=new Set(),q=[...roots]
 for(let i=0;i<q.length;i++){const id=q[i];if(set.has(id))continue;set.add(id);for(const child of decompositionChildren[id]||[])q.push(child)}
 return [...set]
}
const goalStats=computed(()=>favorites.value.filter(id=>byId[id]).map(id=>{const skills=getGoalSkills(id),progress=progressForNode(id);return {id,node:byId[id],skills,progress,coverage:requirementCoverageForNode(id),pathway:pathwayCoverage(id)}}))
const isAssessedComplete=id=>{
 if(isDone(id))return true
 const steps=collectSteps([id]).required
 return steps.length>0&&Object.entries(assessmentCoverage.value).some(([parent,covered])=>isDone(parent)&&steps.every(step=>covered.includes(step.id)||isDone(step.id)))
}
const suggested=computed(()=>{
 const available=new Map(),goalRouteConnected=learningPath.value.status==='ready'
 const routeIds=new Set(learningPath.value.scopeIds||[]),goalSets=goalStats.value.map(g=>new Set(g.skills))
 const scopedGoalSets=goalRouteConnected?[routeIds]:[]
 const add=(id,reason,allowOutsideGoal=false)=>{
  if(!byId[id]||!isLearnerNode(id)||isAssessedComplete(id))return
  if(!allowOutsideGoal&&scopedGoalSets.length&&!scopedGoalSets.some(set=>set.has(id)))return
  const reasons=available.get(id)||new Set();reasons.add(reason);available.set(id,reasons)
 }
 const relatedCompleted=completed.value.filter(id=>!goalRouteConnected||routeIds.has(id))
 if(!relatedCompleted.length){
  const pathStarts=goalStats.value.length&&learningPath.value.status==='ready'?earliestDevelopmentStartIds.filter(id=>learningPath.value.vertices.some(node=>node.id===id)):earliestDevelopmentStartIds
  for(const id of pathStarts)add(id,'Directly available from the zero-learning start',true)
 }else{
  for(const completedId of relatedCompleted)for(const edge of adj[completedId]||[]){
   if(edge.dir==='out'&&edge.edge.type==='prerequisite_for')add(edge.id,`Next after ${byId[completedId].label}`)
   else if(edge.dir==='out'&&isDecomposition(edge.edge))add(edge.id,`Direct component of ${byId[completedId].label}`)
   else if(edge.edge.type==='recommended_foundation_candidate')add(edge.id,`Direct foundation link from ${byId[completedId].label}`)
  }
 }
 if(!goalSets.length)for(const id of earliestDevelopmentStartIds)add(id,'Directly available from the zero-learning start',true)
 return [...available].map(([id,reasons])=>({id,reasons})).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,showAll.value?32:10)
})
const localGraph=computed(()=>{
 const seen=new Set([center.value]);const rings=[[center.value]]
 for(let d=1;d<=depth.value;d++){
  const ring=[]
  for(const id of rings[d-1]){
   const links=(adj[id]||[]).filter(e=>showOptional.value||!isOptionalLink(e.edge))
   if(d===1&&byId[center.value]?.kind==='role')links.sort((a,b)=>Number(isRoleOptional(a.edge))-Number(isRoleOptional(b.edge)))
   for(const e of links)if(!seen.has(e.id)){seen.add(e.id);ring.push(e.id)}
  }
  rings.push(ring.slice(0,36))
 }
 const coords={}; coords[center.value]={x:0,y:0}
 for(let d=1;d<rings.length;d++){
  const ids=rings[d];const radius=d===1?Math.min(330,Math.max(185,ids.length*12)):335
  ids.forEach((id,i)=>{const theta=(-Math.PI/2)+(2*Math.PI*i/Math.max(ids.length,1));coords[id]={x:Math.cos(theta)*radius,y:Math.sin(theta)*radius}})
 }
 const visible=new Set(Object.keys(coords).filter(id=>!hideCompleted.value||!isDone(id)||id===center.value));const visibleCoords=Object.fromEntries([...visible].map(id=>[id,coords[id]]));const edges=relations.filter(e=>(showOptional.value||!isOptionalLink(e))&&visible.has(e.from)&&visible.has(e.to))
 return {vertices:Object.entries(visibleCoords).map(([id,p])=>({...byId[id],...p})),edges,coords:visibleCoords}
})
const graphNodeRadius=id=>{
 if(graphMode.value==='path'){
  if(id===learningPath.value.targetId)return 37
  if(id==='atlas:path:start')return 30
  if(byId[id]?.kind==='qualification')return 34
  if(byId[id]?.kind==='framework_outcome')return 29
  const goalLink=learningPath.value.edges.find(e=>e.from===id&&e.to===learningPath.value.targetId&&e.type==='goal_link')
  if(goalLink&&isRoleRequired(goalLink))return 31
  if(goalLink&&isRoleOptional(goalLink))return 22
  return 26
 }
 if(id===center.value)return 37
 if(byId[id]?.kind==='qualification')return 34
 if(byId[id]?.kind==='framework_outcome')return 29
 if(byId[center.value]?.kind==='role'){
  const edge=(adj[center.value]||[]).find(e=>e.id===id)?.edge
  if(edge&&isRoleRequired(edge))return 31
  if(edge&&isRoleOptional(edge))return 22
 }
 return 26
}
const edgeGeometry=e=>{
 const a=displayGraph.value.coords[e.from],b=displayGraph.value.coords[e.to]
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1
 const startRadius=graphNodeRadius(e.from)+3
 const endRadius=graphNodeRadius(e.to)+5
 return {x1:a.x+dx/length*startRadius,y1:a.y+dy/length*startRadius,x2:b.x-dx/length*endRadius,y2:b.y-dy/length*endRadius}
}
const currentLinks=computed(()=>(adj[center.value]||[]).map(e=>({...e,node:byId[e.id]})).filter(e=>e.node))
const softwareDeveloperId='http://data.europa.eu/esco/occupation/f2b15a0e-e65a-438a-affb-29b9d50b77d1'
const specialistOptionalLabels=new Set(['ICT security legislation','software anomalies','utilise machine learning','Internet of Things'])
const practiceOptionalLabels=new Set(['integrate system components','migrate existing data','develop creative ideas','World Wide Web Consortium standards','use concurrent programming','use logic programming','use object-oriented programming','object-oriented modelling','design user interface','use functional programming','use automatic programming','adapt to changes in technological development plans','collect customer feedback on applications'])
const optionalSkillGroup=node=>specialistOptionalLabels.has(node.label)?'Domain or specialist area':practiceOptionalLabels.has(node.label)?'Programming paradigm or engineering practice':'Named language, framework, or tool'
const connectionGroups=computed(()=>{
 if(focusNode.value.kind!=='role') return [{key:'connected',label:'Connected nodes',note:'Arrow direction and relation type describe the connection.',items:currentLinks.value.slice(0,45)}]
 const escoRole=focusNode.value.source==='ESCO'
 const essential=currentLinks.value.filter(e=>isRoleRequired(e.edge))
 const optional=currentLinks.value.filter(e=>isRoleOptional(e.edge))
 const other=currentLinks.value.filter(e=>!isRoleRequired(e.edge)&&!isRoleOptional(e.edge))
 const optionalGroups=escoRole&&focusNode.value.id===softwareDeveloperId?['Named language, framework, or tool','Programming paradigm or engineering practice','Domain or specialist area'].map(label=>({key:`esco_optional_${label}`,label:`ESCO Optional · ${label}`,note:'Descriptive grouping only; this is not a frequency or future-demand ranking.',items:optional.filter(e=>optionalSkillGroup(e.node)===label)})): [{key:escoRole?'esco_optional':'atlas_optional',label:`${escoRole?'ESCO Optional':'Atlas context-dependent'} · ${optional.length}`,note:escoRole?'May vary by employer, work context, or country.':'Included for context; not part of core-role progress.',items:optional}]
 return [
  {key:escoRole?'esco_essential':'atlas_required',label:`${escoRole?'ESCO Essential':'Atlas core'} · ${essential.length}`,note:escoRole?'Usually relevant across employers and work contexts.':'Atlas-authored draft core skills; contextual and open to revision.',items:essential},
  ...optionalGroups,
  {key:'other',label:`Other relations · ${other.length}`,note:'',items:other}
 ].filter(g=>g.items.length)
})
const zeroLearningGraph=(flowEdges,outgoing,targetId=null)=>{
 const markerId='atlas:path:start',moreId='atlas:path:more',startIds=earliestDevelopmentStartIds.filter(id=>byId[id])
 // Outcome alignments describe partial curriculum/qualification coverage; they
 // are not learning steps and must not make formal outcomes look immediate at zero.
 const zeroEdges=flowEdges.filter(e=>!['supports_outcome','qualification_requirement'].includes(e.type))
 const zeroOutgoing={}
 for(const edge of zeroEdges)(zeroOutgoing[edge.from]??=[]).push(edge)
 const levels=Object.fromEntries(startIds.map(id=>[id,0])),queue=[...startIds]
 for(let i=0;i<queue.length;i++){const from=queue[i];for(const edge of zeroOutgoing[from]||[])if(byId[edge.to]&&levels[edge.to]===undefined){levels[edge.to]=levels[from]+1;queue.push(edge.to)}}
 const reachable=Object.keys(levels),maxLevel=Math.max(1,...Object.values(levels))
 const visibleLevel=routeDepth.value===0?maxLevel:Math.min(routeDepth.value,maxLevel)
 const hiddenIds=reachable.filter(id=>levels[id]>visibleLevel),showMore=hiddenIds.length>0
 const lastLayer=visibleLevel+(showMore?1:0)+(targetId?1:0),xStep=220,startX=-(lastLayer*xStep)/2,layerIds={}
 for(const id of reachable)if(levels[id]<=visibleLevel)(layerIds[levels[id]]??=[]).push(id)
 const coords={}
 for(const [layerText,ids] of Object.entries(layerIds)){
  const layer=Number(layerText),ordered=ids.sort((a,b)=>(byId[a].label||'').localeCompare(byId[b].label||''))
  const yStep=Math.min(74,720/Math.max(1,ordered.length))
  ordered.forEach((id,i)=>{coords[id]={x:startX+layer*xStep,y:(i-(ordered.length-1)/2)*yStep}})
 }
 const markerX=startX-xStep,viewX=markerX-100,viewWidth=lastLayer*xStep+540
 coords[markerId]={x:markerX,y:0}
 const visible=new Set(reachable.filter(id=>levels[id]<=visibleLevel&&(!hideCompleted.value||!isDone(id))))
 const edges=zeroEdges.filter(e=>visible.has(e.from)&&visible.has(e.to))
 for(const id of startIds)if(visible.has(id))edges.push({from:markerId,to:id,type:'route_start',validation:'navigation'})
 const vertices=[...visible].map(id=>({...byId[id],...coords[id]}))
 vertices.unshift({id:markerId,label:'Start at zero',kind:'route_marker',definition:'',...coords[markerId]})
 if(showMore){
  coords[moreId]={x:startX+(visibleLevel+1)*xStep,y:0}
  const frontier=[...visible].filter(id=>(zeroOutgoing[id]||[]).some(e=>hiddenIds.includes(e.to)))
  for(const id of frontier)edges.push({from:id,to:moreId,type:'route_more',validation:'navigation'})
  vertices.push({id:moreId,label:`Further connected nodes · ${hiddenIds.length}`,kind:'route_marker',definition:'',...coords[moreId]})
 }
 if(targetId&&byId[targetId]&&!visible.has(targetId)){
  coords[targetId]={x:startX+lastLayer*xStep,y:0}
  vertices.push({...byId[targetId],...coords[targetId]})
 }
 const viewBox=`${viewX} -400 ${viewWidth} 800`
 const caption=targetId?`One start at zero toward ${byId[targetId]?.label||'your goal'} · communication and number sense are parallel early-development branches; formal curriculum and qualification records are not learning steps.`:`One start at zero · communication and number sense are parallel early-development branches. Showing ${visible.size} of ${reachable.length} connected learning nodes within ${routeDepth.value===0?'the full learning map':`${visibleLevel} level${visibleLevel===1?'':'s'}`}; formal curriculum and qualification records are not learning steps.`
 return {status:targetId?'zero_unconnected':'no_goal',targetId,vertices,edges,coords,viewBox,svgWidth:viewWidth*.65,caption}
}
const flowGraph=computed(()=>{
 const flowEdges=[
  ...dataset.role_capability_assertions.map(e=>({from:e.to,to:e.from,type:'goal_link',escoType:e.type,validation:e.validation==='source_backed'?'source_backed':'proposed',completionRequirement:e.completion_requirement})),
  ...dataset.decompositions.flatMap(e=>{
   if(e.type==='decomposes_into')return [{from:e.to,to:e.from,type:'learning_component',validation:e.validation,completionRequirement:e.completion_requirement}]
   if(e.type==='prerequisite_for'||e.type==='specializes')return [{from:e.from,to:e.to,type:e.type,validation:e.validation}]
   return []
  }),
  ...outcomeLinks.map(e=>({from:e.from,to:e.to,type:'supports_outcome',validation:e.validation||'proposed'})),
  ...qualificationRequirements.map(e=>({from:e.from,to:e.to,type:'qualification_requirement',validation:e.validation||'source_backed'}))
 ].filter(e=>showOptional.value||!isOptionalLink(e))
 const incoming={},outgoing={}
 for(const e of flowEdges){(incoming[e.to]??=[]).push(e);(outgoing[e.from]??=[]).push(e)}
 return {flowEdges,incoming,outgoing}
})
const unavailablePath=(status,targetId,caption)=>({status,targetId,vertices:[],edges:[],coords:{},caption})
const learningPath=computed(()=>{
 const selected=goalStats.value.find(g=>g.id===pathGoal.value)||goalStats.value[0]
 const {flowEdges,incoming,outgoing}=flowGraph.value
 if(!selected)return zeroLearningGraph(flowEdges,outgoing)
 const targetId=selected.id,target=byId[targetId]
 const coverage=pathwayCoverage(targetId)
 if(coverage&&!coverage.units)return unavailablePath('no_breakdown',targetId,`No required learning activities have been mapped for ${target.label} yet.`)
 const ancestors=new Set([targetId]),back=[targetId]
 while(back.length){const id=back.pop();for(const e of incoming[id]||[])if(!ancestors.has(e.from)){ancestors.add(e.from);back.push(e.from)}}
 const unitIds=[...ancestors].filter(id=>byId[id]?.kind==='learning_unit')
 const relatedCompletions=completed.value.filter(id=>ancestors.has(id)&&id!==targetId)
 if(!unitIds.length)return unavailablePath('no_decomposition',targetId,`No decomposed learning route to ${target.label} is available yet.`)
 const candidates=new Set(),needs=[...unitIds]
 while(needs.length){const id=needs.pop();if(candidates.has(id))continue;candidates.add(id);for(const e of incoming[id]||[])if(ancestors.has(e.from)&&['prerequisite_for','specializes'].includes(e.type))needs.push(e.from)}
 const relevantCompleted=relatedCompletions
 const roots=[...candidates].filter(id=>!(incoming[id]||[]).some(e=>candidates.has(e.from)))
 const nextUncompleted=(startId)=>{
  const found=[],seen=new Set(),queue=(outgoing[startId]||[]).filter(e=>ancestors.has(e.to)).map(e=>e.to)
  for(let i=0;i<queue.length;i++){const id=queue[i];if(seen.has(id))continue;seen.add(id);if(id===targetId||!isDone(id)){found.push(id);continue};for(const e of outgoing[id]||[])if(ancestors.has(e.to))queue.push(e.to)}
  return found
 }
 const earliestRoots=earliestDevelopmentStartIds.filter(id=>candidates.has(id))
 if(!relevantCompleted.length&&!earliestRoots.length)return unavailablePath('unconnected',targetId,`Activities exist for ${target.label}, but a route from your recorded learning or early foundations is not mapped yet.`)
 const possibleStarts=earliestRoots
 let starts=relevantCompleted.length?relevantCompleted:possibleStarts
 if(hideCompleted.value){starts=relevantCompleted.length?[...new Set(relevantCompleted.flatMap(nextUncompleted))]:possibleStarts.filter(id=>!isDone(id));if(!starts.length)starts=[targetId]}
 if(!starts.length)return {status:'no_route',targetId,vertices:[],edges:[],coords:{},caption:`No starting point is represented for ${target.label}.`}
 const reachable=new Set(starts),walk=[...starts]
 while(walk.length){const id=walk.pop();for(const e of outgoing[id]||[])if(ancestors.has(e.to)&&!reachable.has(e.to)){reachable.add(e.to);walk.push(e.to)}}
 if(!reachable.has(targetId))return {status:'no_route',targetId,vertices:[],edges:[],coords:{},caption:`No represented route reaches ${target.label} from your completed capabilities.`}
 const markerId='atlas:path:start'
 const startLabel=hideCompleted.value&&relevantCompleted.length?'Next steps after completed learning':relevantCompleted.length?'What you have learned':'Possible starting points'
 const visibleReachable=new Set([...reachable].filter(id=>!hideCompleted.value||id===targetId||!isDone(id)))
 const vertices=[...visibleReachable].map(id=>({...byId[id]}))
 vertices.push({id:markerId,label:startLabel,kind:'route_marker',definition:''})
 const edges=flowEdges.filter(e=>visibleReachable.has(e.from)&&visibleReachable.has(e.to))
 for(const id of starts)if(visibleReachable.has(id))edges.push({from:markerId,to:id,type:'route_start',validation:'navigation'})
 const routeOutgoing={}
 for(const edge of edges)(routeOutgoing[edge.from]??=[]).push(edge)
 const ids=vertices.map(n=>n.id),indegree=Object.fromEntries(ids.map(id=>[id,0])),rank=Object.fromEntries(ids.map(id=>[id,0]))
 for(const e of edges)indegree[e.to]=(indegree[e.to]||0)+1
 const queue=ids.filter(id=>indegree[id]===0),ordered=[]
 for(let i=0;i<queue.length;i++){const id=queue[i];ordered.push(id);for(const e of routeOutgoing[id]||[]){rank[e.to]=Math.max(rank[e.to]||0,(rank[id]||0)+1);indegree[e.to]--;if(indegree[e.to]===0)queue.push(e.to)}}
 const learningSteps=Object.fromEntries(ids.map(id=>[id,Infinity]));learningSteps[markerId]=0
 for(const id of ordered)for(const e of routeOutgoing[id]||[]){
  const isNewUnit=byId[e.to]?.kind==='learning_unit'&&!relevantCompleted.includes(e.to)
  learningSteps[e.to]=Math.min(learningSteps[e.to],learningSteps[id]+(isNewUnit?1:0))
 }
 const maxRank=Math.max(1,...Object.values(rank))
 rank[targetId]=maxRank
 const columns={}
 for(const id of ids){(columns[rank[id]||0]??=[]).push(id)}
 const coords={}
 for(const [layerText,layerIds] of Object.entries(columns)){
  const layer=Number(layerText),sorted=layerIds.sort((a,b)=>(byId[a]?.label||startLabel).localeCompare(byId[b]?.label||startLabel))
  const step=Math.min(82,680/Math.max(1,sorted.length))
  sorted.forEach((id,i)=>{
   const x=id===markerId?-410:Math.min(355,-310+(layer/maxRank)*630)
   coords[id]={x,y:(i-(sorted.length-1)/2)*step}
  })
 }
 let visibleIds=new Set(ids),shownEdges=edges,shownVertices=vertices
 if(routeDepth.value>0){
  visibleIds=new Set(ids.filter(id=>id===markerId||id===targetId||learningSteps[id]<=routeDepth.value))
  const hiddenIds=new Set(ids.filter(id=>!visibleIds.has(id)&&id!==markerId&&id!==targetId))
  if(hiddenIds.size){
   const moreId='atlas:path:more',hiddenUnits=[...hiddenIds].filter(id=>byId[id]?.kind==='learning_unit').length
   const label=hiddenUnits?`Further steps · ${hiddenUnits} units`:'Further route'
   const frontier=[...visibleIds].filter(id=>id!==markerId&&id!==targetId&&edges.some(e=>e.from===id&&hiddenIds.has(e.to)))
   shownEdges=edges.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to))
   for(const id of frontier)shownEdges.push({from:id,to:moreId,type:'route_more',validation:'navigation'})
   shownEdges.push({from:moreId,to:targetId,type:'route_more',validation:'navigation'})
   visibleIds.add(moreId)
   const frontierY=frontier.length?frontier.reduce((sum,id)=>sum+coords[id].y,0)/frontier.length:0
   coords[moreId]={x:Math.max(-220,coords[targetId].x-115),y:frontierY}
   shownVertices=[...vertices,{id:moreId,label,kind:'route_marker',definition:''}]
  } else shownEdges=edges
  shownVertices=shownVertices.filter(n=>visibleIds.has(n.id))
 } else shownEdges=edges
 const caption=hideCompleted.value&&relevantCompleted.length?`Showing remaining steps toward ${target.label} · completed nodes are hidden`:relevantCompleted.length?`From your completed capabilities toward ${target.label} · route follows current Atlas links`:completed.value.length?`No completed capability connects to ${target.label} yet · showing possible starts`:`Possible starting points toward ${target.label} · route is not a validated sequence`
 return {status:'ready',targetId,vertices:shownVertices.map(n=>({...n,...coords[n.id]})),edges:shownEdges,coords,caption,hasCompletedStart:!!relevantCompleted.length,scopeIds:[...ancestors]}
})
const displayGraph=computed(()=>graphMode.value==='path'?learningPath.value:localGraph.value)
const routeNotice=computed(()=>{
 const path=learningPath.value
 if(!path.targetId)return null
 const coverage=pathwayCoverage(path.targetId)
 if(path.status!=='ready')return {title:path.status==='no_breakdown'?'Learning activities are not mapped yet':'The learning route has a gap',text:path.caption,empty:true}
 if(coverage?.breakdown==='partial')return {title:'Partial draft route',text:`${coverage.developed} of ${coverage.total} required capabilities have activity breakdowns. The graph shows the mapped branches; other required capabilities still need learning activities.`,empty:false}
 return {title:coverage?.review.status==='reviewed'?'Route with a documented content review':'Draft learning route',text:'Activity breakdowns and route links describe the current learning model. Review scope and evidence are shown with the selected item.',empty:false}
})
const generalSuggestionNotice=computed(()=>goalStats.value.length&&learningPath.value.status!=='ready'?`These are general starting activities. A learning route to ${byId[learningPath.value.targetId]?.label||'the selected goal'} has not been mapped yet.`:'')
const pct=(done,total)=>total?Math.round(100*done/total):0
const labelCut=(s,n=25)=>s.length>n?s.slice(0,n-1)+'…':s
const isGraphPrimary=id=>graphMode.value==='path'?id===learningPath.value.targetId:id===center.value
const progressRing=id=>{const radius=graphNodeRadius(id)+5,circumference=2*Math.PI*radius,percent=progressByNode.value[id]?.percent||0;return {radius,circumference,offset:circumference*(1-percent/100)}}
const colorOf=n=>n.kind==='route_marker'?'#67d7ba':n.kind==='role'||n.kind==='qualification'?'#f7bf79':n.kind==='framework_outcome'?'#62c9d5':isDone(n.id)?'#65d6aa':n.kind==='learning_unit'?'#d19cf2':'#8cb8f5'
const edgeStroke=e=>e.validation==='navigation'?'#7b91a8':isOptionalLink(e)?'#a990c8':e.validation==='proposed'?'#daaa69':e.type==='qualification_requirement'?'#62c9d5':'#56718e'
const edgeDash=e=>e.validation==='navigation'?'2 5':isOptionalLink(e)?'2 4':e.validation==='proposed'?'6 5':null
function onWheel(e){if(graphMode.value==='path'&&learningPath.value.status==='no_goal'&&(e.shiftKey||Math.abs(e.deltaX)>0)){e.preventDefault();e.currentTarget.scrollLeft+=e.deltaX||e.deltaY;return}e.preventDefault();zoom.value=Math.min(2.8,Math.max(.48,zoom.value*(e.deltaY<0?1.10:.9)))}
function resetGraphView(){zoom.value=1;pan.value={x:0,y:0};graphCanvas.value?.scrollTo({left:0,top:0,behavior:'smooth'})}
function startPan(e){if(e.target.closest('[data-node]'))return;drag.value={x:e.clientX,y:e.clientY,px:pan.value.x,py:pan.value.y};e.currentTarget.setPointerCapture?.(e.pointerId)}
function movePan(e){if(drag.value)pan.value={x:drag.value.px+(e.clientX-drag.value.x),y:drag.value.py+(e.clientY-drag.value.y)}}
function endPan(){drag.value=null}
function resetDemo(){if(confirm('Reset all learning state? This clears completed learning, assessment snapshots, and saved goals.')){completed.value=[];assessmentCoverage.value={};favorites.value=[];pathGoal.value='';center.value=earliestDevelopmentStartId;routeDepth.value=2;depth.value=1;hideCompleted.value=false;showOptional.value=true;showAll.value=false;graphMode.value='path';selectedTab.value='graph';resetGraphView()}}
const graphTitle=computed(()=>`${focusNode.value.label} • ${depth.value}-hop neighborhood`)
</script>


<template>
  <div class="workbench-shell">
    <a class="workbench-skip" href="#workbench-content">Skip to workbench content</a>
    <header class="workbench-header">
      <div class="workbench-brand"><span class="brand-mark" aria-hidden="true">◈</span><div><span class="eyebrow">CAPABILITY ATLAS</span><h1>Concept workbench</h1></div></div>
      <div class="workbench-context"><span class="status-dot" aria-hidden="true"></span><span>{{formatCount(catalogueOverview.occupations)}} occupations · {{formatCount(catalogueOverview.skills)}} capabilities</span><span class="version-label">v{{appVersion}}</span></div>
    </header>

    <nav class="workbench-tabs" role="tablist" aria-label="Workbench sections">
      <button v-for="tab in workbenchTabs" :id="'workbench-tab-'+tab.id" :key="tab.id" :data-tab="tab.id" role="tab" :aria-selected="workbenchTab===tab.id" :aria-controls="'workbench-panel-'+tab.id" :tabindex="workbenchTab===tab.id?0:-1" @click="workbenchTab=tab.id" @keydown="workbenchKey">{{tab.label}}</button>
    </nav>

    <div class="workbench-layout">
      <aside class="concept-library" aria-label="Concept library">
        <div class="library-heading"><h2>Concepts & activities</h2><span>{{formatCount(nodes.length)}}</span></div>
        <label class="field-label" for="concept-search">Find by name</label>
        <div class="search-field"><span aria-hidden="true">⌕</span><input id="concept-search" v-model="libraryQuery" type="search" placeholder="Name, Dutch name, or ID" autocomplete="off"/></div>
        <div class="library-filters">
          <label>Show<select id="concept-kind" v-model="libraryKind"><option value="all">All concepts and activities</option><option value="learning_unit">Activities / functions</option><option value="skill">Capabilities</option><option value="role">Occupations</option><option value="atlas">Atlas life & profession roles</option><option value="framework_outcome">Curriculum outcomes</option><option value="qualification">Qualifications</option></select></label>
          <label>Sort by<select id="concept-sort" v-model="librarySort"><option value="links">Most linked</option><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label>
        </div>
        <p class="ranking-note">Link count shows connectivity. Activation frequency is not recorded.</p>
        <p class="library-result-count" role="status" aria-live="polite">{{formatCount(libraryResults.total)}} results <span>· {{libraryResults.start}}–{{libraryResults.end}}</span></p>
        <ul v-if="libraryResults.total" class="concept-results">
          <li v-for="node in libraryResults.items" :key="node.id"><button :class="{'is-selected':center===node.id}" :aria-current="center===node.id?'true':undefined" @click="inspectConcept(node.id)"><span class="concept-type-mark" :data-kind="node.kind" aria-hidden="true">{{node.kind==='learning_unit'?'ƒ':node.kind==='role'?'◈':'◇'}}</span><span class="concept-result-text"><strong>{{node.label}}</strong><small>{{conceptType(node)}}</small></span><span class="link-count" :title="inspectionModel.metrics(node.id).links+' direct relationship links'">{{formatCount(inspectionModel.metrics(node.id).links)}}<small>links</small></span></button></li>
        </ul>
        <div v-else class="empty">No matching concepts. Try a shorter name or another type.<button class="small outline" @click="libraryQuery='';libraryKind='all'">Clear search</button></div>
        <nav class="library-pagination" aria-label="Concept result pages"><button :disabled="libraryResults.page<=1" @click="libraryPage=libraryResults.page-1" aria-label="Previous concept page">←</button><span>{{libraryResults.page}} / {{libraryResults.pages}}</span><button :disabled="libraryResults.page>=libraryResults.pages" @click="libraryPage=libraryResults.page+1" aria-label="Next concept page">→</button></nav>
      </aside>

      <main id="workbench-content" class="workbench-main" tabindex="-1">
        <section v-if="workbenchTab==='inspect'" id="workbench-panel-inspect" role="tabpanel" aria-labelledby="workbench-tab-inspect" class="inspection-workspace">
          <div class="inspection-breadcrumb"><div class="history-controls"><button :disabled="historyIndex===0" @click="stepInspection(-1)" aria-label="Previous inspected concept">←</button><button :disabled="historyIndex>=inspectionHistory.length-1" @click="stepInspection(1)" aria-label="Next inspected concept">→</button></div><span>{{conceptType(focusNode)}}</span><span class="breadcrumb-separator">/</span><span>{{focusNode.source==='ESCO'?'ESCO catalogue':'Atlas learning model'}}</span></div>
          <header class="concept-header">
            <div><div class="eyebrow">{{focusNode.kind==='learning_unit'?'FUNCTION / LEARNING ACTIVITY':'CONCEPT INSPECTION'}}</div><h2 tabindex="-1">{{focusNode.label}}</h2><div class="concept-badges"><span :data-kind="focusNode.kind">{{conceptType(focusNode)}}</span><span>{{focusedCoverage.contentLabel}}</span><span v-if="focusNode.source_status==='obsolete'" class="obsolete-badge">Obsolete source concept</span></div></div>
            <div class="concept-actions"><button class="outline" :aria-pressed="isFav(center)" @click="toggleFav(center)">{{isFav(center)?'★ Saved goal':'☆ Save as goal'}}</button><button v-if="isLearnerNode(center)" :class="{'is-complete':isDone(center)}" @click="toggleDone(center)">{{completionActionLabel(center)}}</button></div>
          </header>
          <div class="concept-metrics"><span><strong>{{formatCount(inspectionMetrics.links)}}</strong> relationship links</span><span><strong>{{formatCount(inspectionMetrics.incoming)}}</strong> incoming</span><span><strong>{{formatCount(inspectionMetrics.outgoing)}}</strong> outgoing</span><span class="review-indicator">{{focusedCoverage.reviewLabel}}</span></div>
          <nav class="inspector-tabs" role="tablist" aria-label="Concept inspection views"><button v-for="tab in inspectorTabs" :id="'inspect-tab-'+tab.id" :key="tab.id" :data-tab="tab.id" role="tab" :aria-selected="inspectorTab===tab.id" :aria-controls="'inspect-panel-'+tab.id" :tabindex="inspectorTab===tab.id?0:-1" @click="inspectorTab=tab.id" @keydown="inspectorKey">{{tab.label}}</button></nav>

          <div v-if="detailLoading" class="detail-loading" role="status">Loading this concept’s definition and assessment details. Its mapped relationships remain available.</div>
          <div v-else-if="detailError" class="detail-error" role="alert"><p>{{detailError}}</p><button @click="detailErrorAction==='reload'?reloadCatalogue():refreshDetail()">{{detailErrorAction==='reload'?'Reload catalogue':'Try again'}}</button></div>
          <div v-if="focusNode.source_status==='obsolete'" class="obsolete-notice">This source concept is retained for existing learning records.<button v-if="focusDetail?.replaced_by&&byId[focusDetail.replaced_by]" class="linklike" @click="inspectConcept(focusDetail.replaced_by)">Inspect its replacement →</button></div>
          <section v-for="tab in inspectorTabs.filter(tab=>tab.id!==inspectorTab)" :id="'inspect-panel-'+tab.id" :key="tab.id" role="tabpanel" :aria-labelledby="'inspect-tab-'+tab.id" hidden></section>

          <section v-if="inspectorTab==='overview'" id="inspect-panel-overview" class="inspection-panel overview-panel" role="tabpanel" aria-labelledby="inspect-tab-overview">
            <div class="overview-reading">
              <article class="purpose-card"><span class="section-kicker">MEANING & PURPOSE</span><h3>{{functionalContract.isActivity?'What this activity does':'What this concept represents'}}</h3><p v-if="functionalContract.purpose" class="concept-definition">{{functionalContract.purpose}}</p><p v-else-if="!detailLoading&&!detailError" class="unspecified">A definition has not been recorded for this concept.</p><div class="purpose-footer"><span>{{focusNode.source==='ESCO'?'Official ESCO concept; learning activities are Atlas proposals.':'Atlas-authored learning content.'}}</span><button class="text-action" @click="inspectorTab='evidence'">Inspect source & status →</button></div></article>
              <div class="functional-glance">
                <article><span class="section-kicker">01 · INPUT</span><h3>{{functionalContract.inputLabel}}</h3><strong>{{functionalContract.inputs.length}} mapped</strong><p>{{functionalContract.isActivity?'Starting conditions are shown separately from the activity brief.':'Inspect the requirements and component concepts.'}}</p></article>
                <article><span class="section-kicker">02 · ACTIVITY / SCOPE</span><h3>{{functionalContract.isActivity?'The learning function':'Concept definition'}}</h3><p>{{functionalContract.isActivity?'The activity brief describes the task to perform.':'This record defines a capability, role, or formal requirement.'}}</p><span class="type-pill">{{conceptType(focusNode)}}</span></article>
                <article><span class="section-kicker">03 · OUTPUT</span><h3>{{functionalContract.isActivity?'Expected evidence':'Outputs & use'}}</h3><strong v-if="functionalContract.isActivity">{{detailLoading?'Loading assessment criteria…':detailError?'Assessment details unavailable':functionalContract.criteria.length+' assessment criteria'}}</strong><strong v-else>{{functionalContract.supports.length}} downstream links</strong><p>{{functionalContract.isActivity?'Criteria describe what a result should demonstrate.':'Downstream associations describe use, not execution results.'}}</p></article>
              </div>
              <button class="inspect-contract-button" @click="inspectorTab='io'">Inspect inputs, activity, and outputs <span aria-hidden="true">→</span></button>
              <article class="coverage-summary"><div><span class="section-kicker">LEARNING COVERAGE</span><h3>{{focusedCoverage.status}}</h3></div><p v-if="focusNode.kind==='role'">{{focusedCoverage.developed}} of {{focusedCoverage.total}} required capabilities have activity breakdowns.</p><p v-else>{{focusedCoverage.units}} required activities are represented in this learning model.</p><button class="text-action" @click="inspectorTab='evidence'">Inspect gaps & review evidence →</button></article>
            </div>
            <aside class="nearby-preview"><div class="panel-heading"><div><span class="section-kicker">ONE HOP AWAY</span><h3>Related concepts</h3></div><span>{{formatCount(nearbyConcepts.total)}}</span></div><p class="helper-copy">A few directly connected concepts, ordered by link count.</p><ul><li v-for="row in [...nearbyConcepts.incoming,...nearbyConcepts.outgoing].slice(0,6)" :key="row.direction+row.node.id"><button @click="inspectConcept(row.node.id)"><small>{{row.labels.join(' · ')}}</small><strong>{{row.node.label}}</strong><span>{{conceptType(row.node)}} · {{formatCount(row.linkCount)}} links</span></button></li></ul><p v-if="!nearbyConcepts.total" class="unspecified">No direct relationships are mapped.</p><button class="text-action" @click="inspectorTab='relationships'">Open relationship map →</button></aside>
          </section>

          <section v-if="inspectorTab==='io'" id="inspect-panel-io" class="inspection-panel" role="tabpanel" aria-labelledby="inspect-tab-io">
            <div class="view-introduction"><span class="section-kicker">FUNCTIONAL CONTRACT</span><h3>Inputs → activity → expected result</h3><p>Mapped prerequisites, the recorded brief, and assessment criteria are shown as separate parts. Unspecified fields remain visible as gaps.</p></div>
            <div class="contract-grid">
              <article class="contract-card contract-input"><span class="contract-step">01</span><span class="section-kicker">INPUT</span><h3>{{functionalContract.inputLabel}}</h3><p v-if="functionalContract.inputSpecification">{{functionalContract.inputSpecification}}</p><p v-else-if="!detailLoading&&!detailError" class="unspecified">A separate input specification has not been recorded.</p><h4>Mapped starting conditions / components</h4><ul v-if="functionalContract.inputs.length" class="contract-concepts"><li v-for="item in functionalContract.inputs" :key="item.node.id"><button @click="inspectConcept(item.node.id)"><small>{{item.label}} · {{item.status}}</small><strong>{{item.node.label}}</strong></button></li></ul><p v-else class="unspecified">No prerequisite or required-component links are mapped.</p></article>
              <article class="contract-card contract-function"><span class="contract-step">02</span><span class="section-kicker">{{functionalContract.isActivity?'FUNCTION / ACTIVITY':'CONCEPT / SCOPE'}}</span><h3>{{functionalContract.isActivity?'What it does':'What it means'}}</h3><p v-if="functionalContract.purpose" class="concept-definition">{{functionalContract.purpose}}</p><p v-else-if="!detailLoading&&!detailError" class="unspecified">No activity brief or definition has been recorded.</p><dl v-if="focusDetail?.estimated_active_learning_hours" class="fact-list"><dt>Illustrative learning effort</dt><dd>{{focusDetail.estimated_active_learning_hours.min}}–{{focusDetail.estimated_active_learning_hours.max}} active hours</dd></dl><p class="helper-copy">{{functionalContract.isActivity?'This is a learning activity to inspect, not an executable software function.':'Connections describe the learning model and source catalogue.'}}</p></article>
              <article class="contract-card contract-output"><span class="contract-step">03</span><span class="section-kicker">OUTPUT / EVIDENCE</span><h3>{{functionalContract.outputLabel}}</h3><p v-if="functionalContract.outputSpecification">{{functionalContract.outputSpecification}}</p><ol v-if="functionalContract.criteria.length" class="output-criteria"><li v-for="criterion in functionalContract.criteria" :key="criterion">{{criterion}}</li></ol><p v-else-if="!detailLoading&&!detailError" class="unspecified">{{functionalContract.isActivity?'No assessment criteria or output specification have been recorded.':'A separate output specification is not recorded for this concept.'}}</p><dl v-if="functionalContract.assessmentMethod" class="fact-list"><dt>How the result is checked</dt><dd>{{functionalContract.assessmentMethod}}</dd></dl><p v-if="!functionalContract.isActivity" class="helper-copy">Role requirements and associations are not treated as function return values.</p></article>
            </div>
            <div class="context-grid"><article class="inspection-card"><h3>Part of / used within</h3><ul class="context-links"><li v-for="item in functionalContract.context.slice(0,6)" :key="item.node.id"><button @click="inspectConcept(item.node.id)">{{item.node.label}} <span>→</span></button></li></ul><p v-if="!functionalContract.context.length" class="unspecified">No parent component relationships are mapped.</p></article><article class="inspection-card"><h3>Supports / enables</h3><ul class="context-links"><li v-for="item in functionalContract.supports.slice(0,6)" :key="item.node.id"><button @click="inspectConcept(item.node.id)"><span>{{item.node.label}}<small>{{item.label}} · {{item.status}}</small></span><span>→</span></button></li></ul><p v-if="!functionalContract.supports.length" class="unspecified">No downstream uses are mapped.</p><button v-if="functionalContract.supports.length>6" class="text-action" @click="inspectorTab='relationships'">Inspect all downstream relationships →</button></article></div>
          </section>

          <section v-if="inspectorTab==='relationships'" id="inspect-panel-relationships" class="inspection-panel" role="tabpanel" aria-labelledby="inspect-tab-relationships">
            <div class="view-introduction"><span class="section-kicker">LOCAL RELATIONSHIP MAP</span><h3>Nearest connections</h3><p>One hop from the selected concept. Arrows show recorded relationship direction, not execution flow. Click a concept to inspect it.</p></div>
            <div class="connection-map">
              <div class="map-lane incoming-lane"><h4>Incoming <span>→</span></h4><button v-for="row in nearbyConcepts.incoming" :key="row.node.id" class="map-node" @click="inspectConcept(row.node.id)"><small>{{row.flowLabels.join(' · ')}}</small><strong>{{row.node.label}}</strong><span>{{conceptType(row.node)}} · {{formatCount(row.linkCount)}} links</span></button><p v-if="!nearbyConcepts.incoming.length" class="unspecified">No incoming connections.</p></div>
              <div class="map-focus"><span class="section-kicker">SELECTED CONCEPT</span><strong>{{focusNode.label}}</strong><span>{{conceptType(focusNode)}}</span></div>
              <div class="map-lane outgoing-lane"><h4><span>→</span> Outgoing</h4><button v-for="row in nearbyConcepts.outgoing" :key="row.node.id" class="map-node" @click="inspectConcept(row.node.id)"><small>{{row.flowLabels.join(' · ')}}</small><strong>{{row.node.label}}</strong><span>{{conceptType(row.node)}} · {{formatCount(row.linkCount)}} links</span></button><p v-if="!nearbyConcepts.outgoing.length" class="unspecified">No outgoing connections.</p></div>
            </div>
            <div class="connections-heading"><div><h3>All direct connections</h3><p>Inspect every mapped connection using search, direction, and sorting.</p></div><span>{{formatCount(relatedResults.total)}} connections</span></div>
            <div class="relationship-filters"><label>Find a related concept<input v-model="relatedQuery" type="search" placeholder="Search related names"/></label><label>Direction<select v-model="relatedDirection"><option value="all">Incoming and outgoing</option><option value="in">Incoming</option><option value="out">Outgoing</option></select></label><label>Sort by<select v-model="relatedSort"><option value="links">Most linked concepts</option><option value="name">Name A–Z</option></select></label></div>
            <div class="relationship-table-wrap"><table class="relationship-table"><thead><tr><th scope="col">Related concept</th><th scope="col">Selected concept’s relation</th><th scope="col">Direction</th><th scope="col">Concept links</th></tr></thead><tbody><tr v-for="row in relatedResults.items" :key="row.direction+row.node.id"><td><button @click="inspectConcept(row.node.id)"><strong>{{row.node.label}}</strong><small>{{conceptType(row.node)}}</small></button></td><td>{{row.labels.join(' · ')}}<small>{{row.statuses.join(' · ')}}</small></td><td>{{row.direction==='in'?'Incoming → this':'This → outgoing'}}</td><td>{{formatCount(row.linkCount)}}</td></tr></tbody></table><p v-if="!relatedResults.total" class="empty">No connections match these filters.</p></div>
            <nav class="results-pagination" aria-label="Relationship pages"><button class="outline" :disabled="relatedResults.page<=1" @click="relatedPage=relatedResults.page-1">Previous</button><span>Page {{relatedResults.page}} of {{relatedResults.pages}}</span><button class="outline" :disabled="relatedResults.page>=relatedResults.pages" @click="relatedPage=relatedResults.page+1">Next</button></nav>
            <details v-if="focusNode.id===softwareDeveloperId" class="inspection-card optional-group-reference"><summary>Software-developer optional skill groupings</summary><section v-for="group in connectionGroups.filter(group=>group.key.startsWith('esco_optional'))" :key="group.key"><h4>{{group.label}}</h4><p>{{group.note}}</p><ul class="context-links"><li v-for="item in group.items" :key="item.id"><button @click="inspectConcept(item.id)">{{item.node.label}}</button></li></ul></section></details>
          </section>

          <section v-if="inspectorTab==='evidence'" id="inspect-panel-evidence" class="inspection-panel evidence-grid" role="tabpanel" aria-labelledby="inspect-tab-evidence">
            <article class="inspection-card source-reference"><span class="section-kicker">IDENTITY & PROVENANCE</span><h3>Source record</h3><dl class="fact-list"><dt>Concept type</dt><dd>{{conceptType(focusNode)}}</dd><dt>Source</dt><dd>{{focusNode.source||'Not recorded'}}</dd><dt>Version</dt><dd>{{focusNode.source_version||'Not recorded'}}</dd><dt>Identifier</dt><dd><code>{{focusNode.id}}</code></dd><template v-if="focusNode.notation"><dt>Occupation code</dt><dd>ISCO {{focusNode.notation}}</dd></template><template v-if="focusDetail?.framework_code"><dt>Framework code</dt><dd>{{focusDetail.framework}} · {{focusDetail.framework_code}}</dd></template><template v-if="focusDetail?.mbo_level"><dt>Qualification level</dt><dd>MBO {{focusDetail.mbo_level}} · EQF {{focusDetail.eqf_level}}</dd></template><template v-if="focusDetail?.official_status"><dt>Official record status</dt><dd>{{focusDetail.official_status}}</dd></template><template v-if="focusDetail?.education_stage"><dt>Education stage</dt><dd>{{focusDetail.education_stage}}</dd></template><template v-if="focusDetail?.qualification_type"><dt>Qualification type</dt><dd>{{focusDetail.qualification_type}}</dd></template><template v-if="focusDetail?.source_code"><dt>Source code</dt><dd>{{focusDetail.source_code}}</dd></template><template v-if="focusDetail?.valid_from"><dt>Valid from</dt><dd>{{focusDetail.valid_from}}</dd></template></dl><a v-if="focusDetail?.source_url" :href="focusDetail.source_url" target="_blank" rel="noreferrer" class="source-action">Open official source record ↗</a><div v-if="focusDetail?.supporting_sources?.length" class="source-links"><h4>Supporting references</h4><a v-for="source in focusDetail.supporting_sources" :key="source.url" :href="source.url" target="_blank" rel="noreferrer">{{source.title}} ↗</a></div><p v-if="focusDetail?.note">{{focusDetail.note}}</p><p v-if="focusDetail?.evidence_basis">{{focusDetail.evidence_basis}}</p><p v-if="focusDetail?.reusability?.classification" class="helper-copy">Reuse classification: {{focusDetail.reusability.classification}}</p><p v-if="focusDetail?.reusability?.hypothesis">{{focusDetail.reusability.hypothesis}}</p><p class="helper-copy">Source provenance, content review, and learner assessment are recorded separately.</p></article>
            <article class="inspection-card review-reference"><span class="section-kicker">COVERAGE & REVIEW</span><h3>What is developed and reviewed?</h3><section v-if="focusedCoverage" class="pathway-coverage" aria-label="Selected item learning coverage">
        <strong>{{focusedCoverage.contentLabel}}</strong>
        <span v-if="focusNode.kind==='role'">{{focusedCoverage.developed}} / {{focusedCoverage.total}} required capabilities have learning activities. {{focusedCoverage.status}}.</span>
        <span v-else-if="focusNode.kind==='skill'">{{focusedCoverage.units}} required learning activities are mapped. {{focusedCoverage.status}}.</span>
        <span v-else-if="focusNode.kind==='learning_unit'">This is an individual Atlas learning activity.</span>
        <span v-else>{{focusedCoverage.units}} Atlas activities are mapped to this record; formal requirements and their partial alignment remain separate.</span>
        <span v-if="focusedCoverage.generated">{{focusedCoverage.generated}} of {{focusedCoverage.units}} required activities use generated activity templates.</span>
        <div class="review-status"><strong>{{focusedCoverage.reviewLabel}}</strong><p v-if="!focusedCoverage.review.records.length">No content review has been recorded for this item.</p><p v-if="focusedCoverage.reviewedActivities||focusedCoverage.reviewedCapabilities">{{focusedCoverage.reviewedActivities}} activities and {{focusedCoverage.reviewedCapabilities}} required capabilities have a current documented review. These individual reviews cover their recorded scopes.</p></div>
        <details class="review-explainer"><summary>What does a review cover?</summary><p>A review records who checked a specific content version, the scope of that check, their decision, and supporting evidence. A source citation is provenance. Content review does not establish learner competence or award a qualification.</p></details>
        <details v-if="focusedCoverage.review.records.length" class="review-evidence"><summary>Review evidence ({{focusedCoverage.review.records.length}})</summary><article v-for="review in focusedCoverage.review.records" :key="review.id"><strong>{{review.reviewer.name}}</strong><p>{{review.reviewer.expertise}} · {{review.reviewed_at.slice(0,10)}}</p><p>{{catalogueModel.reviewScopeLabels[review.scope]}}</p><p>{{review.decision==='accepted'?'Accepted within this scope':'Changes requested'}} · {{review.current?'matches current content':'previous content version'}}</p><p>{{review.summary}}</p><a v-for="evidence in review.evidence" :key="evidence.url" :href="evidence.url" target="_blank" rel="noreferrer">{{evidence.title}} ↗</a></article></details>
        <details v-if="focusedCoverage.missingIds.length" class="missing-capabilities"><summary>Capabilities still missing activities ({{focusedCoverage.missingIds.length}})</summary><ul><li v-for="id in focusedCoverage.missingIds" :key="id"><button class="linklike" @click="focus(id);graphMode='relations'">{{byId[id].label}}</button></li></ul></details>
      </section></article>
            <article class="inspection-card assessment-reference"><span class="section-kicker">RECORDED LEARNING STATE</span><h3>Progress through this model</h3><div class="inspection-progress"><strong>{{focusedProgress.percent}}%</strong><span>{{focusedProgress.done}} / {{focusedProgress.total}} represented required items recorded complete</span></div><div class="progress" role="progressbar" :aria-valuenow="focusedProgress.percent" aria-valuemin="0" aria-valuemax="100" aria-label="Recorded model progress"><div :style="{width:focusedProgress.percent+'%'}"></div></div><p v-if="focusedProgress.optional">{{focusedProgress.optional}} optional items are excluded.</p><p v-if="focusedProgress.stale">{{focusedProgress.stale}} saved parent assessments need review against the current breakdown.</p><p v-if="['framework_outcome','qualification'].includes(focusNode.kind)">{{requirementCoverageForNode(center).mapped}} / {{requirementCoverageForNode(center).total}} formal requirements have Atlas activity links. These are partial learning alignments.</p><details><summary>How progress is recorded</summary><p>Required decomposition leaves count toward this model’s percentage. A capability without activities counts as one self-reported item. Optional activities are excluded. Parent assessments retain snapshots of the steps they covered.</p><p>The percentage describes recorded learning in this model. It does not establish occupational competence or award a qualification.</p></details><button class="text-action" @click="workbenchTab='learning';learningTab='goals'">Open learning workspace →</button></article>
          </section>
        </section>

        <section v-if="workbenchTab==='learning'" id="workbench-panel-learning" class="workbench-learning" role="tabpanel" aria-labelledby="workbench-tab-learning">
          <header class="workspace-heading"><span class="section-kicker">PERSONAL LEARNING</span><h2>Learning workspace</h2><p>Keep goals, suggested activities, and route exploration in their own views.</p></header>
          <nav class="inspector-tabs" role="tablist" aria-label="Learning workspace views"><button v-for="tab in learningTabs" :id="'learning-tab-'+tab.id" :key="tab.id" :data-tab="tab.id" role="tab" :aria-selected="learningTab===tab.id" :aria-controls="'learning-panel-'+tab.id" :tabindex="learningTab===tab.id?0:-1" @click="learningTab=tab.id" @keydown="learningKey">{{tab.label}}</button></nav>
          <section v-for="tab in learningTabs.filter(tab=>tab.id!==learningTab)" :id="'learning-panel-'+tab.id" :key="tab.id" role="tabpanel" :aria-labelledby="'learning-tab-'+tab.id" hidden></section>
          <section v-if="learningTab==='goals'" id="learning-panel-goals" role="tabpanel" aria-labelledby="learning-tab-goals" class="inspection-panel">
            <div class="learning-summary"><article><strong>{{completed.length}}</strong><span>items recorded complete</span></article><article><strong>{{favorites.length}}</strong><span>saved goals</span></article><button class="outline" @click="resetDemo">Reset learning</button></div>
            <p v-if="!goalStats.length" class="empty">No saved goals yet. Inspect a concept and choose “Save as goal”.</p><div class="goals-grid"><article v-for="g in goalStats" :key="g.id" class="goal-card"><div class="goal-row"><button class="linklike" @click="inspectConcept(g.id)">{{g.node.label}}</button><button class="star" @click="toggleFav(g.id)" :aria-label="'Remove goal '+g.node.label">★</button></div><p class="helper-copy">{{conceptType(g.node)}} · {{g.pathway.contentLabel}}</p><div class="progress" role="progressbar" :aria-valuenow="g.progress.percent" aria-valuemin="0" aria-valuemax="100" aria-label="Goal model progress"><div :style="{width:g.progress.percent+'%'}"></div></div><p>{{g.progress.percent}}% · {{g.progress.done}} / {{g.progress.total}} represented required items recorded complete</p><small>{{g.pathway.status}} · {{g.pathway.reviewLabel}}</small><small v-if="g.pathway.breakdown==='none'||g.pathway.breakdown==='partial'">Activities are missing for part of this model. Undecomposed capabilities count as self-reported items.</small><small v-if="g.progress.optional">{{g.progress.optional}} optional items excluded.</small><small v-if="g.progress.stale">{{g.progress.stale}} saved assessments need review.</small><div class="goal-actions"><button class="outline" @click="inspectConcept(g.id)">Inspect concept</button><button @click="openGoalRoute(g.id)">Open route →</button></div></article></div>
            <p class="workspace-footnote">Learning state is stored in this browser. Model progress and activity coverage are separate measures.</p>
          </section>
          <section v-if="learningTab==='next'" id="learning-panel-next" role="tabpanel" aria-labelledby="learning-tab-next" class="inspection-panel"><div class="view-introduction"><h3>Next available activities</h3><p>Open an activity to inspect its inputs, brief, and assessment criteria before recording completion.</p></div><p v-if="generalSuggestionNotice" class="general-suggestions-note" role="status">{{generalSuggestionNotice}}</p><div class="suggestions"><div v-if="!suggested.length" class="empty">No directly available next activity is mapped from the current learning evidence. Inspect a goal’s relationships to explore the gap.</div><article v-for="s in suggested" :key="s.id" class="suggestion"><div class="suggestion-body"><button class="linklike strong" @click="inspectConcept(s.id,'io')">{{byId[s.id].label}}</button><p class="helper-copy">{{[...s.reasons].join(' · ')}}</p></div><button class="small" @click="toggleDone(s.id)">{{completionActionLabel(s.id)}}</button><button class="star" :aria-pressed="isFav(s.id)" :aria-label="'Save goal '+byId[s.id].label" @click="toggleFav(s.id)">{{isFav(s.id)?'★':'☆'}}</button></article></div><button class="outline" v-if="suggested.length>=10||showAll" @click="showAll=!showAll">{{showAll?'Show fewer activities':'Show more available activities'}}</button></section>
          <section v-if="learningTab==='route'" id="learning-panel-route" role="tabpanel" aria-labelledby="learning-tab-route" class="inspection-panel"><div class="graph-section"><div class="graph-heading"><div><h2>{{graphMode==='path'?'Your learning route':'Explore connected capabilities'}}</h2><div class="muted mini">{{graphMode==='path'?learningPath.caption:graphTitle+' · click a node to make it the center'}}</div></div><div class="graph-controls"><label v-if="graphMode==='path'&&(goalStats.length||learningPath.status==='no_goal')">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'Steps':'Levels'}} <select v-model.number="routeDepth"><option :value="1">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'1 step':'1 level'}}</option><option :value="2">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'2 steps':'2 levels'}}</option><option :value="0">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'Full route':'Full map'}}</option></select></label><label v-if="graphMode==='path'&&goalStats.length">Goal <select v-model="pathGoal" @change="focus(pathGoal)"><option v-for="g in goalStats" :key="g.id" :value="g.id">{{g.node.label}}</option></select></label><label v-if="graphMode==='relations'">Depth <select v-model.number="depth"><option :value="1">1 hop</option><option :value="2">2 hops</option></select></label><button class="small outline" :aria-pressed="hideCompleted" @click="hideCompleted=!hideCompleted">{{hideCompleted?'Show completed':'Hide completed'}}</button><button class="small outline" @click="graphMode=graphMode==='path'?'relations':'path'">{{graphMode==='path'?'Explore relations':'Show learning route'}}</button><button class="small outline" :aria-pressed="showOptional" @click="showOptional=!showOptional">{{showOptional?'Hide optional links':'Show optional links'}}</button><button class="small outline" @click="resetGraphView">Reset view</button></div></div>
      <div v-if="graphMode==='path'&&routeNotice" class="route-status" :class="{'missing-route':routeNotice.empty}" role="status"><strong>{{routeNotice.title}}</strong><p>{{routeNotice.text}}</p><button v-if="routeNotice.empty" class="small outline" @click="exploreGoalRelations">Explore linked capabilities</button></div>
      <div ref="graphCanvas" class="graph-canvas" :class="{'wide-route':graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status),'route-unavailable':graphMode==='path'&&routeNotice?.empty}" @wheel="onWheel" @pointerdown="startPan" @pointermove="movePan" @pointerup="endPan" @pointercancel="endPan" @pointerleave="endPan">
        <svg v-if="!(graphMode==='path'&&routeNotice?.empty)" :viewBox="graphMode==='path'?(learningPath.viewBox||'-450 -400 900 800'):'-450 -400 900 800'" :style="graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status)?{width:learningPath.svgWidth+'px',maxWidth:'none'}:null" role="img" :aria-label="graphMode==='path'?learningPath.caption:graphTitle"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#647b92"/></marker></defs><g :transform="`translate(${pan.x} ${pan.y}) scale(${zoom})`">
          <g v-for="(e,i) in displayGraph.edges" :key="i"><line :x1="edgeGeometry(e).x1" :y1="edgeGeometry(e).y1" :x2="edgeGeometry(e).x2" :y2="edgeGeometry(e).y2" :stroke="edgeStroke(e)" :stroke-dasharray="edgeDash(e)" stroke-opacity=".84" stroke-width="1.7" marker-end="url(#arrow)"/><title>{{e.escoType||e.type}} · {{e.validation||'unreviewed'}}</title></g>
          <g v-for="n in displayGraph.vertices" :key="n.id" data-node :tabindex="n.kind==='route_marker'?-1:0" :role="n.kind==='route_marker'?'img':'button'" :aria-label="n.kind==='route_marker'?n.label:'Focus '+n.label" @click.stop="inspectConcept(n.id)" @keydown.enter.prevent="inspectConcept(n.id)" @keydown.space.prevent="inspectConcept(n.id)" @mouseenter="hovered=n.id" @mouseleave="hovered=''" :transform="`translate(${n.x} ${n.y})`" class="graph-node">
            <circle :r="graphNodeRadius(n.id)" :fill="n.kind==='route_marker'?'#143b38':isGraphPrimary(n.id)?'#1b3b48':'#14283c'" :stroke="colorOf(n)" :stroke-width="isGraphPrimary(n.id)?3:2"/><circle v-if="n.kind!=='route_marker'" :r="progressRing(n.id).radius" fill="none" stroke="#354b5e" stroke-width="3"/><circle v-if="n.kind!=='route_marker'" :r="progressRing(n.id).radius" fill="none" stroke="#58c9a5" stroke-width="3" stroke-linecap="round" :stroke-dasharray="progressRing(n.id).circumference" :stroke-dashoffset="progressRing(n.id).offset" transform="rotate(-90)"/><text text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#eaf6ff">{{n.id==='atlas:path:start'?'●':n.id==='atlas:path:more'?'…':n.kind==='role'?'◈':isDone(n.id)?'✓':'◆'}}</text><text text-anchor="middle" :y="graphNodeRadius(n.id)+19" font-size="12" :font-weight="isGraphPrimary(n.id)?700:500" fill="#e8f2ff">{{labelCut(n.label,27)}}</text><title>{{n.label}} · {{progressByNode[n.id]?.percent||0}}% progress ({{n.id}})</title>
          </g>
        </g></svg>
        <div v-if="!(graphMode==='path'&&routeNotice?.empty)" class="graph-hint">{{graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status)?'Starting points are on the left · scroll horizontally to follow connected branches · use Levels to show 1, 2, or the full map':graphMode==='path'?'Left to right: completed learning or possible starts → steps → goal. Hide completed nodes to focus on what remains; use Steps to expand the route.':'Scroll to zoom · drag background to pan · arrows show relation direction · use graph controls to hide completed or optional nodes'}}</div>
        <div v-if="graphMode==='path'&&routeNotice?.empty" class="graph-placeholder">No learning route is drawn while these connections are missing.</div>
      </div><details class="legend-help"><summary>Graph legend</summary><div class="legend"><span><i class="dot green"></i> Completed capability</span><span><i class="dot blue"></i> Skill capability</span><span><i class="dot violet"></i> Proposed learning unit</span><span><i class="dot gold"></i> Role / qualification</span><span><i class="dot cyan"></i> Official curriculum / qualification outcome</span><span><i class="progress-swatch"></i>Step completion</span><span><i class="line-swatch"></i>ESCO Essential / Atlas core</span><span><i class="line-swatch optional"></i>ESCO Optional / Atlas context-dependent</span><span><i class="line-swatch proposed"></i>Proposed partial Atlas alignment</span><span v-if="graphMode==='path'"><i class="line-swatch start"></i>Start / collapsed steps</span></div></details></div></section>
        </section>

        <section v-if="workbenchTab==='catalogue'" id="workbench-panel-catalogue" role="tabpanel" aria-labelledby="workbench-tab-catalogue" class="catalogue-workspace">
          <header class="workspace-heading"><span class="section-kicker">SOURCE INVENTORY</span><h2>Catalogue & learning coverage</h2><p>Official catalogue coverage and the development of learning activities are shown separately.</p></header>
          <section class="catalogue-overview" aria-label="Catalogue and learning pathway coverage"><article><div class="eyebrow">SOURCE CATALOGUE</div><h3>{{catalogueOverview.verified?'Complete for ESCO v'+catalogueOverview.version:'Catalogue inventory'}}</h3><p><strong>{{formatCount(catalogueOverview.occupations)}}</strong> active occupations · <strong>{{formatCount(catalogueOverview.skills)}}</strong> active skills and knowledge concepts</p><p class="helper-copy">{{catalogueOverview.verified?'Verified against the imported source inventory.':'Source completeness has not been verified.'}} {{catalogueOverview.atlasRoles}} Atlas life and profession roles are separate.</p></article><article><div class="eyebrow">LEARNING PATHWAYS</div><h3>Activity breakdowns are still developing</h3><p>{{formatCount(catalogueOverview.breakdownCounts.none)}} occupations have no activities; {{formatCount(catalogueOverview.breakdownCounts.partial)}} have partial breakdowns; {{formatCount(catalogueOverview.breakdownCounts.draft)}} have activities for every required skill.</p><p class="helper-copy">{{formatCount(catalogueOverview.reviewedPathways)}} occupation pathways have a current documented review. Activity coverage does not establish a complete developmental route.</p></article></section>
          <article class="inspection-card occupation-browser"><div class="panel-heading"><h3>Browse occupations and Atlas roles</h3><span>{{formatCount(browseResults.total)}} results</span></div><div class="catalogue-filters"><label for="occupation-group">Category<select id="occupation-group" v-model="browseGroup"><option value="esco">All ESCO occupations</option><option value="all">All occupations and Atlas roles</option><option v-for="group in catalogueModel.groups" :key="group.code" :value="group.code">{{/^\d$/.test(group.code)?'ISCO '+group.code+' · ':''}}{{group.label}} ({{group.count}})</option></select></label><label for="occupation-query">Name or code<input id="occupation-query" v-model="browseQuery" type="search" placeholder="Name, Dutch label, occupation code"/></label><label for="occupation-coverage">Activity coverage<select id="occupation-coverage" v-model="browseCoverage"><option value="all">Any coverage</option><option value="none">No activity breakdown</option><option value="partial">Partial draft breakdown</option><option value="draft">Every required skill has activities</option><option value="reviewed">Documented pathway review</option></select></label></div><p role="status" class="helper-copy">Showing {{browseResults.start}}–{{browseResults.end}} of {{formatCount(browseResults.total)}}</p><ul v-if="browseResults.total" class="catalogue-results"><li v-for="node in browseResults.items" :key="node.id"><button @click="inspectConcept(node.id)"><span><strong>{{node.label}}</strong><small>{{conceptType(node)}}<template v-if="node.notation"> · ISCO {{node.notation}}</template></small></span><span class="coverage-status">{{pathwayCoverage(node.id).status}}</span><span aria-hidden="true">→</span></button></li></ul><div v-else class="empty"><p>No concepts match these filters.</p><p v-if="browseCoverage==='reviewed'">A reviewed pathway requires a current documented review.</p><button class="outline" @click="clearBrowseFilters">Clear filters</button></div><nav class="results-pagination" aria-label="Occupation result pages"><button class="outline" :disabled="browseResults.page<=1" @click="browsePage=browseResults.page-1">Previous</button><span>Page {{browseResults.page}} of {{browseResults.pages}}</span><button class="outline" :disabled="browseResults.page>=browseResults.pages" @click="browsePage=browseResults.page+1">Next</button></nav></article>
        </section>
        <section v-for="tab in workbenchTabs.filter(tab=>tab.id!==workbenchTab)" :id="'workbench-panel-'+tab.id" :key="tab.id" role="tabpanel" :aria-labelledby="'workbench-tab-'+tab.id" hidden></section>
      </main>
    </div>
  </div>
</template>
