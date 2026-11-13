import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'
import { checkPracticeAnswer, practiceQuestionState, auditQuantityPractice } from '../src/quantity-practice.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset = await readDataset(), pack = dataset.quantity_practice
const nodes = new Map(dataset.learning_units.map(node => [node.id, node]))
const exercises = pack.lessons.map(lesson => nodes.get(lesson.node_id).practice_exercise)
const record = (exercise, question, answer, unit, method='reference') => ({answer,unit,method,checked_answer:answer,checked_unit:unit,checked_method:method,checked_at:'2026-11-05T12:00:00Z',revision:exercise.revision})

test('eleven self-contained lessons provide 37 checked examples and three occupational transfer cases', () => {
  assert.deepEqual(auditQuantityPractice(dataset), [])
  assert.equal(pack.lessons.length,11)
  assert.equal(exercises.reduce((n,exercise)=>n+exercise.questions.length,0),37)
  assert.deepEqual(pack.lessons.filter(lesson=>lesson.context).map(lesson=>lesson.context),['cook','domestic cleaner','shop assistant'])
  for (const exercise of exercises) {
    assert.ok(exercise.cards.length && exercise.input && exercise.access)
    for (const card of exercise.cards) assert.ok(card.text && card.rows.length)
    for (const question of exercise.questions) {
      assert.ok(question.steps.length>=2)
      const response = question.type==='quantity' ? {answer:String(question.expected.value),unit:question.expected.unit} : {answer:question.expected}
      assert.equal(checkPracticeAnswer(question,response).kind,'correct',exercise.id+question.id)
    }
  }
})

test('numeric checks distinguish target units, incompatible dimensions, decimal commas and invalid input', () => {
  const question = exercises.find(exercise=>exercise.id==='quantity:conversion').questions[0]
  assert.equal(checkPracticeAnswer(question,{answer:'750',unit:'mL'}).kind,'correct')
  assert.match(checkPracticeAnswer(question,{answer:'0,75',unit:'L'}).feedback,/equivalent quantity/)
  assert.match(checkPracticeAnswer(question,{answer:'750',unit:'kg'}).feedback,/different kinds/)
  assert.match(checkPracticeAnswer(question,{answer:'0.00075',unit:'mL'}).feedback,/opposite direction/)
  for (const answer of ['', 'Infinity', 'NaN', '1e3', '750 mL', '-1', '1,000.0', '1/2']) assert.equal(checkPracticeAnswer(question,{answer,unit:'mL'}).kind,'incomplete',answer)
  assert.equal(checkPracticeAnswer(question,{answer:'750,0',unit:'mL'}).kind,'correct')
  assert.equal(checkPracticeAnswer(question,{answer:'750',unit:''}).kind,'incomplete')
})

test('incorrect choices, number-versus-unit errors and worked checks have useful feedback', () => {
  const length=exercises.find(exercise=>exercise.id==='quantity:units').questions[0]
  assert.match(checkPracticeAnswer(length,{answer:'6',unit:'cm'}).feedback,/number of blocks/)
  const gap=exercises.find(exercise=>exercise.id==='quantity:units').questions[1]
  assert.equal(checkPracticeAnswer(gap,{answer:'yes'}).kind,'retry')
  assert.equal(checkPracticeAnswer(gap,{answer:'unknown'}).kind,'incomplete')
  const precision=exercises.find(exercise=>exercise.id==='quantity:precision').questions[1]
  assert.match(checkPracticeAnswer(precision,{answer:'exact'}).feedback,/Extra digits/)
})

test('edited answers, changed content and viewed solutions cannot silently retain an unaided check', () => {
  const exercise=exercises[0],question=exercise.questions[0]
  const checked=record(exercise,question,'12','items','unaided')
  assert.equal(practiceQuestionState(exercise,question,checked).kind,'correct')
  assert.equal(practiceQuestionState(exercise,question,{...checked,answer:'11'}).kind,'edited')
  assert.equal(practiceQuestionState(exercise,question,{...checked,unit:'g'}).kind,'edited')
  assert.equal(practiceQuestionState(exercise,question,{...checked,revision:'old'}).kind,'stale')
  assert.equal(practiceQuestionState(exercise,question,{...checked,solution_viewed:true}).kind,'incomplete')
  assert.equal(practiceQuestionState(exercise,question,{...checked,method:'unknown',checked_method:'unknown'}).kind,'incomplete')
  assert.equal(practiceQuestionState(exercise,question,{answer:'12',unit:'items',solution_viewed:true}).kind,'unattempted')
})

test('pack checks stay separate from route completion and optional transfer exercises do not expand required source skills', () => {
  const nodesForModel=['roles','capabilities','learning_units'].flatMap(section=>dataset[section])
  const route=dataset.pathway_exploration.routes.find(route=>route.id.includes(':cook:'))
  const before=evaluatePilot(route,nodesForModel,new Set())
  for(const exercise of exercises)for(const question of exercise.questions){const response=question.type==='choice'?{answer:question.expected}:{answer:String(question.expected.value),unit:question.expected.unit};checkPracticeAnswer(question,response)}
  const after=evaluatePilot(route,nodesForModel,new Set())
  assert.equal(after.completed,before.completed)
  assert.equal(after.complete,false)
  for(const lesson of pack.lessons.filter(lesson=>lesson.context)) {
    const edges=dataset.decompositions.filter(edge=>edge.to===lesson.node_id&&edge.type==='contains_candidate')
    assert.equal(edges.length,1)
    assert.equal(edges[0].completion_requirement,'optional')
  }
  assert.ok(pack.prerequisite_audit.some(entry=>entry.status==='Practice option, not an entry barrier'))
})

test('the combined precision record cannot bypass either newly split activity',()=>{
  const nodeList=['roles','capabilities','learning_units'].flatMap(section=>dataset[section])
  const route=dataset.pathway_exploration.routes.find(route=>route.id.includes(':cleaner:'))
  const split=['atlas:alu:foundation-exploration:scale-selection','atlas:alu:foundation-exploration:reporting-resolution']
  const completed=new Set(dataset.learning_units.map(node=>node.id).filter(id=>!split.includes(id)))
  const state=evaluatePilot(route,nodeList,completed)
  const combined=state.steps.get('atlas:alu:foundation-exploration:measurement-precision')
  assert.equal(combined.recorded,true);assert.equal(combined.done,false)
  assert.equal(state.complete,false)
  for(const id of split)assert.equal(state.steps.get(id).recorded,false)
})

test('practice details remain lazy while pack navigation and grading revisions survive compilation', () => {
  const {index}=compileDataset(dataset),compact=decodeIndex(index)
  assert.deepEqual(compact.quantity_practice,pack)
  for(const node of compact.learning_units)assert.equal(node.practice_exercise,undefined)
  assert.ok(!JSON.stringify(index.quantity_practice).includes('expected'))
  const target=pack.lessons[0].node_id,before=createReviewFingerprinter(dataset)(target,'activity_content')
  const changed=structuredClone(dataset)
  changed.learning_units.find(node=>node.id===target).practice_exercise.questions[0].steps.push('Changed check')
  assert.notEqual(createReviewFingerprinter(changed)(target,'activity_content'),before)
  assert.throws(()=>compileDataset(changed),/Stale practice revision/)
})

test('invalid suggested references, cycles and wrong answer keys fail pack validation', () => {
  for(const change of [
    draft=>draft.quantity_practice.lessons[0].prior.push('missing'),
    draft=>draft.quantity_practice.lessons[0].prior.push(draft.quantity_practice.lessons.at(-1).id),
    draft=>{draft.learning_units.find(node=>node.id===pack.lessons[0].node_id).practice_exercise.questions[0].expected.unit='unknown'},
  ]){const draft=structuredClone(dataset);change(draft);assert.ok(auditQuantityPractice(draft).length)}
})
