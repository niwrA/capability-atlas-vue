const text = value => typeof value === 'string' && value.trim().length > 0
const range = (value, allowZero = false) => Number.isFinite(value?.min) && Number.isFinite(value?.max) && (allowZero ? value.min >= 0 : value.min > 0) && value.max >= value.min

export function assessLearningDesign(node) {
  const design = node?.learning_design
  if (!design) return { status: 'not_specified', errors: [], label: 'Authoring criteria not specified' }
  const errors = []
  if (design.format !== 1 || design.status !== 'authored_draft' || !['activity', 'practice_sequence'].includes(design.scope)) errors.push('Unsupported learning-design format, status or scope')
  const focus = design.focus
  if (!focus || !['introduce', 'transfer', 'mixed'].includes(focus.mode) || !text(focus.goal) || !Array.isArray(focus.new_concepts)) errors.push('Missing primary learning focus')
  else {
    if (new Set(focus.new_concepts.map(concept => String(concept).trim().toLowerCase())).size !== focus.new_concepts.length) errors.push('New concepts must be distinct')
    if (focus.mode === 'introduce' && (focus.new_concepts.length !== 1 || !focus.new_concepts.every(text))) errors.push('An introduction needs one named primary new concept')
    if (focus.mode === 'transfer' && focus.new_concepts.length !== 0) errors.push('Transfer practice must identify new concepts separately')
    if (focus.mode === 'mixed' && (focus.new_concepts.length < 2 || !focus.new_concepts.every(text) || !text(focus.split_reason) || !Array.isArray(focus.split_plan) || focus.split_plan.length < 2 || !focus.split_plan.every(text))) errors.push('A mixed step needs its concepts, reason and concrete split plan')
  }
  if (!Array.isArray(design.starting_abilities) || !design.starting_abilities.length || design.starting_abilities.some(item => !text(item.ability) || !['needed', 'supportable'].includes(item.requirement) || !Array.isArray(item.alternatives) || (item.requirement === 'supportable' && !item.alternatives.length) || !item.alternatives.every(text))) errors.push('Starting abilities and supported alternatives are incomplete')
  if (!text(design.input) || !text(design.task) || !Array.isArray(design.outputs) || !design.outputs.length || !design.outputs.every(text)) errors.push('Concrete input, task and observable outputs are required')
  const check = design.understanding_check
  const questions = node.practice_exercise?.questions || []
  if (!check || !text(check.what_changes) || !text(check.evidence_scope)) errors.push('A changed-case understanding check needs its variation and evidence scope')
  else if (check.kind === 'practice_variation') {
    if (!Array.isArray(check.question_ids) || !check.question_ids.length || check.question_ids.some(id => !questions.some(question => question.id === id && question.role === 'variation'))) errors.push('A varied understanding check must reference actual variation questions')
  } else if (check.kind === 'observed_variation') {
    if (!text(check.materials) || !text(check.prompt) || !Array.isArray(check.expected_evidence) || !check.expected_evidence.length || !check.expected_evidence.every(text)) errors.push('An observed variation needs actual materials, a task and expected evidence')
  } else errors.push('Unknown understanding-check kind')
  if (!Array.isArray(design.difficulties) || !design.difficulties.length || design.difficulties.some(item => !text(item.misconception) || !text(item.feedback))) errors.push('Likely difficulties and feedback are required')
  const effort = design.effort
  if (!effort || !range(effort.session_minutes) || !range(effort.total_active_minutes) || !range(effort.revisit_sessions, true) || !text(effort.spacing) || effort.confidence !== 'low' || effort.observed !== false || !text(effort.basis) || !Array.isArray(effort.assumptions) || !effort.assumptions.length || !effort.assumptions.every(text)) errors.push('Provisional effort needs session/total/revisit ranges, assumptions and an honest basis')
  else if (effort.total_active_minutes.min < effort.session_minutes.min || effort.total_active_minutes.max < effort.session_minutes.max) errors.push('Total effort cannot be shorter than the stated session range')
  if (effort && (!Number.isInteger(effort.revisit_sessions?.min) || !Number.isInteger(effort.revisit_sessions?.max))) errors.push('Revisit sessions need whole-number counts')
  if (!text(design.reuse?.shared_core) || !text(design.reuse?.context)) errors.push('Shared learning and contextual practice must be distinguished')
  if (design.dependency_basis!==undefined && (!Array.isArray(design.dependency_basis)||design.dependency_basis.some(item=>!text(item?.input_id)||!text(item?.reason)))) errors.push('Dependency rationale entries need an input ID and explanation')
  const status = errors.length ? 'incomplete' : focus.mode === 'mixed' ? 'needs_split' : 'draft_ready'
  return { status, errors, label: { incomplete: 'Authoring criteria incomplete', needs_split: 'Multiple new concepts — split proposed', draft_ready: 'Authoring criteria specified — unreviewed' }[status] }
}
