export const reviewScopeLabels = {
  activity_content: 'Activity instructions and assessment criteria',
  skill_breakdown: 'Skill activities, decomposition, and represented prerequisites',
  occupation_pathway: 'Occupation skills, draft activities, and represented route links',
  mapped_learning: 'Mapped Atlas learning and its curriculum or qualification links',
}

export function isGeneratedActivity(node) {
  return node.kind === 'learning_unit' && !!(node.decomposition_family || node.source_version === '0.19.0' || /^atlas:esco-(breakdown|entry-practice):/.test(node.id))
}

const isRequiredRoleLink = edge => ['esco_essential', 'atlas_required'].includes(edge.relationType || edge.escoType || edge.type)
const isDecomposition = edge => ['decomposes_into', 'contains_candidate'].includes(edge.type)
const isRequired = edge => edge.type !== 'contains_candidate' && edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional'
const roleGroup = node => node.source === 'ESCO' ? String(node.notation || node.isco_major_group || '').slice(0, 1) || 'other' : `atlas-${node.role_family || 'other'}`

export function createCatalogueModel(dataset, existing = {}) {
  const nodes = existing.nodes || [...dataset.roles, ...dataset.capabilities, ...(dataset.learning_units || []), ...(dataset.framework_outcomes || []), ...(dataset.qualifications || [])]
  const byId = existing.byId || Object.fromEntries(nodes.map(node => [node.id, node]))
  const roleEdges = existing.roleEdges || {}
  const decompositionEdges = existing.decompositionEdges || {}
  if (!existing.roleEdges) for (const edge of dataset.role_capability_assertions) (roleEdges[edge.from] ??= []).push(edge)
  if (!existing.decompositionEdges) for (const edge of dataset.decompositions) if (isDecomposition(edge)) (decompositionEdges[edge.from] ??= []).push(edge)
  const reviews = dataset.review_registry || {}
  const coverageCache = new Map(), activityCache = new Map()

  function activityTree(id) {
    if (activityCache.has(id)) return activityCache.get(id)
    const units = new Set(), missing = new Set(), seen = new Set(), queue = [id]
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]
      if (seen.has(current)) continue
      seen.add(current)
      const node = byId[current]
      if (!node) continue
      if (node.kind === 'learning_unit') units.add(current)
      const children = (decompositionEdges[current] || []).filter(isRequired)
      if (!children.length && node.kind === 'skill') missing.add(current)
      queue.push(...children.map(edge => edge.to))
    }
    const result = { units: [...units], missing: [...missing] }
    activityCache.set(id, result)
    return result
  }

  function rootsFor(node) {
    if (node.kind === 'role') return [...new Set((roleEdges[node.id] || []).filter(isRequiredRoleLink).map(edge => edge.to))]
    if (node.kind === 'framework_outcome' || node.kind === 'qualification') {
      const outcomeIds = new Set(node.kind === 'framework_outcome' ? [node.id] : (dataset.qualification_requirements || []).filter(edge => edge.to === node.id).map(edge => edge.from))
      return [...new Set((dataset.outcome_capability_links || []).filter(edge => outcomeIds.has(edge.to)).map(edge => edge.from))]
    }
    return [node.id]
  }

  function coverageFor(id) {
    if (coverageCache.has(id)) return coverageCache.get(id)
    const node = byId[id]
    if (!node) return null
    const roots = rootsFor(node), trees = roots.map(activityTree)
    const units = [...new Set(trees.flatMap(tree => tree.units))]
    const missing = [...new Set(trees.flatMap(tree => tree.missing))]
    const developed = trees.filter(tree => tree.units.length > 0).length
    const breakdown = !roots.length ? 'unmapped' : !units.length ? 'none' : developed < roots.length || missing.length ? 'partial' : 'draft'
    const currentReview = reviews[id] || { status: 'unreviewed', records: [] }
    const generated = units.filter(unitId => isGeneratedActivity(byId[unitId])).length
    const result = {
      developed, total: roots.length, units: units.length, generated, missingIds: missing,
      reviewedActivities: units.filter(unitId => reviews[unitId]?.status === 'reviewed').length,
      reviewedCapabilities: roots.filter(root => byId[root]?.kind === 'skill' && reviews[root]?.status === 'reviewed').length,
      breakdown,
      status: { unmapped: 'No required capabilities listed', none: 'No activity breakdown', partial: 'Partial draft breakdown', draft: 'Draft activity breakdown' }[breakdown],
      contentLabel: !units.length ? 'No learning activities' : currentReview.status === 'reviewed' ? 'Reviewed content' : generated ? 'Generated draft activities' : 'Draft learning activities',
      review: currentReview,
      reviewLabel: { reviewed: 'Documented review', outdated: 'Review needs updating', changes_requested: 'Review requested changes', unreviewed: 'No documented review' }[currentReview.status],
    }
    coverageCache.set(id, result)
    return result
  }

  const roles = dataset.roles.filter(node => node.source_status !== 'obsolete').slice().sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  const escoRoles = roles.filter(node => node.source === 'ESCO')
  const groupDefinitions = dataset.catalogue?.occupationGroups || (dataset.esco_classifications || []).filter(node => /^http:\/\/data.europa.eu\/esco\/isco\/C\d$/.test(node.id)).map(node => ({ code: String(node.notation), label: node.label }))
  const groupCounts = new Map()
  for (const node of roles) groupCounts.set(roleGroup(node), (groupCounts.get(roleGroup(node)) || 0) + 1)
  const groups = [
    ...groupDefinitions.map(group => ({ ...group, count: groupCounts.get(group.code) || 0 })),
    { code: 'atlas-life', label: 'Atlas life roles', count: groupCounts.get('atlas-life') || 0 },
    { code: 'atlas-profession', label: 'Atlas profession pilots', count: groupCounts.get('atlas-profession') || 0 },
  ].filter(group => group.count > 0)
  const knownGroups = new Set(groups.map(group => group.code))
  for (const [code, count] of groupCounts) if (!knownGroups.has(code)) groups.push({ code, label: 'Other roles', count })
  const browseText = new Map(roles.map(node => [node.id, `${node.label} ${node.label_nl || ''} ${node.notation || ''} ${node.id}`.toLowerCase()]))

  function browse({ group = 'esco', query = '', coverage = 'all', page = 1, pageSize = 12 } = {}) {
    const text = query.trim().toLowerCase()
    const matchesCoverage = node => coverage === 'all' || (coverage === 'reviewed' ? reviews[node.id]?.status === 'reviewed' : coverageFor(node.id).breakdown === coverage)
    const matches = roles.filter(node => (group === 'all' || group === 'esco' && node.source === 'ESCO' || roleGroup(node) === group) && (!text || browseText.get(node.id).includes(text)) && matchesCoverage(node))
    const pages = Math.max(1, Math.ceil(matches.length / pageSize)), currentPage = Math.max(1, Math.min(page, pages)), offset = (currentPage - 1) * pageSize
    return { items: matches.slice(offset, offset + pageSize), total: matches.length, pages, page: currentPage, start: matches.length ? offset + 1 : 0, end: Math.min(offset + pageSize, matches.length) }
  }

  // Immutable catalogue facts are computed once, independently of learner state.
  const breakdownCounts = { none: 0, partial: 0, draft: 0, unmapped: 0 }
  for (const node of escoRoles) breakdownCounts[coverageFor(node.id).breakdown]++
  const overview = {
    ...(dataset.catalogue || {}), occupations: escoRoles.length,
    skills: dataset.capabilities.filter(node => node.source === 'ESCO' && node.source_status !== 'obsolete').length,
    atlasRoles: roles.length - escoRoles.length,
    breakdownCounts, reviewedPathways: escoRoles.filter(node => reviews[node.id]?.status === 'reviewed' && coverageFor(node.id).units > 0).length,
  }
  return { coverageFor, rootsFor, overview, groups, browse, reviewScopeLabels }
}
