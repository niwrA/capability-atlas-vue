<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import dataset from './data.json'

const nodes = [...dataset.roles.map(r => ({...r, kind:'role'})), ...dataset.capabilities.map(c => ({...c, kind:'skill'})), ...(dataset.learning_units||[]), ...(dataset.framework_outcomes||[]), ...(dataset.qualifications||[])]
const byId = Object.fromEntries(nodes.map(n => [n.id,n]))
const outcomeLinks=dataset.outcome_capability_links||[]
const qualificationRequirements=dataset.qualification_requirements||[]
const relations = [...dataset.role_capability_assertions, ...dataset.decompositions, ...outcomeLinks, ...qualificationRequirements]
const roleRelationType=e=>e.relationType||e.escoType||e.type
const isRoleRequired=e=>['esco_essential','atlas_required'].includes(roleRelationType(e))
const isRoleOptional=e=>['esco_optional','atlas_optional'].includes(roleRelationType(e))
const isOptionalLink=e=>isRoleOptional(e)||e.completion_requirement==='optional'||e.completionRequirement==='optional'
const roleDescriptor=n=>n?.role_family==='life'?'Atlas life role':n?.role_family==='profession'?'Atlas profession pilot':'ESCO occupation'
const roleProgressLabel=n=>n?.source==='ESCO'?'Essential skill step progress':n?.role_family==='profession'?'Core profession step progress':'Atlas core-step progress'
const adj = Object.fromEntries(nodes.map(n=>[n.id, []]))
for (const e of relations) { if(adj[e.from]&&adj[e.to]) { adj[e.from].push({id:e.to,edge:e,dir:'out'});adj[e.to].push({id:e.from,edge:e,dir:'in'}) } }
const stored = (key, fallback) => { try {const x=localStorage.getItem('atlas-learner:'+key);return x?JSON.parse(x):fallback} catch {return fallback} }
const storedText = (key, fallback) => { try {const x=localStorage.getItem('atlas-learner:'+key);if(!x)return fallback;try{return JSON.parse(x)}catch{return x}} catch {return fallback} }
const earliestDevelopmentStartIds=['atlas:alu:development:communication:respond-to-early-signals','atlas:alu:development:numeracy:notice-small-quantities']
const earliestDevelopmentStartId=earliestDevelopmentStartIds[0]
const completed=ref(stored('completed',[])), assessmentCoverage=ref(stored('assessmentCoverage',{})), favorites=ref(stored('favorites',[])), center=ref(stored('center',earliestDevelopmentStartId))
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
const isDone = id=>completed.value.includes(id)
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
const isRequiredDecomposition=e=>e.completion_requirement!=='optional'&&e.type!=='contains_candidate'
const collectSteps=roots=>{
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
 return {required:[...required].map(([id,ancestors])=>({id,ancestors:[...ancestors]})),optional:[...optional.keys()]}
}
const progressForRoots=roots=>{
 const {required,optional}=collectSteps(roots)
 const done=required.filter(step=>isDone(step.id)||step.ancestors.some(parent=>(assessmentCoverage.value[parent]||[]).includes(step.id))).length
 const stale=new Set(required.flatMap(step=>step.ancestors.filter(parent=>isDone(parent)&&!isDone(step.id)&&!(assessmentCoverage.value[parent]||[]).includes(step.id)))).size
 const total=required.length
 return {done,total,optional:optional.length,stale,percent:total?Math.round(done*100/total):0}
}
const progressForNode=id=>{
 const node=byId[id]
 if(!node)return {done:0,total:0,optional:0,stale:0,percent:0}
 if(node.kind==='role'){
  const essentials=dataset.role_capability_assertions.filter(e=>e.from===id&&isRoleRequired(e)).map(e=>e.to)
  return progressForRoots(essentials)
 }
 if(['framework_outcome','qualification'].includes(node.kind))return progressForRoots(mappedLearningUnitsForNode(id))
 return progressForRoots([id])
}
const progressByNode=computed(()=>Object.fromEntries(nodes.filter(n=>['role','skill','learning_unit','framework_outcome','qualification'].includes(n.kind)).map(n=>[n.id,progressForNode(n.id)])))
const focusedProgress=computed(()=>progressByNode.value[center.value]||{done:0,total:0,optional:0,stale:0,percent:0})
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
const focus=id=>{if(!byId[id])return;center.value=id;zoom.value=1;pan.value={x:0,y:0};search.value=''}
const results=computed(()=>search.value.trim()?nodes.filter(n=>(n.label+' '+n.id+' '+(n.sector||'')).toLowerCase().includes(search.value.trim().toLowerCase())).slice(0,20):[])
const neighbors=id=>(adj[id]||[]).map(a=>byId[a.id]).filter(Boolean)
const relationships=(id)=>adj[id]||[]
const focusNode=computed(()=>byId[center.value]||nodes[0])
const getGoalSkills=goalId=>{
 if(!byId[goalId]) return []
 const goalKind=byId[goalId].kind
 const roots=goalKind==='role'?dataset.role_capability_assertions.filter(e=>e.from===goalId&&isRoleRequired(e)).map(e=>e.to):['framework_outcome','qualification'].includes(goalKind)?mappedLearningUnitsForNode(goalId):[goalId]
 const set=new Set(),q=[...roots]
 while(q.length){const id=q.shift();if(set.has(id))continue;set.add(id);for(const child of decompositionChildren[id]||[])q.push(child)}
 return [...set]
}
const goalStats=computed(()=>favorites.value.filter(id=>byId[id]).map(id=>{const skills=getGoalSkills(id),progress=progressForNode(id);return {id,node:byId[id],skills,progress,coverage:requirementCoverageForNode(id)}}))
const isAssessedComplete=id=>{
 if(isDone(id))return true
 const steps=collectSteps([id]).required
 return steps.length>0&&Object.entries(assessmentCoverage.value).some(([parent,covered])=>isDone(parent)&&steps.every(step=>covered.includes(step.id)||isDone(step.id)))
}
const suggested=computed(()=>{
 const available=new Map(),goalSets=goalStats.value.map(g=>new Set(g.skills)),goalRouteConnected=learningPath.value.status==='ready'
 const scopedGoalSets=goalRouteConnected?goalSets:[]
 const add=(id,reason,allowOutsideGoal=false)=>{
  if(!byId[id]||!isLearnerNode(id)||isAssessedComplete(id))return
  if(!allowOutsideGoal&&scopedGoalSets.length&&!scopedGoalSets.some(set=>set.has(id)))return
  const reasons=available.get(id)||new Set();reasons.add(reason);available.set(id,reasons)
 }
 const relatedCompleted=completed.value.filter(id=>!goalRouteConnected||goalSets.some(set=>set.has(id)))
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
 while(queue.length){const from=queue.shift();for(const edge of zeroOutgoing[from]||[])if(byId[edge.to]&&levels[edge.to]===undefined){levels[edge.to]=levels[from]+1;queue.push(edge.to)}}
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
const learningPath=computed(()=>{
 const selected=goalStats.value.find(g=>g.id===pathGoal.value)||goalStats.value[0]
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
 if(!selected)return zeroLearningGraph(flowEdges,outgoing)
 const targetId=selected.id,target=byId[targetId]
 const ancestors=new Set([targetId]),back=[targetId]
 while(back.length){const id=back.pop();for(const e of incoming[id]||[])if(!ancestors.has(e.from)){ancestors.add(e.from);back.push(e.from)}}
 const unitIds=[...ancestors].filter(id=>byId[id]?.kind==='learning_unit')
 const relatedCompletions=completed.value.filter(id=>ancestors.has(id)&&id!==targetId)
 if(!unitIds.length&&!relatedCompletions.length)return zeroLearningGraph(flowEdges,outgoing,targetId)
 if(!unitIds.length)return {status:'no_decomposition',targetId,vertices:[],edges:[],coords:{},caption:`No decomposed learning route to ${target.label} is available yet.`}
 const candidates=new Set(),needs=[...unitIds]
 while(needs.length){const id=needs.pop();if(candidates.has(id))continue;candidates.add(id);for(const e of incoming[id]||[])if(ancestors.has(e.from)&&['prerequisite_for','specializes'].includes(e.type))needs.push(e.from)}
 const relevantCompleted=relatedCompletions
 const roots=[...candidates].filter(id=>!(incoming[id]||[]).some(e=>candidates.has(e.from)))
 const nextUncompleted=(startId)=>{
  const found=[],seen=new Set(),queue=(outgoing[startId]||[]).filter(e=>ancestors.has(e.to)).map(e=>e.to)
  while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);if(id===targetId||!isDone(id)){found.push(id);continue};for(const e of outgoing[id]||[])if(ancestors.has(e.to))queue.push(e.to)}
  return found
 }
 const earliestRoots=earliestDevelopmentStartIds.filter(id=>candidates.has(id))
 if(!relevantCompleted.length&&!earliestRoots.length)return zeroLearningGraph(flowEdges,outgoing,targetId)
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
 const ids=vertices.map(n=>n.id),indegree=Object.fromEntries(ids.map(id=>[id,0])),rank=Object.fromEntries(ids.map(id=>[id,0]))
 for(const e of edges)indegree[e.to]=(indegree[e.to]||0)+1
 const queue=ids.filter(id=>indegree[id]===0),ordered=[]
 while(queue.length){const id=queue.shift();ordered.push(id);for(const e of edges.filter(x=>x.from===id)){rank[e.to]=Math.max(rank[e.to]||0,(rank[id]||0)+1);indegree[e.to]--;if(indegree[e.to]===0)queue.push(e.to)}}
 const learningSteps=Object.fromEntries(ids.map(id=>[id,Infinity]));learningSteps[markerId]=0
 for(const id of ordered)for(const e of edges.filter(x=>x.from===id)){
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
 return {status:'ready',targetId,vertices:shownVertices.map(n=>({...n,...coords[n.id]})),edges:shownEdges,coords,caption,hasCompletedStart:!!relevantCompleted.length}
})
const displayGraph=computed(()=>graphMode.value==='path'?learningPath.value:localGraph.value)
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
<div class="app-shell">
  <header class="topbar"><div><div class="eyebrow">CAPABILITY ATLAS · LEARNER PROTOTYPE · v{{appVersion}}</div><h1>My learning journey</h1></div><span class="draft">ESCO occupations · Atlas profession and life-role pilots · curriculum and qualification bridge</span></header>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="section-heading"><h2>My progress</h2><button class="small outline" @click="resetDemo" title="Clear completions, assessment snapshots, and saved goals">Reset learning</button></div>
      <div class="summary"><div><strong>{{completed.length}}</strong><span>capabilities marked complete</span></div><div><strong>{{favorites.length}}</strong><span>saved goals</span></div></div>
      <h2>My goals</h2><p class="muted mini">Star an occupation, life role, skill, learning activity, curriculum outcome, or qualification to track a mapped route.</p>
      <div v-if="!goalStats.length" class="empty">No goals yet. Search for a role or skill and select ☆ Save goal.</div>
      <div v-for="g in goalStats" :key="g.id" class="goal-card" :class="{'active-goal':center===g.id}">
        <div class="goal-row"><button class="linklike" @click="focus(g.id)">{{g.node.label}}</button><button class="star" title="Remove goal" @click="toggleFav(g.id)">★</button></div>
        <div class="progress" role="progressbar" :aria-valuenow="g.progress.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="g.node.kind==='role'?roleProgressLabel(g.node):'Goal step progress'"><div :style="{width:g.progress.percent+'%'}"></div></div>
        <small><strong>{{g.progress.percent}}%</strong> · {{g.progress.done}} / {{g.progress.total}} required modelled steps complete</small>
        <small v-if="g.progress.optional">{{g.progress.optional}} optional modelled steps excluded from required progress.</small>
        <small v-if="g.progress.stale">{{g.progress.stale}} saved parent completion(s) need review against the expanded steps.</small>
        <small v-if="['framework_outcome','qualification'].includes(g.node.kind)">{{g.coverage.mapped}} / {{g.coverage.total}} official requirements have Atlas learning links.</small>
        <small v-if="['framework_outcome','qualification'].includes(g.node.kind)">Mapped Atlas activity progress only; this is not curriculum attainment or qualification readiness.</small>
        <small v-else-if="g.node.kind==='role'&&g.node.source==='ESCO'">ESCO Essential skills only; Optional role skills are excluded. Indicative progress from proposed decompositions.</small>
        <small v-else-if="g.node.kind==='role'">Atlas draft core skills only; context-dependent skills are excluded. This is a flexible reflection scaffold, not a validated score.</small>
        <small v-else-if="g.node.kind!=='framework_outcome'&&g.node.kind!=='qualification'">Progress through required decomposition steps; an undecomposed capability counts as one step.</small>
      </div>
      <h2>Find a goal or skill</h2>
      <input v-model="search" placeholder="Search roles, skills, outcomes, and qualifications…" aria-label="Search roles, skills, outcomes, and qualifications"/>
      <div class="search-results" v-if="search"><button v-for="n in results" :key="n.id" @click="focus(n.id)"><span>{{n.label}}<small>{{n.kind}} · {{n.id}}</small></span><span>↗</span></button><p v-if="!results.length" class="muted mini">No matches found</p></div>
      <div class="side-footer">Changes are saved in this browser only. No account, server, or personal data transmission.</div>
    </aside>
    <main class="main">
      <div class="welcome"><div><span class="eyebrow">YOUR NEXT STEPS</span><h2>Choose what to learn next</h2><p class="muted">Only directly available learning nodes are shown from your zero start or the next links after related completed learning. Atlas learning units and prerequisites are proposals; completion is self-reported and not independently assessed.</p></div><div class="toggle"><button :class="{chosen:selectedTab==='next'}" @click="selectedTab='next'">Learn next</button><button :class="{chosen:selectedTab==='graph'}" @click="selectedTab='graph'">Graph</button></div></div>
      <div v-if="selectedTab==='next'" class="suggestions"><div v-if="!suggested.length" class="empty">No directly available next node is mapped from your current learning evidence.</div><div v-for="s in suggested" :key="s.id" class="suggestion"><div class="suggestion-icon">◇</div><div class="suggestion-body"><button class="linklike strong" @click="focus(s.id);selectedTab='graph'">{{byId[s.id].label}}</button><div class="muted mini">{{[...s.reasons].slice(0,2).join(' · ')}}</div></div><button class="small" @click="toggleDone(s.id)">{{completionActionLabel(s.id)}}</button><button class="star" :class="{'fav':isFav(s.id)}" @click="toggleFav(s.id)" :aria-label="isFav(s.id)?'Remove goal':'Save goal'">{{isFav(s.id)?'★':'☆'}}</button></div><button v-if="suggested.length>=10||showAll" class="outline expand" @click="showAll=!showAll">{{showAll?'Show fewer':'Show more available nodes'}}</button></div>
      <div class="graph-section"><div class="graph-heading"><div><h2>{{graphMode==='path'?'Your learning route':'Explore connected capabilities'}}</h2><div class="muted mini">{{graphMode==='path'?learningPath.caption:graphTitle+' · click a node to make it the center'}}</div></div><div class="graph-controls"><label v-if="graphMode==='path'&&(goalStats.length||learningPath.status==='no_goal')">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'Steps':'Levels'}} <select v-model.number="routeDepth"><option :value="1">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'1 step':'1 level'}}</option><option :value="2">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'2 steps':'2 levels'}}</option><option :value="0">{{goalStats.length&&learningPath.status!=='zero_unconnected'?'Full route':'Full map'}}</option></select></label><label v-if="graphMode==='path'&&goalStats.length">Goal <select v-model="pathGoal" @change="focus(pathGoal)"><option v-for="g in goalStats" :key="g.id" :value="g.id">{{g.node.label}}</option></select></label><label v-if="graphMode==='relations'">Depth <select v-model.number="depth"><option :value="1">1 hop</option><option :value="2">2 hops</option></select></label><button class="small outline" :aria-pressed="hideCompleted" @click="hideCompleted=!hideCompleted">{{hideCompleted?'Show completed':'Hide completed'}}</button><button class="small outline" @click="graphMode=graphMode==='path'?'relations':'path'">{{graphMode==='path'?'Explore relations':'Show learning route'}}</button><button class="small outline" :aria-pressed="showOptional" @click="showOptional=!showOptional">{{showOptional?'Hide optional links':'Show optional links'}}</button><button class="small outline" @click="resetGraphView">Reset view</button><button class="small outline" @click="selectedTab=selectedTab==='graph'?'next':'graph'">{{selectedTab==='graph'?'Next skills':'Graph focus'}}</button></div></div>
      <div ref="graphCanvas" class="graph-canvas" :class="{'wide-route':graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status)}" @wheel="onWheel" @pointerdown="startPan" @pointermove="movePan" @pointerup="endPan" @pointercancel="endPan" @pointerleave="endPan">
        <svg :viewBox="graphMode==='path'?(learningPath.viewBox||'-450 -400 900 800'):'-450 -400 900 800'" :style="graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status)?{width:learningPath.svgWidth+'px',maxWidth:'none'}:null" role="img" :aria-label="graphMode==='path'?learningPath.caption:graphTitle"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#647b92"/></marker></defs><g :transform="`translate(${pan.x} ${pan.y}) scale(${zoom})`">
          <g v-for="(e,i) in displayGraph.edges" :key="i"><line :x1="edgeGeometry(e).x1" :y1="edgeGeometry(e).y1" :x2="edgeGeometry(e).x2" :y2="edgeGeometry(e).y2" :stroke="edgeStroke(e)" :stroke-dasharray="edgeDash(e)" stroke-opacity=".84" stroke-width="1.7" marker-end="url(#arrow)"/><title>{{e.escoType||e.type}} · {{e.validation||'unreviewed'}}</title></g>
          <g v-for="n in displayGraph.vertices" :key="n.id" data-node :tabindex="n.kind==='route_marker'?-1:0" :role="n.kind==='route_marker'?'img':'button'" :aria-label="n.kind==='route_marker'?n.label:'Focus '+n.label" @click.stop="focus(n.id)" @keydown.enter.prevent="focus(n.id)" @keydown.space.prevent="focus(n.id)" @mouseenter="hovered=n.id" @mouseleave="hovered=''" :transform="`translate(${n.x} ${n.y})`" class="graph-node">
            <circle :r="graphNodeRadius(n.id)" :fill="n.kind==='route_marker'?'#143b38':isGraphPrimary(n.id)?'#1b3b48':'#14283c'" :stroke="colorOf(n)" :stroke-width="isGraphPrimary(n.id)?3:2"/><circle v-if="n.kind!=='route_marker'" :r="progressRing(n.id).radius" fill="none" stroke="#354b5e" stroke-width="3"/><circle v-if="n.kind!=='route_marker'" :r="progressRing(n.id).radius" fill="none" stroke="#58c9a5" stroke-width="3" stroke-linecap="round" :stroke-dasharray="progressRing(n.id).circumference" :stroke-dashoffset="progressRing(n.id).offset" transform="rotate(-90)"/><text text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#eaf6ff">{{n.id==='atlas:path:start'?'●':n.id==='atlas:path:more'?'…':n.kind==='role'?'◈':isDone(n.id)?'✓':'◆'}}</text><text text-anchor="middle" :y="graphNodeRadius(n.id)+19" font-size="12" :font-weight="isGraphPrimary(n.id)?700:500" fill="#e8f2ff">{{labelCut(n.label,27)}}</text><title>{{n.label}} · {{progressByNode[n.id]?.percent||0}}% progress ({{n.id}})</title>
          </g>
        </g></svg>
        <div class="graph-hint">{{graphMode==='path'&&['no_goal','zero_unconnected'].includes(learningPath.status)?'Starting points are on the left · scroll horizontally to follow connected branches · use Levels to show 1, 2, or the full map':graphMode==='path'?'Left to right: completed learning or possible starts → steps → goal. Hide completed nodes to focus on what remains; use Steps to expand the route.':'Scroll to zoom · drag background to pan · arrows show relation direction · use graph controls to hide completed or optional nodes'}}</div>
        <div v-if="graphMode==='path'&&learningPath.status!=='ready'&&!['no_goal','zero_unconnected'].includes(learningPath.status)" class="route-empty"><strong>{{learningPath.caption}}</strong><span>Routes use represented Atlas learning links. Alignment to official outcomes is partial and does not establish curriculum attainment or qualification readiness.</span></div>
      </div><div class="legend"><span><i class="dot green"></i> Completed capability</span><span><i class="dot blue"></i> Skill capability</span><span><i class="dot violet"></i> Proposed learning unit</span><span><i class="dot gold"></i> Role / qualification</span><span><i class="dot cyan"></i> Official curriculum / qualification outcome</span><span><i class="progress-swatch"></i>Step completion</span><span><i class="line-swatch"></i>ESCO Essential / Atlas core</span><span><i class="line-swatch optional"></i>ESCO Optional / Atlas context-dependent</span><span><i class="line-swatch proposed"></i>Proposed partial Atlas alignment</span><span v-if="graphMode==='path'"><i class="line-swatch start"></i>Start / collapsed steps</span></div></div>
    </main>
    <aside class="detail"><div class="eyebrow">CURRENT FOCUS</div><div class="kind">{{focusNode.kind==='role'?roleDescriptor(focusNode):focusNode.kind==='learning_unit'?'Proposed learning unit':focusNode.kind==='framework_outcome'?'Official framework outcome':focusNode.kind==='qualification'?'Formal qualification':focusNode.source==='ESCO'?'ESCO capability':focusNode.source==='Capability Atlas profession pathway pilot'?'Atlas profession capability':'Atlas life capability'}}</div><h2>{{focusNode.label}}</h2><div class="identifier">{{focusNode.id}}</div><div class="action-row"><button @click="toggleFav(center)" :class="{'selected':isFav(center)}">{{isFav(center)?'★ Saved goal':'☆ Save goal'}}</button><button v-if="isLearnerNode(center)" @click="toggleDone(center)" :class="{'selected':isDone(center)}">{{completionActionLabel(center)}}</button></div>
      <p class="muted">{{focusNode.kind==='role'?(focusNode.note||focusNode.definition||'Explore skills associated with this role.'):focusNode.definition||'ESCO capability; see source record for details.'}}</p><div v-if="focusNode.source==='ESCO'&&focusNode.source_url" class="source-links"><strong>Official ESCO v{{focusNode.source_version||'1.2.1'}} record<span v-if="focusNode.notation"> · ISCO {{focusNode.notation}}</span></strong><a :href="focusNode.source_url" target="_blank" rel="noreferrer">Open source record ↗</a><span v-if="focusNode.import_batch">This record is included in the broad, stratified ESCO prototype sample.</span></div><div v-if="focusNode.kind==='role'&&focusNode.supporting_sources?.length" class="source-links"><strong>Topic-selection sources</strong><a v-for="source in focusNode.supporting_sources" :key="source.url" :href="source.url" target="_blank" rel="noreferrer">{{source.title}} ↗</a><span>References inform this draft and do not validate its capability links.</span></div><div v-if="['role','skill','learning_unit','framework_outcome','qualification'].includes(focusNode.kind)" class="focus-progress"><div class="focus-progress-heading"><strong>{{focusedProgress.percent}}%</strong><span>{{['framework_outcome','qualification'].includes(focusNode.kind)?'Mapped Atlas activity progress':focusNode.kind==='role'?roleProgressLabel(focusNode):focusNode.kind==='learning_unit'?'Learning-step status':(decompositionChildren[center]?.length?'Required-step progress':'Capability status')}}</span></div><div class="progress" role="progressbar" :aria-valuenow="focusedProgress.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="'Progress '+focusedProgress.percent+' percent'"><div :style="{width:focusedProgress.percent+'%'}"></div></div><small>{{focusedProgress.done}} / {{focusedProgress.total}} {{['framework_outcome','qualification'].includes(focusNode.kind)?'mapped activity steps':'required steps'}} assessed complete.</small><small v-if="['framework_outcome','qualification'].includes(focusNode.kind)">{{requirementCoverageForNode(center).mapped}} / {{requirementCoverageForNode(center).total}} official requirements have Atlas learning links.</small><small v-if="['framework_outcome','qualification'].includes(focusNode.kind)">Partial learning map only. This does not establish curriculum attainment, exam readiness, or qualification award.</small><small v-if="focusedProgress.optional">{{focusedProgress.optional}} optional steps excluded from this percentage.</small><small v-if="focusedProgress.stale">{{focusedProgress.stale}} saved parent completion(s) need review against the expanded steps.</small><small v-if="hasRequiredSubsteps(center)">Use “Assess required steps complete” only when you can attest to all required substeps; optional substeps do not affect the percentage.</small><small v-if="assessmentNeedsReview(center)">This saved assessment does not cover every required step in the current version. Reopen it, then assess the updated steps.</small><small v-if="focusNode.kind==='role'&&focusNode.source==='ESCO'">ESCO Essential skills only; Optional role skills excluded. Indicative progress from proposed decompositions, not a qualification score.</small><small v-else-if="focusNode.kind==='role'">Atlas core capabilities only; context-dependent capabilities are excluded. A reflective draft, not a validated assessment.</small><small v-else-if="!decompositionChildren[center]?.length&&!['framework_outcome','qualification'].includes(focusNode.kind)">No decomposition is available here; this node counts as one step.</small></div><div v-if="['framework_outcome','qualification'].includes(focusNode.kind)" class="proposal-note"><strong>{{focusNode.official?'Official source record':'Draft record'}}</strong><span v-if="focusNode.framework">Framework: {{focusNode.framework}} · {{focusNode.framework_code}}</span><span v-if="focusNode.qualification_type">MBO level {{focusNode.mbo_level}} · EQF {{focusNode.eqf_level}} · effective {{focusNode.valid_from}}</span><span v-if="focusNode.official_status">Status: {{focusNode.official_status}}</span><div class="source-links" v-if="focusNode.supporting_sources?.length"><strong>Official source</strong><a v-for="source in focusNode.supporting_sources" :key="source.url" :href="source.url" target="_blank" rel="noreferrer">{{source.title}} ↗</a><span>Atlas learning links are partial illustrations and have not been validated against formal assessment rubrics.</span></div></div><div v-if="focusNode.kind==='learning_unit'" class="proposal-note"><strong>Atlas proposal · not validated</strong><span>Estimated active learning: {{focusNode.estimated_active_learning_hours?.min}}–{{focusNode.estimated_active_learning_hours?.max}} hours (illustrative)</span><span v-if="focusNode.assessment">Assessment: {{focusNode.assessment.method}}</span><span v-if="focusNode.reusability"><strong>Reuse:</strong> {{focusNode.reusability.classification}} — {{focusNode.reusability.hypothesis}}</span><ul v-if="focusNode.assessment?.criteria?.length"><li v-for="criterion in focusNode.assessment.criteria" :key="criterion">{{criterion}}</li></ul><div v-if="focusNode.supporting_sources?.length" class="source-links"><strong>Source basis</strong><a v-for="source in focusNode.supporting_sources" :key="source.url" :href="source.url" target="_blank" rel="noreferrer">{{source.title}} ↗</a><span>{{focusNode.evidence_basis}}</span></div></div>
      <h3>Connected nodes ({{currentLinks.length}})</h3><div class="connections"><section v-for="group in connectionGroups" :key="group.key" class="connection-group"><h4>{{group.label}}</h4><p v-if="group.note" class="muted mini">{{group.note}}</p><button v-for="e in group.items" :key="e.id+e.edge.type" @click="focus(e.id)"><span><strong>{{e.node.label}}</strong><small>{{(e.edge.type==='decomposes_into'?'decomposes into':e.edge.type==='prerequisite_for'?'next after':e.edge.type==='specializes'?'specializes':e.edge.type).replaceAll('_',' ')}} · {{e.edge.validation||'unreviewed'}}</small></span><span :class="{done:isDone(e.id)}">{{isDone(e.id)?'✓':'›'}}</span></button></section></div>
      <p v-if="['framework_outcome','qualification'].includes(focusNode.kind)" class="notice">Official requirements keep their source records. Atlas activities are partial navigation links; they do not establish attainment or award a qualification.</p><p v-else-if="focusNode.kind==='role'&&focusNode.source==='ESCO'" class="notice">ESCO occupation–skill mappings retain their source IDs. Atlas learning-unit and prerequisite links are proposed and unvalidated. Manual completion is not certification.</p><p v-else-if="focusNode.kind==='role'" class="notice">Atlas life-role and profession profiles are draft proposals, separate from ESCO occupations. Learning activities need subject-matter review; manual completion is not certification.</p><p v-else class="notice">Atlas role-to-skill links are draft proposals, separate from ESCO capabilities. Learning activities need subject-matter review; manual completion is not certification.</p>
    </aside>
  </div>
</div>
</template>
