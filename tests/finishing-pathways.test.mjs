import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { workshopId as work } from '../scripts/profession-workshop.mjs'
import { finishingId as finish } from '../scripts/profession-finishing.mjs'
import { leatherFinishingId as goods } from '../scripts/profession-leather-finishing.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const route=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods finishing operator')
const row=draft=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)

test('leather-goods finishing covers seven essential sources and every occupation-named finish/technique',()=>{
 assert.equal(row(dataset).complete,true)
 assert.equal(row(dataset).essentials,7)
 assert.equal(route.skill_coverage.length,7)
 for(const key of ['handles-and-metal','ironing','creaming','surface-oiling','waterproof-treatment','washing','cleaning','polishing','waxing','brushing','tip-finishing','glue-residue','top-painting','plastic-coated-finish','visual-revision','authorised-correction']){
  assert.ok(route.occupation_outcomes.includes(goods(key)),key)
  assert.ok(route.occupation_facets.some(facet=>facet.activity_ids.includes(goods(key))),key)
 }
 assert.ok(route.occupation_facets.some(facet=>facet.source_fragment.includes('supervisor and from the technical sheet')))
 assert.ok(route.review_needed.some(note=>note.includes('painting the tops')))
})

test('all leather body/fibre/colour/surface and separate footwear methods remain actual required work',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['leather-solidity','leather-flexibility','leather-lubrication','leather-colour','leather-surface','heel-sole-roughing','footwear-colour','bottom-polish','cold-wax','hot-wax','footwear-clean','tack-removal','sock-insertion','hot-air-treeing','cream-dressing','spray-dressing','antique-dressing']){
  const id=finish(key);assert.ok(route.steps.some(step=>step.id===id),key)
  const partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 assert.match(nodes.get(goods('source-leather-operations')).learning_design.understanding_check.materials,/record-purpose mismatch/)
 assert.match(nodes.get(goods('source-footwear-methods')).learning_design.understanding_check.materials,/missing method rows/)
 const mapping=route.skill_coverage.find(mapping=>mapping.key==='footwearfinishing')
 for(const text of ['cold or hot wax burnishing','hot air treeing for removing wrinkles','manual or machine operations, with or without chemicals','adjust working parameters'])assert.ok(mapping.facets.some(facet=>facet.source_fragment===text))
})

test('actual process controls, accepted settings and operator-care authority cannot be skipped',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 for(const key of ['work-reference','product-compatibility','process-controls','care-boundary','condition-check','method-setup','parameter-change','operator-clean','care-cycle']){
  const id=work(key),partial=new Set(done);partial.delete(id)
  assert.equal(evaluatePilot(route,actual,partial).complete,false,key)
 }
 assert.match(nodes.get(work('parameter-change')).learning_design.understanding_check.materials,/rejection/)
 assert.match(nodes.get(work('care-cycle')).learning_design.understanding_check.evidence_scope,/isolation-authorisation/)
 assert.equal(nodes.get(work('process-controls')).supporting_sources.length,2)
 assert.equal(nodes.get(work('care-boundary')).supporting_sources[0].url,'https://www.hse.gov.uk/work-equipment-machinery/maintenance.htm')
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===finish('hot-wax')).learning_design.scope='practice_sequence'
 assert.equal(row(draft).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leather goods manual operator').complete,true)
})

test('appearance, application and attempted correction cannot replace required result evidence',()=>{
 assert.match(nodes.get(finish('leather-target')).learning_design.understanding_check.materials,/failed flexibility/)
 assert.match(nodes.get(finish('leather-lubrication')).learning_design.understanding_check.what_changes,/surface dressing/)
 assert.match(nodes.get(goods('waterproof-treatment')).learning_design.understanding_check.materials,/pending required check/)
 assert.match(nodes.get(goods('plastic-coated-finish')).learning_design.understanding_check.materials,/pending required condition evidence/)
 assert.match(nodes.get(goods('authorised-correction')).learning_design.understanding_check.materials,/failed recheck/)
 assert.match(nodes.get(goods('top-painting')).learning_design.input,/No whole-upper\/edge interpretation/)
 assert.match(nodes.get(goods('tip-finishing')).learning_design.input,/no improvised flame/)
})

test('actual workshop parameter changes invalidate the dependent occupation review without changing unrelated routes',()=>{
 const manual=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods manual operator')
 const unrelated=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leaflet distributor')
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===work('parameter-change')).learning_design.task+=' Check the revised actual returned-setting evidence.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 // Reviews conservatively retain official optional source links too. Stitching
 // is optional for the manual operator and now has a real parameter dependency;
 // it still does not become a required activity in that occupational route.
 assert.equal(manual.steps.some(step=>step.id===work('parameter-change')),false)
 assert.notEqual(before(manual.occupation_id,'occupation_pathway'),after(manual.occupation_id,'occupation_pathway'))
 assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
