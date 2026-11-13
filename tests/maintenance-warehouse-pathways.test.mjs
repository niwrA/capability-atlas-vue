import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { maintenanceKnowledgeId as knowledge } from '../scripts/profession-machine-maintenance-knowledge.mjs'
import { equipmentMaintenanceId as maintenance } from '../scripts/profession-equipment-maintenance.mjs'
import { machineMonitoringId as monitor, meterDifferenceId, equipmentEnergyId } from '../scripts/profession-machine-monitoring.mjs'
import { footwearWarehouseSkillId as skill } from '../scripts/profession-footwear-warehouse-skills.mjs'
import { leatherMaintenanceId as technician } from '../scripts/profession-leather-maintenance.mjs'
import { footwearWarehouseId as warehouse, timedAvailabilityId } from '../scripts/profession-footwear-warehouse.mjs'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const leather=routeFor('leather goods maintenance technician'),footwear=routeFor('footwear factory warehouse operator')
const row=(draft,route)=>auditProfessions(draft).rows.find(row=>row.id===route.occupation_id)
function cannotOmit(route,ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('maintenance technician and factory warehouse retain all eleven essentials and actual occupational outcomes',()=>{
 const report=auditProfessions(dataset)
 for(const route of [leather,footwear]){const actual=report.rows.find(row=>row.id===route.occupation_id);assert.equal(actual.complete,true);assert.equal(actual.essentials,11)}
 cannotOmit(leather,['equipment-brief','footwear-source-maintenance','cutting-equipment','stitching-equipment','finishing-equipment','supplementary-equipment','production-monitoring','usage-energy-information','environment-work','communication-data','foreign-exchanges','operating-interval'].map(technician))
 cannotOmit(footwear,['warehouse-brief','classify-register','storage-operations','purchase-forecast','departmental-kits','layout-system','operations-management','packing-expedition','equipment-maintenance-source','business-data','operating-interval'].map(warehouse))
})

test('full assembling maintenance requires separate real installation, programming, tuning, diagnosis, repair, substitution and lubrication',()=>{
 const keys=['maintenance-plan','prepared-state','installation','programming','tuning','function-assessment','fault-diagnosis','repair','replacement','lubrication','preventive-maintenance','corrective-maintenance','post-verification','technical-register','maintenance-cycle']
 for(const route of [leather,footwear])cannotOmit(route,keys.map(maintenance))
 assert.match(nodes.get(maintenance('programming')).learning_design.input,/actual programme creation\/change/)
 assert.match(nodes.get(maintenance('programming')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish the actual active programme/)
 assert.match(nodes.get(maintenance('post-verification')).learning_design.understanding_check.expected_evidence.join(' '),/does not replace the required actual inspection/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===maintenance('installation')).learning_design.scope='practice_sequence'
 for(const route of [leather,footwear])assert.equal(row(draft,route).complete,false)
 assert.equal(auditProfessions(draft).rows.find(row=>row.label==='leaflet distributor').complete,true)
})

test('fault reasoning and required preparation distinguish hypotheses, stopped motion and verified task state',()=>{
 for(const route of [leather,footwear])cannotOmit(route,['architecture-reference','energy-state','fault-evidence','diagnostic-test','component-compatibility','repair-process','lubrication-reference','preventive-corrective','verification-reference','knowledge-cycle'].map(knowledge))
 assert.match(nodes.get(knowledge('energy-state')).learning_design.understanding_check.expected_evidence.join(' '),/Stopped movement does not establish/)
 assert.match(nodes.get(knowledge('diagnostic-test')).learning_design.understanding_check.expected_evidence.join(' '),/does not distinguish A from B/)
 assert.match(nodes.get(knowledge('component-compatibility')).learning_design.understanding_check.expected_evidence.join(' '),/Mounting fit does not clear/)
 assert.match(nodes.get(maintenance('corrective-maintenance')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish restored function/)
})

test('four leather equipment families stay separate from source footwear maintenance and operator care',()=>{
 const ids=['cutting-equipment','stitching-equipment','finishing-equipment','supplementary-equipment'].map(technician)
 cannotOmit(leather,ids)
 for(const id of ids)assert.equal(footwear.steps.some(step=>step.id===id),false)
 assert.match(nodes.get(technician('footwear-source-maintenance')).learning_design.understanding_check.expected_evidence.join(' '),/Routine care does not establish complete equipment maintenance/)
 assert.match(nodes.get(warehouse('equipment-maintenance-source')).learning_design.understanding_check.expected_evidence.join(' '),/Warehouse operator checks do not establish/)
})

test('periodic/phase observations, cumulative differences and equipment energy preserve missing-data and boundary limits',()=>{
 cannotOmit(leather,['monitor-reference','collection-trigger','collect-performance','requirement-comparison','monitor-cycle'].map(monitor))
 cannotOmit(leather,[meterDifferenceId,equipmentEnergyId])
 assert.match(nodes.get(monitor('collection-trigger')).learning_design.understanding_check.expected_evidence.join(' '),/does not establish the earlier observation/)
 assert.match(nodes.get(meterDifferenceId).learning_design.understanding_check.expected_evidence.join(' '),/not a valid complete interval/)
 assert.match(nodes.get(equipmentEnergyId).learning_design.understanding_check.expected_evidence.join(' '),/Individual machine consumption is not invented/)
 assert.match(nodes.get(technician('usage-energy-information')).learning_design.understanding_check.expected_evidence.join(' '),/maintenance cause is not invented/)
})

test('warehouse management and physical/WMS implementation require real controls and committed current state',()=>{
 cannotOmit(footwear,['order-control','stock-control','risk-controls','supply-chain-plan','management-cycle','company-conditions','layout-selection','layout-implementation','layout-cycle'].map(skill))
 assert.match(nodes.get(skill('risk-controls')).learning_design.understanding_check.expected_evidence.join(' '),/drawing does not establish the actual implemented control/)
 assert.match(nodes.get(skill('layout-implementation')).learning_design.understanding_check.expected_evidence.join(' '),/does not clear the actual committed WMS rule/)
 assert.match(nodes.get(skill('supply-chain-plan')).learning_design.understanding_check.expected_evidence.join(' '),/does not prove improved accepted service/)
})

test('pallet-jack and selected motorised operation retain separate actual loading/storage performance',()=>{
 cannotOmit(footwear,['equipment-reference','pallet-jack-method','motorised-method','equipment-cycle'].map(skill))
 assert.match(nodes.get(skill('motorised-method')).learning_design.understanding_check.expected_evidence.join(' '),/pallet-jack pass does not fill/)
 assert.match(nodes.get(skill('equipment-cycle')).learning_design.understanding_check.expected_evidence.join(' '),/storage outcome remains unverified/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(route=>route.id===footwear.id)
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==skill('motorised-method'))
 copy.steps=copy.steps.filter(step=>step.id!==skill('motorised-method'))
 assert.equal(row(draft,footwear).complete,false)
 assert.equal(row(draft,leather).complete,true)
})

test('both warehouse professions reuse timed eligible supply without making purchase proposals ready stock',()=>{
 const older=routeFor('leather goods warehouse operator')
 for(const route of [older,footwear])cannotOmit(route,[timedAvailabilityId])
 assert.equal(nodes.get('atlas:alu:profession-domain:leather-warehouse:timed-stock-cover').learning_design.focus.mode,'transfer')
 assert.match(nodes.get(timedAvailabilityId).learning_design.understanding_check.expected_evidence.join(' '),/shortfall is five F/)
 assert.match(nodes.get(warehouse('purchase-forecast')).learning_design.understanding_check.expected_evidence.join(' '),/rather than a promised delivery/)
 assert.match(nodes.get(warehouse('departmental-kits')).learning_design.understanding_check.expected_evidence.join(' '),/not handed over as current ready input/)
})

test('revised actual programme work invalidates dependent source/profession reviews without changing distribution',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===maintenance('programming')).learning_design.task+=' Verify the revised current approved active programme requirement.'
 const after=createReviewFingerprinter(draft)
 for(const route of [leather,footwear])assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/c5fdbd81-db10-4fc3-8cee-8b1a7169c472'
 assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('leaflet distributor');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
