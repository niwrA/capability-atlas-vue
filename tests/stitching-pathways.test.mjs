import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { stitchingOperatorId as operator } from '../scripts/profession-stitching-operators.mjs'
import { stitchingId as stitch } from '../scripts/profession-stitching.mjs'
import { prestitchMethodId as preparation } from '../scripts/profession-prestitch-methods.mjs'
import { prestitchKnowledgeId as knowledge } from '../scripts/profession-prestitch-knowledge.mjs'
import { footwearSeamId as seam } from '../scripts/profession-footwear-seams.mjs'
import { machineCuttingId as cutting } from '../scripts/profession-machine-cutting.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routes=['leather goods stitching machine operator','footwear stitching machine operator'].map(label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label))
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('both stitching occupations include all ten/thirteen essentials and actual source-description work',()=>{
 for(const [index,essentials] of [[0,10],[1,13]]){assert.equal(row(dataset,routes[index]).complete,true);assert.equal(row(dataset,routes[index]).essentials,essentials);cannotOmit(routes[index],['order-reference','preparation-work','machine-work','machine-care','operating-interval'].map(key=>operator(index?'footwear':'leather',key)))}
 cannotOmit(routes[1],['source-cutting','trim-work'].map(key=>operator('footwear',key)))
})

test('each named pre-stitching method stays required beyond preparation knowledge or marked skill gates',()=>{
 const methods=['splitting','skiving','folding','stitch-marking','stamping','press-punching','perforating','embossing','gluing','upper-preforming','crimping','reinforcement-placement']
 for(const route of routes)cannotOmit(route,methods.map(preparation))
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===preparation('perforating')).learning_design.scope='practice_sequence'
 for(const route of routes)assert.equal(row(draft,route).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leaflet distributor').complete,true)
 assert.match(nodes.get(knowledge('geometry-technology')).learning_design.input,/fold|pre.form|crimp/i)
})

test('machine recognition or one successful seam cannot replace separate flat-bed, arm and column performance',()=>{
 for(const route of routes)cannotOmit(route,['flat-bed-method','arm-method','column-method','needle-thread-selection','piece-position','machine-preparation','guide-path','seam-result'].map(stitch))
 assert.match(nodes.get(stitch('column-method')).learning_design.input,/alternatives/)
 assert.match(nodes.get(stitch('column-method')).learning_design.understanding_check.expected_evidence.join(' '),/not extended automatically/)
 assert.match(nodes.get(stitch('arm-method')).learning_design.understanding_check.expected_evidence.join(' '),/remains unperformed/)
})

test('all six footwear seam constructions are knowledge requirements without becoming unrelated leather requirements',()=>{
 const ids=['closed-seam','lapped-seam','butted-seam','welted-seam','piped-seam','moccasin-seam'].map(seam)
 cannotOmit(routes[1],ids)
 for(const id of ids)assert.equal(routes[0].steps.some(step=>step.id===id),false)
 assert.match(nodes.get(seam('welted-seam')).learning_design.input+' '+nodes.get(seam('welted-seam')).learning_design.task,/Goodyear/)
 const draft=structuredClone(dataset),route=draft.profession_pathways.routes.find(route=>route.id===routes[1].id)
 route.steps.find(step=>step.id===seam('seam-technology-cycle')).requires=route.steps.find(step=>step.id===seam('seam-technology-cycle')).requires.filter(id=>id!==seam('butted-seam'))
 assert.equal(row(draft,routes[1]).complete,false)
})

test('final scissors trim preserves source ambiguity and does not replace either essential cutting technology',()=>{
 cannotOmit(routes[1],[cutting('automatic-cycle'),cutting('machine-cycle'),operator('footwear','trim-work')])
 const trim=nodes.get(operator('footwear','trim-work')).learning_design
 assert.match(trim.input,/scissors or dyes/);assert.match(trim.input,/requires practitioner clarification/)
 assert.match(trim.understanding_check.expected_evidence.join(' '),/allowance remains failed/)
 assert.ok(routes[1].review_needed.some(text=>text.includes('scissors or dyes')))
 assert.equal(routes[0].steps.some(step=>step.id===cutting('automatic-cycle')),false)
})

test('changed practical seam output invalidates dependent occupation reviews while unrelated manual work stays stable',()=>{
 const fingerprint=createReviewFingerprinter(dataset)
 const manual=dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label==='leather goods manual operator')
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===stitch('arm-method')).learning_design.task+=' Check the revised actual arm-control instruction.'
 const changed=createReviewFingerprinter(draft)
 for(const route of routes)assert.notEqual(changed(route.occupation_id,'occupation_pathway'),fingerprint(route.occupation_id,'occupation_pathway'))
 assert.equal(changed(manual.occupation_id,'occupation_pathway'),fingerprint(manual.occupation_id,'occupation_pathway'))
})
