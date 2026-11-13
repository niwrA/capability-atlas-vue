import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { auditExploration } from '../src/foundation-model.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { cleaningId } from '../scripts/profession-cleaning.mjs'
import { lockerId } from '../scripts/profession-locker-room.mjs'
import { hotelId } from '../scripts/profession-hotel-services.mjs'
import { foodId } from '../scripts/profession-food-hygiene.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const oldRouteFor=label=>[dataset.pilot_pathway,...dataset.pathway_exploration.routes].find(route=>nodes.get(route.occupation_id)?.label===label)

test('locker-room and hotel-porter proposals cover all essential requirements and distinct actual work',()=>{
  const report=auditProfessions(dataset)
  for(const[label,count]of [['locker room attendant',7],['hotel porter',6]]){
    const route=routeFor(label),row=report.rows.find(row=>row.id===route.occupation_id)
    assert.equal(row.complete,true)
    assert.equal(row.essentials,count)
    assert.ok(row.activities>=50)
  }
  assert.ok(routeFor('locker room attendant').occupation_facets.some(facet=>facet.source_fragment.includes('personal items')))
  assert.ok(routeFor('hotel porter').occupation_facets.some(facet=>facet.source_fragment.includes('carry their luggage')))
  assert.ok(routeFor('hotel porter').occupation_facets.some(facet=>facet.source_fragment.includes('occasional cleaning')))
})

test('locker availability, actual key operation and release state remain separately taught requirements',()=>{
  const availability=nodes.get(lockerId('availability')),key=nodes.get(lockerId('key-control')),cycle=nodes.get(lockerId('allocation-cycle'))
  assert.equal(availability.learning_design.focus.mode,'introduce')
  assert.equal(key.learning_design.focus.mode,'introduce')
  assert.equal(cycle.learning_design.focus.mode,'transfer')
  assert.match(availability.learning_design.input,/held for inspection/)
  assert.match(key.learning_design.understanding_check.evidence_scope,/actual training system|authorised training system/)
  const route=routeFor('locker room attendant'),actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
  done.delete(key.id)
  assert.equal(evaluatePilot(route,actual,done).complete,false)
})

test('floor methods, stairway conditions and hygiene evidence do not collapse into one practice claim',()=>{
  for(const key of ['sweeping','vacuuming','mopping','stair-plan','hygiene-evidence','result-check'])assert.ok(nodes.get(cleaningId(key)))
  assert.match(nodes.get(cleaningId('mopping')).learning_design.understanding_check.evidence_scope,/safe reopening/)
  assert.match(nodes.get(cleaningId('stair-plan')).learning_design.input,/actual stairway practice requires/)
  assert.match(nodes.get(cleaningId('hygiene-evidence')).learning_design.input,/not infection-control instructions/)
  const draft=structuredClone(dataset)
  draft.learning_units.find(node=>node.id===cleaningId('stair-plan')).learning_design.scope='practice_sequence'
  const report=auditProfessions(draft)
  assert.equal(report.rows.find(row=>row.id===routeFor('locker room attendant').occupation_id).complete,false)
  assert.equal(report.rows.find(row=>row.id===routeFor('cloak room attendant').occupation_id).complete,true)
})

test('new cleaning-equipment and food requirements remain canonical in the older shared routes',()=>{
  assert.equal(auditExploration(dataset).valid,true)
  const cleaner=oldRouteFor('domestic cleaner'),equipment='http://data.europa.eu/esco/skill/7b4bc709-5888-4f78-bbaf-fb760d4e2e4b'
  const required=dataset.decompositions.filter(edge=>edge.from===equipment&&edge.type==='decomposes_into'&&edge.completion_requirement!=='optional').map(edge=>edge.to)
  for(const id of required)assert.ok(cleaner.steps.find(step=>step.id===equipment).requires.includes(id))
  for(const route of [oldRouteFor('shelf filler'),oldRouteFor('cook')]){
    const actual=route.steps.map(step=>nodes.get(step.id)),all=new Set(actual.map(node=>node.id))
    for(const phase of ['preparation','manufacturing','processing','storage','distribution','delivery']){
      assert.ok(route.steps.some(step=>step.id===foodId(phase)))
      const done=new Set(all);done.delete(foodId(phase))
      assert.equal(evaluatePilot(route,actual,done).complete,false)
    }
  }
})

test('luggage replaces the inappropriate recipe template and package timing needs actual receipt evidence',()=>{
  const luggage=nodes.get(hotelId('luggage-request')),deadline=nodes.get(hotelId('delivery-deadline'))
  assert.doesNotMatch(luggage.learning_design.input,/recipe|allergen/)
  assert.match(luggage.previous_authored_draft.definition,/recipe/)
  assert.equal(luggage.label_nl,undefined)
  assert.equal(luggage.previous_authored_draft.label_nl,'Read the supplied process for handle guest luggage')
  assert.equal(luggage.decomposition_family,undefined)
  assert.equal(luggage.previous_authored_draft.decomposition_family,'food-and-hospitality')
  assert.match(luggage.reusability.hypothesis,/Permission for a luggage service/)
  assert.equal(luggage.estimated_active_learning_hours,undefined)
  assert.ok(luggage.previous_authored_draft.estimated_active_learning_hours)
  assert.match(deadline.learning_design.focus.goal,/receipt event/)
  assert.ok(deadline.learning_design.outputs.some(output=>output.includes('receipt')))
  assert.match(nodes.get(hotelId('support-cycle')).learning_design.task,/unresolved or outside-scope assistance/)
})
