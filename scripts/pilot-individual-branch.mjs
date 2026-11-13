// A precise pilot demonstration may also be one of its source's canonical
// components. Serialising that component after the other leaves would make it
// depend on its own later application. Use the actual complete input graph.
export function individualPilotBranch(dataset,target,demonstrationId,stage){
 const nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]||[]).map(node=>[node.id,node]))
 const demonstration=nodes.get(demonstrationId)
 if(demonstration?.authoring_origin!=='individual')return null
 const children=new Map(),prior=new Map()
 for(const edge of dataset.decompositions||[]){
  if(edge.completion_requirement==='optional'||edge.completionRequirement==='optional')continue
  const map=edge.type==='decomposes_into'?children:edge.type==='prerequisite_for'?prior:null
  if(!map)continue
  const from=edge.type==='prerequisite_for'?edge.to:edge.from,to=edge.type==='prerequisite_for'?edge.from:edge.to
  if(!map.has(from))map.set(from,new Set());map.get(from).add(to)
 }
 if(!children.get(target)?.size)return null
 const starts=new Set((dataset.starting_foundations?.entries||[]).map(entry=>entry.id))
 const previous=new Map((dataset.pilot_pathway?.steps||[]).map(step=>[step.id,step]))
 const steps=[],done=new Set(),visiting=new Set()
 function visit(id){
  if(done.has(id))return
  if(visiting.has(id))throw new Error('Individual pilot branch cycle: '+id)
  const node=nodes.get(id)
  if(!node)throw new Error('Missing individual pilot branch input: '+id)
  visiting.add(id)
  const requires=starts.has(id)?[]:[...new Set([...(children.get(id)||[]),...(prior.get(id)||[]),...(id===target?[demonstrationId]:[])])]
  for(const input of requires)visit(input)
  const actualStage=previous.get(id)?.stage||(starts.has(id)?'early':id.includes('foundation')?'shared':stage)
  steps.push({id,stage:actualStage,requires,mode:node.kind==='learning_unit'?'activity':'gate'})
  visiting.delete(id);done.add(id)
 }
 visit(target)
 return {demonstration,steps}
}
