import { assessLearningDesign } from './learning-design.js'
import { evaluatePilot } from './pilot-model.js'

const required = edge => edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional'
const essential = edge => (edge.relationType || edge.escoType || edge.type) === 'esco_essential'
const same = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every(id => b.includes(id))

// The full audit is a build-time diagnostic. Startup needs exact counts and a
// few inspectable examples, rather than hundreds of repeated gap descriptions.
export function compactProfessionCoverage(report) {
  return {...report,rows:report.rows.map(({blockers,...row})=>{
    const counts={},examples=[],shown={}
    for(const blocker of blockers){
      counts[blocker.kind]=(counts[blocker.kind]||0)+1
      if((shown[blocker.kind]||0)<2){examples.push(blocker);shown[blocker.kind]=(shown[blocker.kind]||0)+1}
    }
    return {...row,blocker_count:blockers.length,blocker_counts:counts,blockers:examples}
  })}
}

// Authoring completeness only. This does not assess learner/job readiness.
export function auditProfessions(dataset) {
  const campaign = dataset.profession_pathways
  if (!campaign) return { format: 1, target: 100, complete: 0, authored: 0, rows: [], errors: [] }
  const records = ['roles','capabilities','learning_units'].flatMap(key => dataset[key] || [])
  const nodes = new Map(records.map(node => [node.id, node]))
  const starts = new Set((dataset.starting_foundations?.entries || []).map(entry => entry.id))
  const children = new Map(), prerequisites = new Map(), essentialByRole = new Map()
  for(const edge of dataset.role_capability_assertions || [])if(essential(edge)){
    if(!essentialByRole.has(edge.from))essentialByRole.set(edge.from,[])
    essentialByRole.get(edge.from).push(edge.to)
  }
  for (const edge of dataset.decompositions || []) if (required(edge)) {
    const map = edge.type === 'decomposes_into' ? children : edge.type === 'prerequisite_for' ? prerequisites : null
    if (!map) continue
    const from = edge.type === 'prerequisite_for' ? edge.to : edge.from
    const to = edge.type === 'prerequisite_for' ? edge.from : edge.to
    if (!map.has(from)) map.set(from, new Set())
    map.get(from).add(to)
  }
  const errors = [], targetIds = campaign.targets.map(target => target.id)
  if(!Number.isInteger(campaign.target)||campaign.target<100||targetIds.length<campaign.target)errors.push('The profession goal must retain at least 100 targets')
  for(const entry of dataset.starting_foundations?.entries || [])if(!entry.assumed_ability||!entry.support||!nodes.has(entry.id))errors.push('Invalid documented starting foundation: '+entry.id)
  if (targetIds.length < 100 || new Set(targetIds).size !== targetIds.length) errors.push('At least 100 distinct profession targets are required')
  const routeIds = new Set(), occupations = new Set()
  for (const route of campaign.routes) {
    if (routeIds.has(route.id) || occupations.has(route.occupation_id)) errors.push('Duplicate profession route: ' + route.id)
    if (!targetIds.includes(route.occupation_id)) errors.push('Route outside campaign scope: ' + route.id)
    routeIds.add(route.id); occupations.add(route.occupation_id)
  }
  const rows = campaign.targets.map(target => {
    const role = nodes.get(target.id), route = [...campaign.routes,dataset.pilot_pathway,...(dataset.pathway_exploration?.routes||[])].filter(Boolean).find(item => item.occupation_id === target.id)
    if (!role || role.source !== 'ESCO' || role.source_status !== 'released') errors.push('Invalid released occupation: ' + target.id)
    const essentials = essentialByRole.get(target.id) || []
    const blockers = [], add = (kind, id, detail) => blockers.push({ kind, id, detail })
    if (!route) return { ...target, status: 'unworked', complete: false, essentials: essentials.length, activities: 0, blockers: [{kind:'missing_route',id:target.id,detail:'No complete authored profession route yet.'}] }
    const steps = new Map(route.steps.map(step => [step.id, step]))
    if(!same(route.end_ids || [],[target.id]))add('endpoint',target.id,'The profession itself must be the sole occupational endpoint.')
    if (steps.size !== route.steps.length) add('duplicate_step',target.id,'Route steps must be distinct.')
    const evaluation = evaluatePilot(route, records)
    for (const error of evaluation.errors) add('structure',target.id,error)
    const outcomes = route.occupation_outcomes || []
    if (!essentials.length || !same(steps.get(target.id)?.requires || [], [...essentials,...outcomes])) add('essential_coverage',target.id,'Endpoint must require every official essential skill and every occupational outcome.')
    if (route.source_definition !== role?.definition) add('stale_occupation',target.id,'Occupation description changed.')
    if (route.authoring_basis !== 'individually_authored') add('scaffold_only',target.id,'Generated scaffolds do not establish profession completeness.')
    function facets(facets, source, owner) {
      if (!facets?.length) { add('missing_facets',owner,'Source breadth has not been mapped to activities.'); return }
      for (const facet of facets) {
        if (!facet.source_fragment || !source?.includes(facet.source_fragment) || !facet.activity_ids?.length || facet.activity_ids.some(id => !steps.has(id) || nodes.get(id)?.kind !== 'learning_unit')) add('invalid_facet',owner,'A source facet needs a traceable fragment and actual required learning activities.')
      }
    }
    facets(route.occupation_facets, role?.definition, target.id)
    if (!outcomes.length || outcomes.some(id => nodes.get(id)?.kind !== 'learning_unit')) add('occupation_outcomes',target.id,'Explicit occupational work outcomes are required beyond the ESCO skill list.')
    const reached = new Set(), active = new Set(), usedStarts = new Set()
    function visit(id) {
      if (active.has(id)) { add('cycle',id,'Required-input cycle.'); return }
      if (reached.has(id)) return
      reached.add(id)
      const step = steps.get(id), node = nodes.get(id)
      if (!step || !node) { add('missing_record',id,'Required record or step is missing.'); return }
      if (starts.has(id)) { usedStarts.add(id); if (step.requires.length) add('start_inputs',id,'Declared start cannot conceal additional prerequisites.'); return }
      active.add(id)
      if (!step.requires.length) add('unexplained_start',id,'Required input stops before a documented starting foundation.')
      if (step.gap) add('declared_gap',id,step.gap)
      for (const child of children.get(id) || []) if (!step.requires.includes(child) && !ancestor(id,child)) add('omitted_component',child,'Required canonical component is absent from this branch.')
      for (const input of prerequisites.get(id) || []) if (!step.requires.includes(input)) add('omitted_prerequisite',id,'Canonical prerequisite is missing: ' + input)
      if (node.kind === 'learning_unit') {
        if(step.mode!=='activity')add('activity_mode',id,'An activity cannot be turned into a completion gate.')
        const design = assessLearningDesign(node)
        if (design.status !== 'draft_ready' || node.learning_design?.scope !== 'activity') add('activity_design',id,'Whole activity criteria are missing, incomplete or need splitting.')
        for (const input of step.requires) if (!node.learning_design?.dependency_basis?.some(item => item.input_id === input && item.reason?.trim())) add('dependency_rationale',id,'Explain the input: ' + input)
      }
      for (const input of step.requires) visit(input)
      active.delete(id)
    }
    function ancestor(id, wanted) {
      const seen = new Set(), pending = [...(steps.get(id)?.requires || [])]
      while (pending.length) { const next = pending.pop(); if (next === wanted) return true; if (seen.has(next)) continue; seen.add(next); pending.push(...(steps.get(next)?.requires || [])) }
      return false
    }
    visit(target.id)
    if (!usedStarts.size) add('missing_start',target.id,'No documented starting foundation reached.')
    for (const step of route.steps) if (!reached.has(step.id)) add('unused_step',step.id,'A step is detached from the occupational endpoint.')
    for (const facet of route.occupation_facets || []) for (const id of facet.activity_ids || []) if (!reached.has(id)) add('unused_facet',id,'Mapped work must be required by the endpoint.')
    for (const id of essentials) {
      const skill = nodes.get(id), mapping = route.skill_coverage?.find(item => item.skill_id === id)
      if (!children.get(id)?.size) add('missing_breakdown',id,'Source skill has no required decomposition.')
      if (!mapping || mapping.source_definition !== skill?.definition || JSON.stringify(mapping.source_scope_notes) !== JSON.stringify(skill?.scope_notes || {})) add('stale_skill',id,'The complete source definition and scope must be accounted for.')
      facets(mapping?.facets, [skill?.definition,...(skill?.scope_notes?.en || [])].join('\n'),id)
      for(const facet of mapping?.facets || [])for(const activityId of facet.activity_ids || [])if(!ancestor(id,activityId))add('unused_skill_facet',activityId,'A mapped source facet must be required within its own skill branch.')
      const demo = route.demonstrations?.[id]
      if (!demo || !ancestor(id,demo) || nodes.get(demo)?.kind !== 'learning_unit') add('context',id,'A required occupation-specific demonstration is missing.')
    }
    return { ...target, route_id: route.id, status: blockers.length ? 'incomplete' : 'authored_complete', complete: blockers.length === 0, essentials: essentials.length, activities: [...reached].filter(id => nodes.get(id)?.kind === 'learning_unit' && !starts.has(id)).length, starting_ids: [...usedStarts], blockers }
  })
  return { format: 1, target: campaign.target, complete: rows.filter(row => row.complete).length, authored: campaign.routes.length, rows, errors,
    interpretation: 'Individually authored proposals covering essential ESCO skills and occupational work outcomes. Complete authoring does not establish validated teaching, independent competence, certification or job readiness.' }
}
