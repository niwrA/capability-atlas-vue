import { auditPilot } from './pilot-model.js'

export function explorationRoutes(dataset) {
  return [dataset.pilot_pathway, ...(dataset.pathway_exploration?.routes || [])].filter(Boolean)
}

export function createFoundationComparison(dataset) {
  const exploration = dataset.pathway_exploration
  if (!exploration) return { routes: [], foundations: [], sharedRequirements: [], questions: [], findings: [], breakdowns: [], refinement: null, gaps: [] }
  const nodes = new Map(['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section] || []).map(node => [node.id, node]))
  const routes = explorationRoutes(dataset).map(route => {
    const steps = new Map(route.steps.map(step => [step.id, step]))
    const requirements = steps.get(route.occupation_id)?.requires || []
    function ancestors(id) {
      const found = new Set(), pending = [id]
      while (pending.length) for (const input of steps.get(pending.pop())?.requires || []) if (!found.has(input)) { found.add(input); pending.push(input) }
      return found
    }
    return { id: route.id, label: nodes.get(route.occupation_id)?.label, occupation_id: route.occupation_id,
      requirements: requirements.map(id => ({ id, node: nodes.get(id), ancestors: ancestors(id), demonstration: route.demonstrations[id], gap: steps.get(id)?.gap })), steps }
  })
  const foundations = exploration.foundation_ids.map(id => {
    const uses = routes.map(route => {
      const skills = route.requirements.filter(skill => skill.ancestors.has(id))
      return { route_id: route.id, label: route.label, skills }
    }).filter(use => use.skills.length)
    const inputs = [...new Set(routes.flatMap(route => route.steps.get(id)?.requires || []))]
    return { id, node: nodes.get(id), inputs, uses, count: uses.length, branches: uses.reduce((n, use) => n + use.skills.length, 0) }
  }).sort((a, b) => b.count - a.count || b.branches - a.branches || a.node.label.localeCompare(b.node.label))
  const requirements = new Map()
  for (const route of routes) for (const skill of route.requirements) {
    if (!requirements.has(skill.id)) requirements.set(skill.id, { id: skill.id, node: skill.node, uses: [] })
    requirements.get(skill.id).uses.push({ route_id: route.id, label: route.label, demonstration: skill.demonstration })
  }
  const refinement = exploration.refinement ? { ...exploration.refinement,
    groups: exploration.refinement.groups.map(group => ({ ...group, activities: group.activity_ids.map(id => foundations.find(row => row.id === id)) })) } : null
  const breakdowns = (exploration.breakdowns || []).map(breakdown => ({ ...breakdown, node: nodes.get(breakdown.skill_id),
    activities: breakdown.activities.map(activity => ({ ...activity, node: nodes.get(activity.id) })),
    uses: routes.filter(route => route.requirements.some(skill => skill.id === breakdown.skill_id)).map(route => ({ route_id: route.id, label: route.label, demonstration: route.requirements.find(skill => skill.id === breakdown.skill_id).demonstration })) }))
  return { routes, foundations, refinement, breakdowns, sharedRequirements: [...requirements.values()].filter(item => item.uses.length > 1).sort((a, b) => b.uses.length - a.uses.length || a.node.label.localeCompare(b.node.label)),
    questions: exploration.questions, findings: exploration.findings,
    gaps: routes.flatMap(route => route.requirements.filter(skill => skill.gap).map(skill => ({ ...skill, route_id: route.id, label: route.label }))) }
}

export function auditExploration(dataset) {
  if (!dataset.pathway_exploration) return { valid: true, errors: [] }
  const exploration = dataset.pathway_exploration, errors = [], ids = new Set()
  const nodeIds = new Set(['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section] || []).map(node => node.id))
  for (const route of explorationRoutes(dataset)) {
    if (ids.has(route.id)) errors.push(`Duplicate route: ${route.id}`)
    ids.add(route.id)
    const audit = auditPilot(dataset, route)
    errors.push(...audit.errors.map(error => `${route.id}: ${error}`))
  }
  if (new Set(exploration.foundation_ids).size !== exploration.foundation_ids.length) errors.push('Duplicate foundation IDs')
  for (const id of exploration.foundation_ids) if (!nodeIds.has(id)) errors.push(`Unknown foundation: ${id}`)
  for (const question of exploration.questions) for (const id of question.concept_ids) if (!nodeIds.has(id)) errors.push(`Unknown question concept: ${id}`)
  const capabilities = new Map((dataset.capabilities || []).map(node => [node.id, node]))
  for (const breakdown of exploration.breakdowns || []) {
    if (capabilities.get(breakdown.skill_id)?.definition !== breakdown.source_definition) errors.push(`Stale breakdown source definition: ${breakdown.skill_id}`)
    const declared = breakdown.activities.map(activity => activity.id)
    const actual = (dataset.decompositions || []).filter(edge => edge.from === breakdown.skill_id && edge.type === 'decomposes_into' && edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional').map(edge => edge.to)
    if (!declared.length || new Set(declared).size !== declared.length || declared.length !== actual.length || actual.some(id => !declared.includes(id))) errors.push(`Canonical breakdown differs: ${breakdown.skill_id}`)
    const covered = new Set()
    for (const facet of breakdown.facets) {
      if (!facet.label || !facet.activity_ids.length) errors.push(`Empty source facet: ${breakdown.skill_id}`)
      for (const id of facet.activity_ids) { covered.add(id); if (!declared.includes(id)) errors.push(`Unknown facet activity: ${id}`) }
    }
    if (!breakdown.facets.length || declared.some(id => !covered.has(id))) errors.push(`Unmapped source facets: ${breakdown.skill_id}`)
    for (const activity of breakdown.activities) {
      if (!nodeIds.has(activity.id)) errors.push(`Unknown breakdown activity: ${activity.id}`)
      const globalInputs = (dataset.decompositions || []).filter(edge => edge.to === activity.id && edge.type === 'prerequisite_for').map(edge => edge.from)
      if (!activity.requires.length || activity.requires.length !== globalInputs.length || activity.requires.some(id => !globalInputs.includes(id))) errors.push(`Canonical inputs differ: ${activity.id}`)
      for (const route of explorationRoutes(dataset)) {
        const step = route.steps.find(step => step.id === activity.id)
        if (step && (step.requires.length !== activity.requires.length || activity.requires.some(id => !step.requires.includes(id)))) errors.push(`Route breakdown inputs differ: ${route.id}: ${activity.id}`)
      }
    }
  }
  if (exploration.refinement) {
    for (const group of exploration.refinement.groups) for (const id of group.activity_ids) if (!exploration.foundation_ids.includes(id)) errors.push(`Unknown refined foundation: ${id}`)
    for (const change of exploration.refinement.changes) for (const id of [change.target_id, ...change.before, ...change.after]) if (!nodeIds.has(id)) errors.push(`Unknown refinement input: ${id}`)
    // All occurrences of a refined activity must use the declared inputs.
    for (const route of explorationRoutes(dataset)) for (const change of exploration.refinement.changes) {
      const step = route.steps.find(step => step.id === change.target_id)
      if (step && (step.requires.length !== change.after.length || change.after.some(id => !step.requires.includes(id)))) errors.push(`Stale refined inputs: ${route.id}: ${change.target_id}`)
    }
  }
  const comparison = createFoundationComparison(dataset)
  for (const foundation of comparison.foundations) if (!foundation.uses.length) errors.push(`Unused foundation: ${foundation.id}`)
  return { valid: errors.length === 0, errors, comparison }
}
