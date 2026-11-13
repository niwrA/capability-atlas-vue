import { assessLearningDesign } from './learning-design.js'

export const auditFlags = [
  { bit: 1, id: 'missing_breakdown', label: 'Missing required skill breakdown' },
  { bit: 2, id: 'unexplained_start', label: 'Input stops before a documented start' },
  { bit: 4, id: 'cycle', label: 'Required-input cycle' },
  { bit: 8, id: 'missing_reference', label: 'Missing input record' },
  { bit: 16, id: 'missing_design', label: 'Authoring criteria not specified' },
  { bit: 32, id: 'incomplete_design', label: 'Authoring criteria incomplete' },
  { bit: 64, id: 'needs_split', label: 'Multiple new concepts need splitting' },
  { bit: 128, id: 'practice_scope_only', label: 'Criteria cover a practice sequence only' },
  { bit: 256, id: 'unexplained_dependency', label: 'Prerequisite rationale not specified' },
  { bit: 512, id: 'uncovered_required_component', label: 'Required canonical activity omitted by a route' },
]
const structuralMask = 1 | 2 | 4 | 8 | 512
const required = edge => edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional'

// An inventory of authored proposals, not a judgement of causal validity.
// Dependencies are conjunctive; optional/candidate/recommendation edges cannot
// make a required pathway complete. Different route contexts are never merged.
export function auditAllSkills(dataset) {
  const records = ['roles', 'capabilities', 'learning_units', 'framework_outcomes', 'qualifications'].flatMap(section => dataset[section] || [])
  const nodes = new Map(records.map(node => [node.id, node]))
  const targets = (dataset.capabilities || []).filter(node => node.source !== 'ESCO' || node.source_status === 'released')
  const starts = dataset.starting_foundations?.entries || []
  const startIds = new Set(starts.map(entry => entry.id))
  if (!startIds.size || startIds.size!==starts.length || starts.length>30 || starts.some(entry => !nodes.has(entry.id) || !entry.assumed_ability || !entry.support)) throw new Error('Distinct documented starting foundations are required for the all-skill audit (at most 30 for policy v1)')
  const graph = new Map(), children = new Map(), prior = new Map()
  const add = (map, from, to) => { if (!map.has(from)) map.set(from, new Set()); map.get(from).add(to) }
  for (const edge of dataset.decompositions || []) {
    if (!required(edge)) continue
    if (edge.type === 'decomposes_into') { add(graph, edge.from, edge.to); add(children, edge.from, edge.to) }
    if (edge.type === 'prerequisite_for') { add(graph, edge.to, edge.from); add(prior, edge.to, edge.from) }
  }
  const designs = new Map((dataset.learning_units || []).map(node => [node.id, assessLearningDesign(node)]))
  const links = new Map(), routeVariants = new Map()
  for (const edge of dataset.role_capability_assertions || []) {
    if (!links.has(edge.to)) links.set(edge.to, new Set())
    links.get(edge.to).add(edge.from)
  }
  for (const route of [dataset.pilot_pathway, ...(dataset.pathway_exploration?.routes || []), ...(dataset.profession_pathways?.routes || [])].filter(Boolean)) {
    const steps = new Map(route.steps.map(step => [step.id, step]))
    for (const id of route.steps.filter(step => step.mode === 'gate' && nodes.get(step.id)?.kind === 'skill').map(step => step.id)) {
      if (!routeVariants.has(id)) routeVariants.set(id, [])
      routeVariants.get(id).push({ route, steps })
    }
  }
  function walk(target, variant) {
    const visited = new Set(), active = new Set(), activities = new Set(), reached = new Set(), blocked = new Map()
    const mark = (id, bit) => blocked.set(id, (blocked.get(id) || 0) | bit)
    function visit(id) {
      if (active.has(id)) { mark(id, 4); return }
      if (visited.has(id)) return
      visited.add(id)
      const node = nodes.get(id), step = variant?.steps.get(id)
      if (!node || variant && !step) { mark(id, 8); return }
      if (startIds.has(id)) { reached.add(id); return }
      active.add(id)
      const inputs = variant ? step.requires : [...(graph.get(id) || [])]
      if (node.kind === 'skill' && (variant ? !!step.gap : !children.get(id)?.size)) mark(id, 1)
      if (!inputs.length) mark(id, 2)
      if (node.kind === 'learning_unit') {
        activities.add(id)
        const assessment = designs.get(id)
        if (assessment.status === 'not_specified') mark(id, 16)
        else if (assessment.status === 'incomplete') mark(id, 32)
        else if (assessment.status === 'needs_split') mark(id, 64)
        if (node.learning_design && node.learning_design.scope !== 'activity') mark(id, 128)
        const prerequisiteInputs = variant ? inputs : [...(prior.get(id) || [])]
        for (const input of prerequisiteInputs) {
          if (!node.learning_design?.dependency_basis?.some(item => item.input_id === input && typeof item.reason === 'string' && item.reason.trim())) mark(id, 256)
        }
      }
      for (const input of inputs) visit(input)
      active.delete(id)
    }
    visit(target)
    if(variant){
      const checked=new Set(),checking=new Set()
      function checkParts(id){
        if(checking.has(id)){mark(id,4);return}
        if(checked.has(id))return
        checked.add(id);checking.add(id)
        const node=nodes.get(id)
        if(!node)mark(id,8)
        else if(node.kind==='learning_unit'&&!visited.has(id))mark(id,512)
        else if(node.kind==='skill'&&!children.get(id)?.size)mark(id,1)
        for(const child of children.get(id)||[])checkParts(child)
        checking.delete(id)
      }
      for(const id of visited)if(nodes.get(id)?.kind==='skill'||children.has(id))checkParts(id)
    }
    let flags = 0
    for (const value of blocked.values()) flags |= value
    return { flags, activities, reached, blocked, route_id: variant?.route.id || null,
      connected: reached.size > 0, all_inputs_connected: reached.size > 0 && !(flags & structuralMask), authored_complete: reached.size > 0 && flags === 0 }
  }
  const priorities = new Map(), rows = [], totals = {
    targets: targets.length, esco_targets: targets.filter(node => node.source === 'ESCO').length,
    atlas_targets: targets.filter(node => node.source !== 'ESCO').length, unlinked_targets: targets.filter(node => !links.get(node.id)?.size).length,
    connected: 0, all_inputs_connected: 0, authored_complete: 0, missing_breakdown: 0,
    authored_activity_closures: (dataset.learning_units || []).filter(node => node.learning_design?.scope === 'activity' && designs.get(node.id)?.status === 'draft_ready' && walk(node.id).authored_complete).length,
    whole_activity_designs: (dataset.learning_units || []).filter(node => node.learning_design?.scope === 'activity' && designs.get(node.id)?.status === 'draft_ready').length,
  }
  for (const target of targets) {
    const variants = [walk(target.id), ...(routeVariants.get(target.id) || []).map(variant => walk(target.id, variant))]
    // Prefer a whole required-branch route, then fewer blocked records. A route
    // is a candidate basis for this target, not a union of every context.
    variants.sort((a,b) => Number(b.authored_complete)-Number(a.authored_complete) || Number(b.all_inputs_connected)-Number(a.all_inputs_connected) || Number(b.connected)-Number(a.connected) || a.blocked.size-b.blocked.size || Number(!!b.route_id)-Number(!!a.route_id))
    const best = variants[0], blockers = []
    for (const flag of auditFlags) {
      const ids = [...best.blocked].filter(([,bits]) => bits & flag.bit).map(([id]) => id)
      if (ids.length) blockers.push({ flag: flag.id, count: ids.length, examples: ids.slice(0,3) })
    }
    for (const id of best.activities) {
      if (!priorities.has(id)) priorities.set(id, { id, target_count: 0, flags: 0 })
      const item = priorities.get(id); item.target_count++; item.flags |= best.blocked.get(id) || 0
    }
    for (const key of ['connected','all_inputs_connected','authored_complete']) if (best[key]) totals[key]++
    if (best.flags & 1) totals.missing_breakdown++
    rows.push({ id: target.id, source: target.source === 'ESCO' ? 'ESCO' : 'Atlas', occupation_links: links.get(target.id)?.size || 0,
      flags: best.flags, connected: best.connected, all_inputs_connected: best.all_inputs_connected, authored_complete: best.authored_complete,
      activities: best.activities.size, starting_ids: starts.filter(start=>best.reached.has(start.id)).map(start=>start.id), route_id: best.route_id, variants: variants.length, blockers })
  }
  return { format: 1, policy_version: 1, scope: 'Active ESCO skill/knowledge concepts plus Atlas capabilities; retained obsolete ESCO concepts excluded.',
    interpretation: 'A recorded candidate connection, all required inputs reaching documented starts, and complete activity authoring are separate. Proposed dependencies still need validation. Practice-sequence criteria do not certify an entire broader activity. Shared nodes are counted once per target.',
    flags: auditFlags, starts, summary: totals, baseline: dataset.pathway_audit_baseline || null,
    priorities: [...priorities.values()].filter(item => item.flags).sort((a,b) => b.target_count-a.target_count || a.id.localeCompare(b.id)).slice(0,100), rows }
}

export function searchPathwayAudit(report, byId, { query = '', source = 'all', flag = 'all', sort = 'links', page = 1, pageSize = 15 } = {}) {
  const needle = query.trim().toLowerCase(), bit = auditFlags.find(item => item.id === flag)?.bit
  const matchesFlag=row=>flag==='all'?true:flag==='authored_complete'?row.authored_complete:flag==='unlinked'?row.occupation_links===0:flag==='disconnected'?!row.all_inputs_connected:bit?!!(row.flags&bit):true
  const filtered = report.rows.filter(row => (source === 'all' || row.source === source) && matchesFlag(row) && (!needle || [row.id, byId[row.id]?.label, byId[row.id]?.label_nl].filter(Boolean).join(' ').toLowerCase().includes(needle)))
  filtered.sort((a,b) => (sort === 'links' ? b.occupation_links-a.occupation_links : 0) || (byId[a.id]?.label || a.id).localeCompare(byId[b.id]?.label || b.id) || a.id.localeCompare(b.id))
  const pages = Math.max(1,Math.ceil(filtered.length/pageSize)), current = Math.max(1,Math.min(page,pages))
  return { items: filtered.slice((current-1)*pageSize,current*pageSize), total: filtered.length, page: current, pages }
}

// Reuse the catalogue's node order so the separate audit does not repeat long
// ESCO URIs in every blocker example. Unknown references stay literal strings.
export function encodePathwayAudit(report, nodeIds) {
  const positions=new Map(nodeIds.map((id,index)=>[id,index])),ref=id=>positions.has(id)?positions.get(id):id
  const routeIds=[null,...new Set(report.rows.map(row=>row.route_id).filter(Boolean))]
  return {...report,encoding:'node-index-v1',route_ids:routeIds,
    rows:report.rows.map(row=>[ref(row.id),row.occupation_links,row.flags,row.activities,report.starts.reduce((mask,start,index)=>row.starting_ids.includes(start.id)?mask|(1<<index):mask,0),routeIds.indexOf(row.route_id),row.variants,row.blockers.map(item=>[auditFlags.find(flag=>flag.id===item.flag).bit,item.count,item.examples.map(ref)])]),
    priorities:report.priorities.map(item=>[ref(item.id),item.target_count,item.flags])}
}

export function decodePathwayAudit(encoded,nodes) {
  if(encoded?.format!==1||encoded.encoding!=='node-index-v1'||!Array.isArray(encoded.rows)||!Array.isArray(encoded.priorities)||!Array.isArray(encoded.starts)||!Array.isArray(encoded.route_ids))throw new Error('Unsupported pathway audit format')
  const ref=value=>typeof value==='number'?(nodes[value]?.id||(()=>{throw new Error('Invalid audit node reference')})()):value
  const rows=encoded.rows.map(row=>{
    if(!Array.isArray(row)||row.length!==8||!Array.isArray(row[7]))throw new Error('Invalid audit row')
    const id=ref(row[0]),flags=row[2],starting_ids=encoded.starts.filter((_,i)=>row[4]&(1<<i)).map(start=>start.id)
    return {id,source:typeof row[0]==='number'&&nodes[row[0]].source==='ESCO'?'ESCO':'Atlas',occupation_links:row[1],flags,activities:row[3],starting_ids,
      connected:starting_ids.length>0,all_inputs_connected:starting_ids.length>0&&!(flags&structuralMask),authored_complete:starting_ids.length>0&&flags===0,
      route_id:encoded.route_ids[row[5]],variants:row[6],blockers:row[7].map(([bit,count,examples])=>{const flag=auditFlags.find(flag=>flag.bit===bit);if(!flag||!Array.isArray(examples))throw new Error('Invalid audit blocker');return {flag:flag.id,count,examples:examples.map(ref)}})}
  })
  const {encoding,route_ids,...rest}=encoded
  return {...rest,rows,priorities:encoded.priorities.map(([id,target_count,flags])=>({id:ref(id),target_count,flags}))}
}
