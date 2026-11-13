import { createHash } from 'node:crypto'
import { reviewScopeLabels } from '../src/catalogue-model.js'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

export function createReviewFingerprinter(dataset) {
  const nodes = new Map(['roles', 'capabilities', 'learning_units', 'framework_outcomes', 'qualifications'].flatMap(section => dataset[section] || []).map(node => [node.id, node]))
  const next = new Map()
  const add = (from, to, edge, routeId) => { if (!next.has(from)) next.set(from, []); next.get(from).push({ to, edge, routeId }) }
  for (const edge of dataset.role_capability_assertions || []) add(edge.from, edge.to, edge)
  for (const edge of dataset.decompositions || []) {
    if (['decomposes_into', 'contains_candidate'].includes(edge.type)) add(edge.from, edge.to, edge)
    else if (['prerequisite_for', 'specializes'].includes(edge.type)) add(edge.to, edge.from, edge)
  }
  for (const edge of [...dataset.outcome_capability_links || [], ...dataset.qualification_requirements || []]) add(edge.to, edge.from, edge)
  // Pathway and breakdown reviews include contextual pilot demonstrations and
  // their explicit prerequisites, even though these are outside the general graph.
  const routes = [dataset.pilot_pathway, ...(dataset.pathway_exploration?.routes || []), ...(dataset.profession_pathways?.routes || [])].filter(Boolean)
  for (const route of routes) for (const step of route.steps) for (const input of step.requires) {
    add(step.id, input, { from: step.id, to: input, type: 'pilot_requires_all', validation: 'proposed', pilot_id: route.id, gap: step.gap || null }, route.id)
  }
  return (id, scope) => {
    const node = nodes.get(id), kind = dataset.roles?.some(record => record.id === id) ? 'role' : dataset.capabilities?.some(record => record.id === id) ? 'skill' : node?.kind
    const permitted = { role: 'occupation_pathway', skill: 'skill_breakdown', learning_unit: 'activity_content', qualification: 'mapped_learning', framework_outcome: 'mapped_learning' }
    if (!node || permitted[kind] !== scope) throw new Error(`Invalid review target/scope: ${id} / ${scope}`)
    // A shared skill can have different occupational demonstrations. Reviewing
    // one occupation must not walk into every other occupation's context merely
    // because both use that skill. A skill-breakdown review still covers all of
    // its contexts, and every review retains the canonical source requirements.
    const contextRoutes = scope === 'occupation_pathway' ? routes.filter(route => route.occupation_id === id || route.end_ids?.includes(id)) : routes
    const contextIds = new Set(contextRoutes.map(route => route.id))
    const seen = new Set(), queue = [id], edges = new Set()
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]
      if (seen.has(current)) continue
      seen.add(current)
      if (scope !== 'activity_content') for (const link of next.get(current) || []) {
        if (link.routeId && !contextIds.has(link.routeId)) continue
        edges.add(link.edge); queue.push(link.to)
      }
    }
    const payload = { scope, nodes: [...seen].sort().map(id => nodes.get(id)), edges: [...edges].map(canonical).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0) }
    if (scope !== 'activity_content' && contextRoutes.includes(dataset.pilot_pathway) && dataset.pilot_pathway?.steps.some(step => seen.has(step.id))) {
      const { id, version, semantics, access, scope: pilotScope } = dataset.pilot_pathway
      payload.pilot_context = { id, version, semantics, access, scope: pilotScope }
    }
    if (scope !== 'activity_content' && dataset.pathway_exploration) {
      payload.exploration_context = contextRoutes.filter(route => route.steps.some(step => seen.has(step.id))).map(({ id, version, semantics, access, scope }) => ({ id, version, semantics, access, scope }))
      payload.source_breakdowns = (dataset.pathway_exploration.breakdowns || []).filter(breakdown => seen.has(breakdown.skill_id))
    }
    if(scope !== 'activity_content' && dataset.profession_pathways){
      payload.profession_context=dataset.profession_pathways.routes.filter(route=>contextIds.has(route.id)&&(seen.has(route.occupation_id)||route.skill_coverage.some(mapping=>seen.has(mapping.skill_id)))).map(({id,version,source_definition,scope,semantics,access,occupation_outcomes,occupation_facets,skill_coverage})=>({id,version,source_definition,scope,semantics,access,occupation_outcomes,occupation_facets,skill_coverage}))
      payload.starting_assumptions=(dataset.starting_foundations?.entries||[]).filter(entry=>seen.has(entry.id))
    }
    return createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex')
  }
}

export function compileReviews(dataset) {
  const register = dataset.content_reviews || { format: 1, records: [] }
  if (register.format !== 1 || !Array.isArray(register.records)) throw new Error('Unsupported content review register')
  if (!register.records.length) return {}
  const fingerprint = createReviewFingerprinter(dataset), ids = new Set(), grouped = {}
  for (const review of register.records) {
    const nonempty = value => typeof value === 'string' && value.trim().length > 0
    if (!nonempty(review.id) || ids.has(review.id) || !reviewScopeLabels[review.scope] || !nonempty(review.reviewer?.name) || !nonempty(review.reviewer?.expertise) || !nonempty(review.summary) || !['accepted', 'changes_requested'].includes(review.decision) || !nonempty(review.reviewed_at) || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(review.reviewed_at) || !Number.isFinite(Date.parse(review.reviewed_at)) || !/^[a-f0-9]{64}$/.test(review.content_fingerprint) || !Array.isArray(review.evidence) || !review.evidence.length || review.evidence.some(item => !nonempty(item.title) || !/^https?:\/\//.test(item.url))) throw new Error(`Incomplete content review evidence: ${review.id}`)
    ids.add(review.id)
    const current = fingerprint(review.target_id, review.scope) === review.content_fingerprint
    ;(grouped[review.target_id] ??= []).push({ ...review, current })
  }
  return Object.fromEntries(Object.entries(grouped).map(([id, records]) => {
    records.sort((a, b) => Date.parse(a.reviewed_at) - Date.parse(b.reviewed_at))
    const latest = records.at(-1)
    return [id, { status: !latest.current ? 'outdated' : latest.decision === 'accepted' ? 'reviewed' : 'changes_requested', scope: latest.scope, records }]
  }))
}

