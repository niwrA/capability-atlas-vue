import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { handSewingId as hand } from '../scripts/profession-hand-sewing.mjs'
import { leatherRepairId as repair } from '../scripts/profession-leather-repair.mjs'
import { apparelSewingId as apparel } from '../scripts/profession-apparel-sewing.mjs'
import { handStitcherId as occupation } from '../scripts/profession-hand-stitchers.mjs'
import { stitchingId as stitch } from '../scripts/profession-stitching.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const leather=routeFor('leather goods hand stitcher'),footwear=routeFor('footwear hand sewer')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('hand stitchers cover their full ten/nine essential source sets and actual occupational work',()=>{
 const report=auditProfessions(dataset)
 for(const [route,count,kind] of [[leather,10,'leather'],[footwear,9,'footwear']]){
  const actual=report.rows.find(row=>row.id===route.occupation_id);assert.equal(actual.complete,true);assert.equal(actual.essentials,count)
  cannotOmit(route,['order-reference','preparation-work','source-machine-stitching','hand-join','decoration','operating-interval'].map(key=>occupation(kind,key)))
 }
 cannotOmit(footwear,['upper-sole','source-teamwork'].map(key=>occupation('footwear',key)))
 cannotOmit(leather,['textile-hand-source','apparel-source','repair-source'].map(key=>occupation('leather',key)))
})

test('hand tools, layer registration, stitch passage, drawing and secured endings each remain required',()=>{
 const ids=['hand-tool-reference','layer-registration','thread-path','draw-control','secure-inspect'].map(hand)
 for(const route of [leather,footwear])cannotOmit(route,ids)
 assert.match(nodes.get(hand('thread-path')).learning_design.understanding_check.expected_evidence.join(' '),/missing layer remains unjoined/)
 assert.match(nodes.get(hand('draw-control')).learning_design.understanding_check.expected_evidence.join(' '),/does not override material damage/)
 assert.match(nodes.get(hand('secure-inspect')).learning_design.understanding_check.expected_evidence.join(' '),/unsecured actual end remains incomplete/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===hand('thread-path')).learning_design.scope='practice_sequence'
 for(const route of [leather,footwear])assert.equal(row(draft,route).complete,false)
})

test('the shared manual-sewing core does not make machine operation a universal prerequisite',()=>{
 const seen=new Set(),queue=[hand('secure-inspect')]
 for(let index=0;index<queue.length;index++){const id=queue[index];if(seen.has(id))continue;seen.add(id);queue.push(...(nodes.get(id)?.learning_design?.dependency_basis||[]).map(input=>input.input_id))}
 for(const key of ['machine-preparation','guide-path','stitching-cycle','flat-bed-method','arm-method','column-method'])assert.equal(seen.has(stitch(key)),false,key)
 // Both actual occupations separately have the official machine essential.
 for(const route of [leather,footwear])cannotOmit(route,[stitch('machine-preparation'),stitch('guide-path'),stitch('stitching-cycle')])
})

test('decorative stitching, structural upper joining and upper-to-sole attachment cannot replace one another',()=>{
 cannotOmit(footwear,['hand-join','decoration','upper-sole'].map(key=>occupation('footwear',key)))
 assert.match(nodes.get(occupation('footwear','decoration')).learning_design.understanding_check.expected_evidence.join(' '),/protected-opening failure/)
 assert.match(nodes.get(occupation('footwear','upper-sole')).learning_design.input,/one specifically reviewed complete-footwear case/)
 assert.match(nodes.get(occupation('footwear','upper-sole')).learning_design.understanding_check.expected_evidence.join(' '),/does not replace the required actual layer\/test/)
 assert.equal(leather.steps.some(step=>step.id===occupation('footwear','upper-sole')),false)
 const draft=structuredClone(dataset),route=draft.profession_pathways.routes.find(route=>route.id===footwear.id)
 route.steps.find(step=>step.id===occupation('footwear','operating-interval')).requires=route.steps.find(step=>step.id===occupation('footwear','operating-interval')).requires.filter(id=>id!==occupation('footwear','upper-sole'))
 assert.equal(row(draft,footwear).complete,false)
})

test('leather source textile manufacture/repair and actual computerised apparel performance remain separate',()=>{
 cannotOmit(leather,['hand-textile-manufacture','hand-textile-repair','textile-hand-cycle'].map(hand))
 cannotOmit(leather,['apparel-reference','programme-selection','apparel-cycle'].map(apparel))
 assert.match(nodes.get(apparel('programme-selection')).learning_design.understanding_check.expected_evidence.join(' '),/active returned state/)
 assert.match(nodes.get(apparel('apparel-cycle')).learning_design.input,/alternatives/)
 assert.match(nodes.get(occupation('leather','textile-hand-source')).learning_design.understanding_check.expected_evidence.join(' '),/not relabelled textile repair/)
 for(const id of [hand('textile-hand-cycle'),apparel('apparel-cycle')])assert.equal(footwear.steps.some(step=>step.id===id),false)
})

test('all repair actions require actual restoration and retained-substrate evidence beyond new seam manufacture',()=>{
 cannotOmit(leather,['repair-scope','adjustment','treatment','seam-restoration','component-replacement','repair-cycle'].map(repair))
 assert.match(nodes.get(repair('seam-restoration')).learning_design.understanding_check.expected_evidence.join(' '),/does not clear the failed retained material/)
 assert.match(nodes.get(repair('component-replacement')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish compatibility/)
 assert.match(nodes.get(repair('repair-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/do not assess the new actual damage/)
 const draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===repair('component-replacement')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,leather).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leaflet distributor').complete,true)
})

test('revised actual hand-tool content invalidates dependent profession and skill reviews while distribution remains stable',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===hand('draw-control')).learning_design.task+=' Check the revised actual material-protection reference.'
 const after=createReviewFingerprinter(draft)
 for(const route of [leather,footwear])assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const skill='http://data.europa.eu/esco/skill/477856e7-92e6-43e8-ad67-e2d7129a5188'
 assert.notEqual(before(skill,'skill_breakdown'),after(skill,'skill_breakdown'))
 const other=routeFor('leaflet distributor');assert.equal(before(other.occupation_id,'occupation_pathway'),after(other.occupation_id,'occupation_pathway'))
})
