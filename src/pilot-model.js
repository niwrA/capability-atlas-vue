// Pilot requirements are conjunctive. Recorded completion never bypasses an input.
// This deliberately does not infer readiness from the general relationship graph.
export function evaluatePilot(pilot, nodes, completed = new Set()) {
  if (!pilot) return null
  const byId = new Map(nodes.map(node => [node.id, node]))
  const steps = new Map(), errors = []
  for (const step of pilot.steps) {
    if (steps.has(step.id)) errors.push(`Duplicate step: ${step.id}`)
    steps.set(step.id, step)
    if (!byId.has(step.id)) errors.push(`Unknown concept: ${step.id}`)
    if (!['activity', 'gate'].includes(step.mode)) errors.push(`Unknown step mode: ${step.id}`)
    if (step.mode === 'activity' && byId.get(step.id)?.kind !== 'learning_unit') errors.push(`Activity is not a learning unit: ${step.id}`)
    if (step.mode === 'gate' && !['role', 'skill'].includes(byId.get(step.id)?.kind)) errors.push(`Gate is not a capability or role: ${step.id}`)
    if (step.mode === 'gate' && !step.requires.length) errors.push(`Empty gate: ${step.id}`)
    if (new Set(step.requires).size !== step.requires.length) errors.push(`Duplicate inputs: ${step.id}`)
    if (pilot.entry_ids.includes(step.id) && step.requires.length) errors.push(`Entry has prerequisites: ${step.id}`)
    if (!pilot.stages.some(stage => stage.id === step.stage)) errors.push(`Unknown stage: ${step.stage}`)
    if (!step.requires.length && !pilot.entry_ids.includes(step.id)) errors.push(`Unexplained entry: ${step.id}`)
  }
  for (const step of steps.values()) for (const id of step.requires) if (!steps.has(id)) errors.push(`Missing input: ${id}`)
  for (const id of [...pilot.entry_ids, ...pilot.end_ids]) if (!steps.has(id)) errors.push(`Missing endpoint: ${id}`)
  const states = new Map(), visiting = new Set()
  function visit(id) {
    if (states.has(id)) return states.get(id)
    if (!steps.has(id)) return { done: false }
    if (visiting.has(id)) { errors.push(`Cycle: ${id}`); return { done: false } }
    visiting.add(id)
    const step = steps.get(id), inputs = step.requires.map(visit)
    const ready = inputs.every(input => input.done)
    const recorded = step.mode === 'activity' && completed.has(id)
    const done = !step.gap && ready && (step.mode === 'gate' || recorded)
    const state = { ...step, node: byId.get(id), ready, recorded, done,
      missing: step.requires.filter((input, i) => !inputs[i].done),
      status: step.gap ? 'Missing activity breakdown' : done ? 'Complete in draft model' : ready ? (step.mode === 'activity' ? 'Ready to practise' : 'Inputs complete') : recorded ? 'Recorded; inputs incomplete' : 'Waiting for inputs' }
    visiting.delete(id); states.set(id, state); return state
  }
  for (const id of steps.keys()) visit(id)
  const activities = [...states.values()].filter(step => step.mode === 'activity')
  return { errors: [...new Set(errors)], valid: errors.length === 0, steps: states,
    activities: activities.length, completed: activities.filter(step => step.done).length,
    ready: activities.filter(step => step.ready && !step.done),
    complete: errors.length === 0 && pilot.end_ids.every(id => states.get(id)?.done),
    stages: pilot.stages.map(stage => ({ ...stage, steps: pilot.steps.filter(step => step.stage === stage.id).map(step => states.get(step.id)) })) }
}

export function auditPilot(dataset, pilot = dataset.pilot_pathway) {
  if (!pilot) throw new Error('Missing pilot pathway')
  const nodes = ['roles', 'capabilities', 'learning_units'].flatMap(section => dataset[section] || [])
  const result = evaluatePilot(pilot, nodes), errors = [...result.errors]
  const steps = new Map(pilot.steps.map(step => [step.id, step]))
  const children = new Map()
  for (const edge of dataset.decompositions || []) {
    if (edge.type !== 'decomposes_into' || edge.completion_requirement === 'optional' || edge.completionRequirement === 'optional') continue
    if (!children.has(edge.from)) children.set(edge.from, [])
    children.get(edge.from).push(edge.to)
  }
  const activityIds = new Set((dataset.learning_units || []).map(node => node.id))
  const ancestors = id => {
    const found = new Set(), pending = [id]
    while (pending.length) for (const input of steps.get(pending.pop())?.requires || []) if (!found.has(input)) { found.add(input); pending.push(input) }
    return found
  }
  const requirements = []
  for (const roleId of pilot.end_ids) {
    const expected = (dataset.role_capability_assertions || []).filter(edge => edge.from === roleId && ['esco_essential', 'atlas_required'].includes(edge.relationType || edge.escoType || edge.type)).map(edge => edge.to)
    const actual = steps.get(roleId)
    if (!expected.length || actual?.mode !== 'gate' || expected.length !== actual.requires.length || expected.some(id => !actual.requires.includes(id))) errors.push(`Role requirements differ: ${roleId}`)
    for (const id of expected) {
      const covered = ancestors(id), leaves = new Set(), visiting = new Set()
      function descend(current) {
        if (visiting.has(current)) { errors.push(`Decomposition cycle: ${current}`); return }
        visiting.add(current)
        const parts = children.get(current) || []
        if (!parts.length) leaves.add(current)
        else parts.forEach(descend)
        visiting.delete(current)
      }
      descend(id)
      if (steps.get(id)?.mode !== 'gate') errors.push(`Missing capability gate: ${id}`)
      const declaredGap = steps.get(id)?.gap
      const missingBreakdown = leaves.size === 1 && leaves.has(id) && !activityIds.has(id)
      if (declaredGap && (!missingBreakdown || typeof declaredGap !== 'string')) errors.push(`Invalid breakdown gap: ${id}`)
      for (const leaf of leaves) if ((!activityIds.has(leaf) || !covered.has(leaf)) && !(declaredGap && missingBreakdown && leaf === id)) errors.push(`Uncovered required activity: ${leaf}`)
      const context = pilot.demonstrations[id]
      if (!context || !covered.has(context) || !activityIds.has(context)) errors.push(`Missing contextual demonstration: ${id}`)
      requirements.push({ role_id: roleId, id, leaves: [...leaves], demonstration: context, gap: declaredGap || null })
    }
  }
  // No orphan activities can quietly escape the end-to-end requirement audit.
  const requirementIds = new Set(requirements.map(item => item.id))
  for (const step of pilot.steps) if (step.gap && !requirementIds.has(step.id)) errors.push(`Gap is not a role requirement: ${step.id}`)
  const used = new Set(pilot.end_ids.flatMap(id => [...ancestors(id), id]))
  for (const id of steps.keys()) if (!used.has(id)) errors.push(`Unused pilot step: ${id}`)
  const allDone = evaluatePilot(pilot, nodes, activityIds)
  if (!allDone.complete && !requirements.some(item => item.gap)) errors.push('All activity evidence cannot satisfy the endpoints')
  return { ...result, valid: errors.length === 0, errors: [...new Set(errors)], requirements }
}
