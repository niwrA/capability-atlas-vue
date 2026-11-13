import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { textileCareKnowledgeId as knowledge } from '../scripts/profession-textile-care-knowledge.mjs'
import { textileCleaningMethodId as method } from '../scripts/profession-textile-cleaning-methods.mjs'
import { cleaningCareServiceId as care } from '../scripts/profession-cleaning-care-services.mjs'
import { draperyCarpetCleanerId as drapery } from '../scripts/profession-drapery-carpet-cleaner.mjs'
import { furnitureMethodId as furniture } from '../scripts/profession-furniture-methods.mjs'
import { trainCleaningId as train } from '../scripts/profession-train-cleaning.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('drapery and carpet cleaner'),furnitureRoute=routeFor('furniture cleaner'),trainRoute=routeFor('train cleaner')
const design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(actualRoute,ids){const actual=actualRoute.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(actualRoute,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(actualRoute,actual,partial).complete,false,nodes.get(id).label)}}

test('drapery/carpet route covers all eighteen source essentials and every actual occupation outcome',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,18)
 cannotOmit(route,['brief','dust-vacuum','stain-solvent','groom-rug','rinse-dry','drapery-cleaning','repellent-treatment','floor-machines','equipment-care','client-service','operating-interval'].map(drapery))
})

test('carpet and brush knowledge retains every source criterion without inferring compatibility from appearance or price',()=>{
 cannotOmit(route,['carpet-reference','backing-fitting','carpet-comparison','carpet-knowledge-cycle','brush-reference','brush-shapes','brush-knowledge-cycle'].map(knowledge))
 assert.match(evidence(knowledge('backing-fitting')),/Known fibre does not establish backing\/fitting compatibility/)
 assert.match(evidence(knowledge('carpet-comparison')),/Unequal included services are not treated as equal total costs/)
 assert.match(design(knowledge('carpet-comparison')).input,/figures are not current market prices/)
 assert.match(evidence(knowledge('brush-shapes')),/Reach does not establish material compatibility/)
})

test('stain nature, structure, garment detection and actual dye-fastness remain separate required evidence',()=>{
 cannotOmit(route,['stain-reference','stain-structure','dye-fastness','stain-knowledge-cycle'].map(knowledge))
 cannotOmit(route,['stain-inspection','stain-equipment-setup','stain-equipment-operation','stain-removal-cycle'].map(method))
 assert.match(evidence(knowledge('stain-structure')),/does not establish complete compound-stain removal/)
 assert.match(evidence(knowledge('dye-fastness')),/label does not override the actual textile\/process failure/)
 assert.match(evidence(method('stain-inspection')),/Visible wetness\/dryness alone does not establish the source method class/)
 assert.match(evidence(method('stain-removal-cycle')),/does not establish the missing garment detection/)
 assert.match(evidence(method('stain-equipment-operation')),/does not establish damage-free fabric/)
})

test('personal hygiene and solvent use require actual implemented conditions and real compatible treatment',()=>{
 cannotOmit(route,['hygiene-reference','personal-hygiene-method','personal-hygiene-cycle','solvent-reference','solvent-controls','solvent-method','solvent-cycle'].map(care))
 assert.match(evidence(care('personal-hygiene-method')),/Presence does not establish required actual protection/)
 assert.match(evidence(care('solvent-reference')),/does not establish material-safe cleaning/)
 assert.match(evidence(care('solvent-controls')),/does not establish required implemented exposure control/)
 assert.match(evidence(care('solvent-method')),/does not override the actual material\/residue failure/)
})

test('captured-versus-moved foundation is shared without replacing actual furniture/train/textile dusting',()=>{
 for(const actual of [route,furnitureRoute,trainRoute])cannotOmit(actual,[care('capture-material')])
 cannotOmit(route,['dust-surface-reference','dust-collection-method','dust-surface-cycle','vacuum-surface-reference','vacuum-textile-method','vacuum-surface-cycle'].map(care))
 cannotOmit(furnitureRoute,[furniture('dust-removal')]);cannotOmit(trainRoute,[train('train-dusting')])
 assert.match(evidence(care('capture-material')),/Clear target alone does not establish collection/)
 assert.match(design(care('capture-material')).input,/this model does not establish real dust-exposure/)
 assert.match(evidence(care('vacuum-surface-cycle')),/do not establish drape performance/)
})

test('rug grooming requires supported knot direction and separately compatible fringe/spot/odour treatment',()=>{
 cannotOmit(route,['groom-reference','nap-grooming','fringe-treatment','rug-spot-odour','groom-cycle'].map(method))
 assert.match(evidence(method('groom-reference')),/Knot direction is not invented/)
 assert.match(evidence(method('fringe-treatment')),/Non-chlorine wording does not establish actual fibre\/dye compatibility/)
 assert.match(design(method('fringe-treatment')).task,/not.*requirement to combine|Distinguish the separate contrasting product cases/)
 assert.match(evidence(method('rug-spot-odour')),/Added fragrance does not establish actual odour removal/)
})

test('centrifuge setup, real operation, clarified unwind and actual hanging/final drying cannot be skipped',()=>{
 cannotOmit(route,['centrifuge-reference','centrifuge-setup','centrifuge-operation','unwind-hang-dry','centrifuge-cycle'].map(method))
 assert.match(design(method('centrifuge-reference')).input,/source unwinds\/spins\/dries wording is preserved/)
 assert.match(evidence(method('centrifuge-reference')),/stop indication alone does not establish permitted actual rotor access/)
 assert.match(evidence(method('unwind-hang-dry')),/Majority-water extraction does not establish final dry readiness/)
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=method('unwind-hang-dry')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,furnitureRoute).complete,true)
})

test('hose rinsing and actual drapery/repellent methods need their own full preserved results',()=>{
 cannotOmit(route,['hose-reference','hose-rinsing','hose-rinse-cycle'].map(method))
 assert.match(evidence(method('hose-rinse-cycle')),/Extraction does not establish actual hose-rinsing performance/)
 assert.match(evidence(drapery('drapery-cleaning')),/Improved appearance does not override/)
 assert.match(evidence(drapery('repellent-treatment')),/Application alone does not establish/)
 assert.match(design(drapery('repellent-treatment')).input,/do not grant insecticide\/biocide/)
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===drapery('repellent-treatment')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,furnitureRoute).complete,true)
})

test('satisfaction retains confirmed anticipated needs, feasible options and actual response/loyalty evidence',()=>{
 cannotOmit(route,['customer-expectations','flexible-service','satisfaction-evidence','satisfaction-cycle'].map(care))
 assert.match(evidence(care('customer-expectations')),/not imposed as the actual customer preference/)
 assert.match(evidence(care('flexible-service')),/does not establish feasible compatible service/)
 assert.match(evidence(care('satisfaction-evidence')),/does not invent customer satisfaction or loyalty/)
})

test('shared capture revisions invalidate dependent cleaning reviews while leaving linen work unchanged',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===care('capture-material')).learning_design.task+=' Recheck the actual collection destination.'
 const after=createReviewFingerprinter(draft)
 for(const actual of [route,furnitureRoute,trainRoute])assert.notEqual(before(actual.occupation_id,'occupation_pathway'),after(actual.occupation_id,'occupation_pathway'))
 const source='http://data.europa.eu/esco/skill/329d7233-7231-4082-8ca4-0b5e295785aa';assert.notEqual(before(source,'skill_breakdown'),after(source,'skill_breakdown'))
 const unrelated=routeFor('linen room attendant');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
