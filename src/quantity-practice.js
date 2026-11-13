const units = {
  items: ['count', 1], mm: ['length', 1], cm: ['length', 10], m: ['length', 1000],
  mL: ['volume', 1], L: ['volume', 1000], g: ['mass', 1], kg: ['mass', 1000],
}
export const practiceMethodIds = ['reference', 'calculator', 'objects', 'partner', 'unaided']

export function checkPracticeAnswer(question, response = {}) {
  if (question.type === 'choice') {
    const option = question.options.find(option => option.id === response.answer)
    if (!option) return { kind: 'incomplete', feedback: 'Choose one of the supplied answers.' }
    const correct = option.id === question.expected
    return { kind: correct ? 'correct' : 'retry', feedback: option.feedback }
  }
  const text = String(response.answer ?? '').trim()
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return { kind: 'incomplete', feedback: 'Enter one non-negative number. A decimal comma or decimal point is accepted; choose its unit separately.' }
  const value = Number(text.replace(',', '.')), unit = response.unit
  if (!Number.isFinite(value) || !units[unit] || !question.units.includes(unit)) return { kind: 'incomplete', feedback: 'Enter a finite number and choose a supplied unit.' }
  const expected = question.expected
  if (units[unit][0] !== units[expected.unit][0]) return { kind: 'retry', feedback: 'These units describe different kinds of quantity. Use the kind and target unit requested in the task.' }
  if (unit !== expected.unit) {
    const equivalent = Math.abs(value * units[unit][1] - expected.value * units[expected.unit][1]) < 1e-8
    return { kind: 'retry', feedback: equivalent ? `That is an equivalent quantity, but this task asks for ${expected.unit}. Use the supplied pair to express it in the target unit.` : `Check the conversion and report the result in ${expected.unit}, as requested.` }
  }
  if (Math.abs(value - expected.value) < 1e-8) return { kind: 'correct', feedback: `Matches the supplied example: ${expected.value} ${expected.unit}. Explain or show your check using your recorded support method.` }
  const mistake = (question.mistakes || []).find(mistake => mistake.unit === unit && Math.abs(mistake.value - value) < 1e-8)
  return { kind: 'retry', feedback: mistake?.feedback || 'This does not yet match the supplied case. Check the card, the unit and the worked reference, then try again.' }
}

export function practiceQuestionState(exercise, question, record) {
  if (!record?.checked_at) return { kind: 'unattempted' }
  if (record.revision !== exercise.revision) return { kind: 'stale', feedback: 'This exercise changed. Your earlier answer is retained; check it against the current cards.' }
  if (record.answer !== record.checked_answer || record.unit !== record.checked_unit || record.method !== record.checked_method) return { kind: 'edited', feedback: 'Answer or support method changed. Check this response again.' }
  if (!practiceMethodIds.includes(record.method)) return { kind: 'incomplete', feedback: 'Record a supplied method or support option before checking.' }
  if (record.solution_viewed && record.method !== 'reference') return { kind: 'incomplete', feedback: 'A worked check has been viewed. Record reference support for this response.' }
  return checkPracticeAnswer(question, record)
}

export function auditQuantityPractice(dataset) {
  const pack = dataset.quantity_practice
  if (!pack) return []
  const errors = [], nodes = new Map((dataset.learning_units || []).map(node => [node.id, node])), lessons = new Set(), questions = new Set()
  if (pack.format !== 1 || !pack.lessons.length || !pack.methods.length) errors.push('Invalid quantity practice format')
  if (pack.methods.some(method => !practiceMethodIds.includes(method.id))) errors.push('Unknown practice method')
  const graph = new Map()
  for (const lesson of pack.lessons) {
    if (lessons.has(lesson.id)) errors.push(`Duplicate practice lesson: ${lesson.id}`)
    lessons.add(lesson.id); graph.set(lesson.id, lesson.prior)
    const exercise = nodes.get(lesson.node_id)?.practice_exercise
    if (!exercise || exercise.id !== lesson.id || !/^[a-f0-9]{64}$/.test(exercise.revision)) { errors.push(`Missing or invalid practice content: ${lesson.node_id}`); continue }
    if (!exercise.cards.length || !exercise.questions.length || !exercise.input || !exercise.access) errors.push(`Incomplete practice materials: ${lesson.id}`)
    for (const question of exercise.questions) {
      const key = exercise.id + ':' + question.id
      if (questions.has(key)) errors.push(`Duplicate practice question: ${key}`)
      questions.add(key)
      if (!question.steps.length) errors.push(`Missing worked check: ${key}`)
      if (question.type === 'quantity') {
        if (!Number.isFinite(question.expected?.value) || !units[question.expected.unit] || !question.units.includes(question.expected.unit)) errors.push(`Invalid quantity answer: ${key}`)
      } else if (question.type === 'choice') {
        if (!question.options.some(option => option.id === question.expected) || new Set(question.options.map(option => option.id)).size !== question.options.length) errors.push(`Invalid choice answer: ${key}`)
      } else errors.push(`Unknown practice question type: ${key}`)
    }
  }
  const visited = new Set(), visiting = new Set()
  const visit = id => {
    if (visiting.has(id)) { errors.push(`Practice suggestion cycle: ${id}`); return }
    if (visited.has(id)) return
    visiting.add(id)
    for (const prior of graph.get(id) || []) { if (!lessons.has(prior)) errors.push(`Unknown suggested lesson: ${prior}`); else visit(prior) }
    visiting.delete(id); visited.add(id)
  }
  for (const id of lessons) visit(id)
  return errors
}
