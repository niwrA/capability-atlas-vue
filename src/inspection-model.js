const roleType = edge => edge.relationType || edge.escoType || edge.type
const requiredTypes = new Set(['esco_essential', 'atlas_required'])

export function conceptType(node) {
  if (node.kind === 'role') return node.role_family === 'life' ? 'Life role' : node.role_family === 'profession' ? 'Profession pilot' : 'Occupation'
  return { skill: 'Capability', learning_unit: 'Learning activity', framework_outcome: 'Curriculum outcome', qualification: 'Qualification' }[node.kind] || 'Concept'
}

export function relationshipLabel(edge, direction) {
  const outgoing = direction === 'out', type = roleType(edge)
  if (requiredTypes.has(type)) return outgoing ? 'Requires' : 'Required by'
  if (['esco_optional', 'atlas_optional'].includes(type)) return outgoing ? 'May use' : 'Optional for'
  return ({
    decomposes_into: outgoing ? 'Contains' : 'Part of',
    contains_candidate: outgoing ? 'Candidate component' : 'Candidate part of',
    prerequisite_for: outgoing ? 'Enables' : 'Prerequisite',
    specializes: 'Specialisation link',
    supports_outcome: outgoing ? 'Partially supports outcome' : 'Supported by activity',
    qualification_requirement: outgoing ? 'Requirement for' : 'Requires outcome',
    recommended_foundation_candidate: 'Suggested foundation link',
  })[edge.type] || String(edge.type || 'Related').replaceAll('_', ' ')
}

export function relationshipStatus(edge) {
  const type = roleType(edge)
  if (type === 'esco_essential') return 'ESCO Essential'
  if (type === 'esco_optional') return 'ESCO Optional'
  if (type === 'atlas_required') return 'Atlas core'
  if (type === 'atlas_optional') return 'Atlas context-dependent'
  if (edge.completion_requirement === 'optional' || edge.completionRequirement === 'optional' || edge.type === 'contains_candidate') return 'Optional / candidate'
  if (edge.validation === 'source_backed') return 'Source relationship'
  if (edge.validation === 'proposed' || ['decomposes_into', 'contains_candidate', 'prerequisite_for', 'specializes', 'recommended_foundation_candidate'].includes(edge.type)) return 'Atlas proposal'
  return 'Status not recorded'
}

export function createInspectionModel(nodes, relations) {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const links = new Map(nodes.map(node => [node.id, []]))
  const degree = new Map(nodes.map(node => [node.id, 0]))
  for (const edge of relations) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue
    degree.set(edge.from, degree.get(edge.from) + 1)
    if (edge.to !== edge.from) degree.set(edge.to, degree.get(edge.to) + 1)
    links.get(edge.from).push({ node: byId.get(edge.to), edge, direction: 'out' })
    if (edge.to !== edge.from) links.get(edge.to).push({ node: byId.get(edge.from), edge, direction: 'in' })
  }
  const named = nodes.slice().sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  const ranked = named.slice().sort((a, b) => degree.get(b.id) - degree.get(a.id) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  const text = new Map(nodes.map(node => [node.id, `${node.label} ${node.label_nl || ''} ${node.notation || ''} ${node.id}`.toLowerCase()]))
  const kindMatches = (node, kind) => {
    if (kind === 'role') return node.kind === 'role' && !node.role_family
    if (kind === 'atlas') return node.kind === 'role' && !!node.role_family
    return kind === 'all' || node.kind === kind
  }

  function search({ query = '', kind = 'all', sort = 'links', page = 1, pageSize = 15 } = {}) {
    const needle = query.trim().toLowerCase(), source = sort === 'links' ? ranked : sort === 'name-desc' ? named.slice().reverse() : named
    const matches = source.filter(node => (node.source_status !== 'obsolete' || node.id.toLowerCase() === needle) && kindMatches(node, kind) && (!needle || text.get(node.id).includes(needle)))
    const pages = Math.max(1, Math.ceil(matches.length / pageSize)), current = Math.max(1, Math.min(page, pages)), offset = (current - 1) * pageSize
    return { items: matches.slice(offset, offset + pageSize), total: matches.length, page: current, pages, start: matches.length ? offset + 1 : 0, end: Math.min(matches.length, offset + pageSize) }
  }

  function connections(id, { query = '', direction = 'all', sort = 'links' } = {}) {
    const rows = new Map(), needle = query.trim().toLowerCase()
    for (const link of links.get(id) || []) {
      if (link.node.id === id || direction !== 'all' && link.direction !== direction || needle && !text.get(link.node.id).includes(needle)) continue
      const key = `${link.direction}:${link.node.id}`
      if (!rows.has(key)) rows.set(key, { node: link.node, direction: link.direction, edges: [], labels: [], flowLabels: [], statuses: [], linkCount: degree.get(link.node.id) })
      const row = rows.get(key)
      row.edges.push(link.edge)
      row.labels = [...new Set([...row.labels, relationshipLabel(link.edge, link.direction)])]
      row.flowLabels = [...new Set([...row.flowLabels, relationshipLabel(link.edge, 'out')])]
      row.statuses = [...new Set([...row.statuses, relationshipStatus(link.edge)])]
    }
    return [...rows.values()].sort((a, b) => (sort === 'links' ? b.linkCount - a.linkCount : 0) || a.node.label.localeCompare(b.node.label) || a.node.id.localeCompare(b.node.id))
  }

  function neighbourhood(id, limit = 8) {
    const rows = connections(id), incoming = rows.filter(row => row.direction === 'in'), outgoing = rows.filter(row => row.direction === 'out')
    const left = Math.min(incoming.length, outgoing.length ? Math.floor(limit / 2) : limit)
    const right = Math.min(outgoing.length, limit - left)
    return { incoming: incoming.slice(0, Math.min(incoming.length, limit - right)), outgoing: outgoing.slice(0, right), total: rows.length }
  }

  function contract(id, detail) {
    const node = byId.get(id), rows = links.get(id) || [], inputs = [], context = [], supports = []
    for (const row of rows) {
      const { edge, direction } = row
      const prerequisite = direction === 'in' && edge.type === 'prerequisite_for'
      const requirement = direction === 'out' && requiredTypes.has(roleType(edge))
      const component = direction === 'out' && edge.type === 'decomposes_into' && edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional'
      const formalRequirement = direction === 'in' && ['qualification_requirement', 'supports_outcome'].includes(edge.type)
      const item = { ...row, label: relationshipLabel(edge, direction), status: relationshipStatus(edge) }
      if (prerequisite || requirement || component || formalRequirement) inputs.push(item)
      else if (direction === 'in' && ['decomposes_into', 'contains_candidate'].includes(edge.type)) context.push(item)
      else if (direction === 'in' && ['esco_essential', 'esco_optional', 'atlas_required', 'atlas_optional'].includes(roleType(edge)) || direction === 'out' && ['prerequisite_for', 'supports_outcome', 'qualification_requirement'].includes(edge.type)) supports.push(item)
    }
    const unique = items => [...new Map(items.map(item => [item.node.id, item])).values()]
    return {
      loaded: !!detail, purpose: detail?.definition || detail?.note || '',
      inputLabel: node.kind === 'role' ? 'Required capabilities' : node.kind === 'skill' ? 'Prerequisites and component activities' : node.kind === 'learning_unit' ? 'Inputs and prerequisites' : 'Mapped activities and requirements',
      inputs: unique(inputs), context: unique(context), supports: unique(supports),
      criteria: Array.isArray(detail?.assessment?.criteria) ? detail.assessment.criteria : [],
      assessmentMethod: detail?.assessment?.method || '',
      inputSpecification: detail?.input_specification || '',
      outputSpecification: detail?.output_specification || '',
      outputLabel: node.kind === 'learning_unit' ? 'Expected outputs and evidence' : 'Outputs and downstream use',
      isActivity: node.kind === 'learning_unit',
    }
  }

  const metricCache = new Map(nodes.map(node => [node.id, { links: degree.get(node.id), incoming: links.get(node.id).filter(row => row.direction === 'in').length, outgoing: links.get(node.id).filter(row => row.direction === 'out').length, activations: null }]))
  const metrics = id => metricCache.get(id) || { links: 0, incoming: 0, outgoing: 0, activations: null }
  return { search, connections, neighbourhood, contract, metrics, conceptType, relationshipLabel, relationshipStatus }
}
