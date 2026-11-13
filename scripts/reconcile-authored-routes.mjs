// Keep the older comparison routes structurally honest when a shared ESCO
// capability receives an individually authored, deeper canonical breakdown.
// Their old contextual assumptions remain explicit; this does not certify them.
export function reconcileAuthoredRoutes(dataset) {
  const nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]||[]).map(node=>[node.id,node]))
  const children=new Map(),prior=new Map(),starts=new Set((dataset.starting_foundations?.entries||[]).map(entry=>entry.id))
  for(const edge of dataset.decompositions||[]){
    if(edge.completion_requirement==='optional'||edge.completionRequirement==='optional')continue
    const map=edge.type==='decomposes_into'?children:edge.type==='prerequisite_for'?prior:null
    if(!map)continue
    const from=edge.type==='prerequisite_for'?edge.to:edge.from,to=edge.type==='prerequisite_for'?edge.from:edge.to
    if(!map.has(from))map.set(from,new Set());map.get(from).add(to)
  }
  for(const route of [dataset.pilot_pathway,...(dataset.pathway_exploration?.routes||[])].filter(Boolean)){
    const steps=new Map(route.steps.map(step=>[step.id,step])),processed=new Set()
    const affected=[...steps.values()].filter(step=>nodes.get(step.id)?.kind==='skill'&&[...(children.get(step.id)||[])].some(id=>nodes.get(id)?.authoring_origin==='individual'))
    if(!affected.length&&!route.steps.some(step=>nodes.get(step.id)?.authoring_origin==='individual'))continue
    function ensure(id,contextExtras){
      if(processed.has(id))return
      processed.add(id)
      const node=nodes.get(id)
      if(!node)throw new Error('Missing authored route input: '+id)
      let step=steps.get(id)
      const inputs=starts.has(id)?[]:[...new Set([...(children.get(id)||[]),...(prior.get(id)||[])])]
      if(!step){step={id,stage:starts.has(id)?'early':id.includes('foundation:')?'shared':'work',mode:node.kind==='learning_unit'?'activity':'gate',requires:inputs};steps.set(id,step)}
      else if(node.authoring_origin==='individual'){
        // Earlier comparison briefs may still need their original shared inputs.
        // Retain these at the contextual exercise, not as invented prerequisites
        // of the newly authored shared concept.
        for(const old of step.requires)if(!inputs.includes(old)&&['early','shared'].includes(steps.get(old)?.stage)&&nodes.get(old)?.authoring_origin!=='individual')contextExtras.add(old)
        step.requires=inputs
      }
      for(const input of step.requires)ensure(input,contextExtras)
    }
    function ensureContext(id,contextExtras=new Set()){
      const context=steps.get(id)
      if(!context)return
      // Authored shared lessons can occur in an older exercise even while its
      // own source capability is still an unreviewed sketch. Reconcile those
      // inputs without clearing that source's gap or counting it as authored.
      ensure(context.id,contextExtras)
      for(const input of contextExtras)ensure(input,contextExtras)
      context.requires=[...new Set([...context.requires,...contextExtras])]
    }
    for(const skill of affected){
      const contextExtras=new Set(),parts=[...(children.get(skill.id)||[])]
      for(const part of parts)ensure(part,contextExtras)
      skill.requires=[...new Set([...skill.requires,...parts])]
      delete skill.gap
      ensureContext(route.demonstrations[skill.id],contextExtras)
    }
    for(const id of Object.values(route.demonstrations||{}))ensureContext(id)
    const used=new Set(),pending=[...route.end_ids]
    while(pending.length){const id=pending.pop();if(used.has(id))continue;used.add(id);pending.push(...(steps.get(id)?.requires||[]))}
    route.steps=[...steps.values()].filter(step=>used.has(step.id))
    route.entry_ids=route.steps.filter(step=>!step.requires.length).map(step=>step.id)
    route.canonical_authoring_revision=1
  }
}
