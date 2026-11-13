import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { checkPracticeAnswer, practiceQuestionState } from '../src/quantity-practice.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset = await readDataset()
const authored = dataset.learning_units.filter(node => node.learning_design)
const byLesson = id => authored.find(node => node.practice_exercise?.id === 'quantity:' + id)

test('sixteen designs distinguish whole foundation activities from broader practice sequences', () => {
  assert.ok(authored.length >= 16)
  assert.equal(authored.filter(node=>node.practice_exercise).length,11)
  const statuses = authored.map(node => assessLearningDesign(node).status)
  assert.equal(statuses.filter(status => status === 'draft_ready').length, authored.length)
  assert.equal(statuses.filter(status => status === 'needs_split').length, 0)
  for(const id of ['scale-selection','reporting-resolution']){assert.equal(byLesson(id).learning_design.scope,'activity');assert.equal(byLesson(id).learning_design.focus.new_concepts.length,1)}
  for (const id of ['cooking', 'cleaning', 'retail', 'precision']) {
    assert.equal(byLesson(id).learning_design.focus.mode, 'transfer')
    assert.deepEqual(byLesson(id).learning_design.focus.new_concepts, [])
  }
  assert.equal(assessLearningDesign({estimated_active_learning_hours:{min:1,max:3}}).status, 'not_specified')
})

test('learning effort separates session, total active time and revisits with provisional assumptions', () => {
  for (const node of authored) {
    const design = node.learning_design, effort = design.effort
    assert.ok(['activity','practice_sequence'].includes(design.scope))
    assert.equal(effort.confidence, 'low')
    assert.equal(effort.observed, false)
    assert.match(effort.basis, /no learner timing/)
    assert.ok(effort.total_active_minutes.max >= effort.session_minutes.max)
    assert.ok(effort.revisit_sessions.min >= 2)
    assert.ok(effort.assumptions.some(text => text.includes('prerequisites')))
  }
})

test('each understanding check uses an actual changed question, not only the copied worked example', () => {
  for (const node of authored) {
    const exercise = node.practice_exercise, design = node.learning_design
    if (!exercise) { assert.equal(design.understanding_check.kind,'observed_variation'); assert.ok(design.understanding_check.expected_evidence.length); continue }
    const variation = exercise.questions.filter(question => question.role === 'variation')
    assert.equal(variation.length, 1)
    assert.deepEqual(design.understanding_check.question_ids, variation.map(question => question.id))
    const question = variation[0]
    assert.ok(question.prompt.startsWith('New'))
    const response = question.type === 'choice' ? {answer:question.expected} : {answer:String(question.expected.value),unit:question.expected.unit}
    assert.equal(checkPracticeAnswer(question,response).kind, 'correct')
  }
  assert.equal(byLesson('conversion').practice_exercise.questions.at(-1).expected.value, 200)
  assert.equal(byLesson('retail').practice_exercise.questions.at(-1).expected.value, 2)
})

test('physical and social activities can specify observable changed-case evidence without an automated quiz', () => {
  const node=structuredClone(byLesson('count'))
  delete node.practice_exercise
  node.learning_design.scope='activity'
  node.learning_design.understanding_check={kind:'observed_variation',what_changes:'Change the target from 15 to 17.',materials:'Twelve counters in a tray and a target card labelled 17.',prompt:'Show how many counters must be added and check the total.',expected_evidence:['Adds five counters to the twelve.','Shows that the new total matches seventeen.'],evidence_scope:'Observed supplied case; record support used.'}
  assert.equal(assessLearningDesign(node).status,'draft_ready')
  node.learning_design.understanding_check.expected_evidence=[]
  assert.equal(assessLearningDesign(node).status,'incomplete')
})

test('malformed authoring criteria fail the build while explicitly mixed and legacy activities remain allowed', () => {
  for (const change of [
    design => {design.focus.new_concepts.push('Another new concept')},
    design => {design.starting_abilities[1].alternatives=[]},
    design => {design.effort.session_minutes.min=-1},
    design => {design.effort.total_active_minutes.max=1},
    design => {design.effort.observed=true},
    design => {design.understanding_check.question_ids=['missing']},
  ]) {
    const node = structuredClone(byLesson('count')); change(node.learning_design)
    assert.equal(assessLearningDesign(node).status, 'incomplete')
    const draft = {...dataset, learning_units: dataset.learning_units.map(item => item.id === node.id ? node : item)}
    assert.throws(() => compileDataset(draft), /Invalid learning design/)
  }
  const mixed = structuredClone(byLesson('precision')); Object.assign(mixed.learning_design.focus,{mode:'mixed',new_concepts:['Tool selection','Reporting resolution'],split_reason:'Two concepts',split_plan:[]})
  assert.equal(assessLearningDesign(mixed).status,'incomplete')
})

test('criteria stay in lazy details; summaries and review fingerprints reflect their actual scope', () => {
  const {index} = compileDataset(dataset), compact = decodeIndex(index)
  assert.equal(index.learning_design_summary.draft_ready,authored.length)
  assert.equal(index.learning_design_summary.needs_split,0)
  assert.equal(index.learning_design_summary.not_specified,dataset.learning_units.length-authored.length)
  assert.deepEqual(compact.learning_design_summary,index.learning_design_summary)
  assert.ok(compact.learning_units.every(node=>node.learning_design===undefined))
  const target=byLesson('count').id, before=createReviewFingerprinter(dataset)(target,'activity_content')
  const draft=structuredClone(dataset)
  draft.learning_units.find(node=>node.id===target).learning_design.effort.session_minutes.max++
  assert.notEqual(createReviewFingerprinter(draft)(target,'activity_content'),before)
})

test('earlier check revisions retain the response but require checking the extended sequence again', () => {
  const exercise=byLesson('count').practice_exercise,question=exercise.questions[0]
  const record={answer:'12',unit:'items',method:'reference',checked_answer:'12',checked_unit:'items',checked_method:'reference',checked_at:'2026-11-05T12:00:00Z',revision:'previous-content'}
  assert.equal(practiceQuestionState(exercise,question,record).kind,'stale')
  assert.equal(record.answer,'12')
  assert.equal(exercise.version,2)
})
