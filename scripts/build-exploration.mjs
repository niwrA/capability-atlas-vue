import { applyMeasurementFoundations } from './measurement-foundations.mjs'
import { readDataset, writeDataset } from './atlas-data.mjs'
import { replaceOwnedRecords, preserveIndividualRevisions } from './authoring-records.mjs'
import { foundations, occupations } from './exploration-content.mjs'
import { auditExploration } from '../src/foundation-model.js'
import { refinedActivities, refinedInputs, refineFoundationSteps, refinementGroups, refinementId, pruneRouteSteps } from './foundation-refinement.mjs'
import { applyCapabilityBreakdowns } from './capability-breakdowns.mjs'
import { applyQuantityPractice, quantityFoundationSteps, contextualQuantityInputs } from './quantity-practice.mjs'
import { ensureStartingFoundations } from './starting-foundations.mjs'
import { reconcileAuthoredRoutes } from './reconcile-authored-routes.mjs'

const dataset = await readDataset()
ensureStartingFoundations(dataset)
if (!dataset.pilot_pathway) throw new Error('Build the initial pilot first: node scripts/build-pilot.mjs')
const source = 'Capability Atlas comparative foundation exploration v1'
const foundationPrefix = 'atlas:alu:foundation-exploration:'
const contextPrefix = 'atlas:alu:occupation-exploration:'
const existingPrefix = 'atlas:alu:pilot:shelf-filler:'
const foundationId = key => key.startsWith('@') ? existingPrefix + key.slice(1) : foundationPrefix + key
const records = []
function activity(id, label, input, definition, criteria) {
  records.push({ id, label, kind: 'learning_unit', source, source_version: '1', official: false, status: 'proposed',
    input_specification: input, definition, output_specification: criteria.join('; '),
    assessment: { method: 'Observe supported practice, discuss the result and record assistance, adaptations and remaining uncertainty. Self-recording is not independent assessment.', criteria },
    notes: 'Authored comparison hypothesis. Shared prerequisites are Atlas proposals, not ESCO statements. No fixed age, duration or automatic transfer of occupational competence. Review and further decomposition remain necessary.' })
}
let foundationSteps = dataset.pilot_pathway.steps.filter(step => ['early', 'shared'].includes(step.stage) && !step.id.startsWith(foundationPrefix)).map(step => structuredClone(step))
for (const [key, parents, label, materials, task, criteria] of foundations) {
  const id = foundationId(key)
  activity(id, label, materials, task, criteria)
  const step = { id, stage: 'shared', mode: 'activity', requires: parents.map(foundationId) }
  const index = foundationSteps.findIndex(item => item.id === id)
  if (index < 0) foundationSteps.push(step)
  else foundationSteps[index] = step
}
const changes = Object.entries(refinedInputs).map(([key, parents]) => ({ target_id: refinementId(key),
  before: dataset.pathway_exploration?.refinement?.changes.find(change => change.target_id === refinementId(key))?.before || foundationSteps.find(step => step.id === refinementId(key))?.requires || [],
  after: parents.map(refinementId) }))
foundationSteps = refineFoundationSteps(foundationSteps)
foundationSteps.push(...structuredClone(quantityFoundationSteps))
for (const [, key, , label, materials, task, criteria] of refinedActivities) {
  activity(refinementId(key), label, materials, task, criteria)
  Object.assign(records.at(-1), { source: 'Capability Atlas foundation refinement draft v2', source_version: '2' })
}
// Keep the original role/context records and IDs; refine its inputs explicitly.
dataset.pilot_pathway.steps = pruneRouteSteps([...foundationSteps, ...dataset.pilot_pathway.steps.filter(step => !['early', 'shared'].includes(step.stage))], dataset.pilot_pathway.end_ids)
dataset.pilot_pathway.version = 2
dataset.pilot_pathway.entry_ids = dataset.pilot_pathway.steps.filter(step => !step.requires.length).map(step => step.id)
const breakdowns = applyCapabilityBreakdowns(dataset)
const breakdownInputs = new Map(breakdowns.flatMap(breakdown => breakdown.activities.map(activity => [activity.id, activity.requires])))
const requiredChildren = new Map()
for (const edge of dataset.decompositions) {
  if (edge.type !== 'decomposes_into' || edge.completion_requirement === 'optional' || edge.completionRequirement === 'optional') continue
  if (!requiredChildren.has(edge.from)) requiredChildren.set(edge.from, [])
  requiredChildren.get(edge.from).push(edge.to)
}
function leaves(id, trail = new Set()) {
  if (trail.has(id)) throw new Error(`Decomposition cycle: ${id}`)
  const children = requiredChildren.get(id) || []
  return children.length ? [...new Set(children.flatMap(child => leaves(child, new Set([...trail, id]))))] : [id]
}
const routes = []
for (const occupation of occupations) {
  const role = dataset.roles.find(node => node.source === 'ESCO' && node.source_status === 'released' && node.label === occupation.label)
  if (!role) throw new Error(`Unknown occupation: ${occupation.label}`)
  const required = dataset.role_capability_assertions.filter(edge => edge.from === role.id && (edge.relationType || edge.escoType || edge.type) === 'esco_essential').map(edge => edge.to)
  const skills = dataset.capabilities.filter(node => required.includes(node.id))
  const route = { format: 1, id: `atlas:exploration:${occupation.key}:v1`, version: 3, label: `${role.label} — foundation exploration`,
    status: 'Unreviewed Atlas comparison draft', occupation_id: role.id, end_ids: [role.id],
    stages: [dataset.pilot_pathway.stages[0], dataset.pilot_pathway.stages[1], { id: 'work', label: `3. ${role.label}: contextual practice`, description: 'All essential ESCO requirements are accounted for. Existing draft leaves are retained; contextual exercises keep occupational assessment expectations distinct. Missing canonical breakdowns remain blocking gaps.' }],
    scope: `Explore the foundations behind every essential ESCO 1.2.1 requirement for ${role.label}. A contextual exercise does not fill a missing canonical breakdown or establish job readiness.`,
    semantics: 'Every listed input is required (AND). Gates aggregate evidence and cannot be ticked complete. Missing canonical activity breakdowns block the affected branch even after its contextual exercise. Adult life is a separate pathway, not an occupational prerequisite.',
    access: dataset.pilot_pathway.access,
    review_needed: ['Review shared-foundation and intermediate prerequisite hypotheses with learning and accessibility specialists', `Review ${role.label} tasks, source-skill breadth and supplied procedures with a practitioner`, 'Add missing intermediate practice and record limits of transfer between contexts'],
    steps: structuredClone(foundationSteps), entry_ids: [], demonstrations: {} }
  const byStep = new Map(route.steps.map(step => [step.id, step])), assigned = new Set()
  function addStep(id, requires, mode = 'activity', gap) {
    const prior = byStep.get(id)
    if (prior) { for (const input of requires) if (!prior.requires.includes(input)) prior.requires.push(input); return }
    const step = { id, stage: 'work', mode, requires, ...(gap ? { gap } : {}) }
    byStep.set(id, step); route.steps.push(step)
  }
  for (const [label, inputKeys, task, criteria] of occupation.rows) {
    const matches = skills.filter(node => node.label === label)
    if (matches.length !== 1 || assigned.has(matches[0]?.id)) throw new Error(`Unmatched/duplicate essential requirement: ${occupation.label}: ${label}`)
    const skill = matches[0]; assigned.add(skill.id)
    const inputIds = [...new Set([...inputKeys.map(key => key === '@digital-practice' ? refinementId('digital-action') : foundationId(key)), ...(contextualQuantityInputs[label] || [])])]
    for (const input of inputIds) if (!byStep.has(input)) throw new Error(`Unknown foundation: ${input}`)
    const parts = leaves(skill.id)
    let prior = inputIds
    for (const leaf of parts.filter(id => id !== skill.id)) {
      addStep(leaf, breakdownInputs.get(leaf) || prior)
      prior = [leaf]
    }
    if (breakdowns.some(breakdown => breakdown.skill_id === skill.id)) prior = [...new Set([...parts, ...inputIds])]
    const demo = `${contextPrefix}${occupation.key}:${skill.id.split('/').at(-1)}`
    activity(demo, `${role.label}: ${skill.label} — supplied-case practice`,
      `A fictional ${role.label} case, the inert/mock or offline materials specified in the brief, supplied task criteria and an accessible record of the result. Use agreed support; real workplace practice requires appropriate instruction and supervision.`, task, criteria)
    addStep(demo, prior)
    route.demonstrations[skill.id] = demo
    const gap = parts.includes(skill.id) ? 'The source capability has no required canonical learning-activity breakdown. Decompose its breadth and intermediate practice; the contextual example alone is insufficient.' : null
    addStep(skill.id, [demo], 'gate', gap)
  }
  if (assigned.size !== required.length) throw new Error(`Essential requirements omitted for ${occupation.label}: ${skills.filter(node => !assigned.has(node.id)).map(node => node.label).join(', ')}`)
  addStep(role.id, required, 'gate')
  // Prune unused shared hypotheses so no occupation requires unrelated branches.
  const used = new Set(), pending = [role.id]
  while (pending.length) { const id = pending.pop(); if (used.has(id)) continue; used.add(id); pending.push(...(byStep.get(id)?.requires || [])) }
  route.steps = route.steps.filter(step => used.has(step.id))
  route.entry_ids = route.steps.filter(step => !step.requires.length).map(step => step.id)
  routes.push(route)
}
// Quantity lessons share the foundation namespace but belong to their own
// generator; keep their positions while rebuilding this family's records.
const quantityIds=new Set(quantityFoundationSteps.map(step=>step.id))
dataset.learning_units=replaceOwnedRecords(dataset.learning_units,preserveIndividualRevisions(dataset.learning_units,records),node=>(node.id.startsWith(foundationPrefix)&&!quantityIds.has(node.id))||node.id.startsWith(contextPrefix))
applyQuantityPractice(dataset)
applyMeasurementFoundations(dataset)
// Expose the newly assembled routes to the reconciler before deriving reuse.
if(dataset.pathway_exploration)dataset.pathway_exploration.routes=routes
reconcileAuthoredRoutes(dataset)
const usedOccupationalFoundations = new Set()
for (const route of [dataset.pilot_pathway, ...routes]) {
  const byId = new Map(route.steps.map(step => [step.id, step])), pending = [route.occupation_id]
  while (pending.length) { const id = pending.pop(); if (usedOccupationalFoundations.has(route.id + id)) continue; usedOccupationalFoundations.add(route.id + id); pending.push(...(byId.get(id)?.requires || [])) }
}
const activeFoundationIds = foundationSteps.map(step => step.id).filter(id => [dataset.pilot_pathway, ...routes].some(route => usedOccupationalFoundations.has(route.id + id)))
dataset.pathway_exploration = { format: 1, version: 3, status: 'Unreviewed comparison hypotheses',
  purpose: 'Use contrasting occupational requirements to discover shared foundations and recursively ask how those foundations can be learned from earlier starting points. Routes are test cases for the learning structure.',
  foundation_ids: activeFoundationIds, routes, breakdowns,
  refinement: { version: 2, groups: refinementGroups, changes,
    learning_records: 'Earlier completion records are retained. A revised activity counts as complete in a route only after every newly specified input is complete; earlier completion alone is not evidence for the added practice.' },
  findings: [
    { title: 'Checking is shared; acceptance criteria remain contextual', detail: 'Cleaning a surface, receiving ingredients and debugging a program all compare observations with expected results. The proposed observation and evidence activities are reused, while the supplied criteria and occupational demonstrations stay separate.' },
    { title: 'Quantity branches need more than counting', detail: 'Stock counting, cooking portions and expense tables reveal different next steps: units and measurement, scaling relationships, and structured records. Added measure, proportion and table activities make those distinctions inspectable.' },
    { title: 'A short routine is not yet a development process', detail: 'Software requirements expose missing reasoning layers: conditional rules, repetition, state, problem decomposition, interfaces and tests. Each now has an observable draft activity with explicit earlier inputs.' },
    { title: 'Documents and handovers reveal shared information structure', detail: 'Retail orders, office case files and kitchen handovers reuse recording identifiers, status, ownership and next action. Audience and access boundaries remain explicit rather than assuming all information can be shared.' },
    { title: 'Same ESCO skill does not imply identical occupational assessment', detail: 'The comparison lists exact shared source-skill IDs separately from proposed foundations. Each occupation retains its own contextual demonstration, so completing a retail example does not automatically satisfy the shelf-filling or administration example.' },
  ],
  questions: [
    { id: 'measurement-depth', title: 'How much numerical breadth and precision do the contexts need?', detail: 'Repeated units, scale readings, estimates, equal parts, simple fractions, decimals and scale factors now have smaller draft activities. Unit conversion, numerical fluency, varied fractions and tool-specific precision still need decomposition and practitioner review.', concept_ids: ['repeat-unit', 'fraction-quantity', 'decimal-place', 'scale-factor'].map(foundationId) },
    { id: 'reading-depth', title: 'Which reading strategies and support are needed beyond these examples?', detail: 'Written-form matching, meaning checks, supported word reading, sentence meaning, instructions, document fields and short records now have separate practice. Language-specific decoding sequences, vocabulary breadth and longer texts remain open; accessible reading is distinguished from unaided decoding.', concept_ids: ['supported-word-reading', 'sentence-meaning', 'document-locate', 'short-record'].map(foundationId) },
    { id: 'reasoning-transfer', title: 'What transfers from small explicit rules to larger programs?', detail: 'Condition checks, branch outcomes, counted repetition, stop conditions, single updates, traces, expected results and failure replay are now separate. The code bridge compares physical rules with supplied constructs; nested rules and independent generalisation still need investigation.', concept_ids: ['condition-check', 'trace-updates', 'boundary-examples', 'match-code-rule'].map(foundationId) },
    { id: 'embodied-practice', title: 'What is missing between safe mock practice and real tools?', detail: 'Reach, grip, sensory feedback, fatigue and environmental variation need individual exploration. Mock exercises intentionally leave sharp, hot, powered and chemical practice for appropriate instruction and supervision.', concept_ids: ['workspace', 'materials', 'change'].map(foundationId) },
    { id: 'conjunction-review', title: 'Which proposed inputs are prerequisites, practice aids or alternatives?', detail: 'The current route engine treats listed inputs as AND. Review whether each is necessary, whether order can change, and which accessible alternatives should replace a requirement. Usage counts measure this authored model, not causal evidence.', concept_ids: ['sequence', 'procedure', 'needs'].map(foundationId) },
  ] }
const audit = auditExploration(dataset)
if (!audit.valid) throw new Error(audit.errors.join('\n'))
await writeDataset(dataset)
console.log(JSON.stringify({ occupations: routes.length, essential_links: occupations.reduce((count, occupation) => count + occupation.rows.length, 0), authored_activities: records.length, refined_activities: refinedActivities.length, foundations: activeFoundationIds.length, gaps: audit.comparison.gaps.length, shared_source_skills: audit.comparison.sharedRequirements.length }))
