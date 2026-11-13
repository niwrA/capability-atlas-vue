import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { dataKnowledgeId as data } from '../scripts/profession-data-knowledge.mjs'
import { rdfQueryId as rdf } from '../scripts/profession-rdf-query-knowledge.mjs'
import { dataAnalysisId as analysis } from '../scripts/profession-data-analysis.mjs'
import { dataSecurityId as secure } from '../scripts/profession-data-security.mjs'
import { dataEntryMethodId as entry } from '../scripts/profession-data-entry-methods.mjs'
import { wordProcessingId as word } from '../scripts/profession-word-processing.mjs'
import { dataEntryClerkId as clerk } from '../scripts/profession-data-entry-clerk.mjs'
const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const routeFor=label=>dataset.profession_pathways.routes.find(route=>nodes.get(route.occupation_id)?.label===label)
const route=routeFor('data entry clerk'),design=id=>nodes.get(id).learning_design
const evidence=id=>design(id).understanding_check.expected_evidence.join(' ')
const row=(draft,actual)=>auditProfessions(draft).rows.find(row=>row.id===actual.occupation_id)
function cannotOmit(ids){const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id));assert.equal(evaluatePilot(route,actual,done).complete,true);for(const id of ids){assert.ok(done.has(id),id);const partial=new Set(done);partial.delete(id);assert.equal(evaluatePilot(route,actual,partial).complete,false,nodes.get(id).label)}}

test('data entry clerk covers all ten essentials and complete source preparation/verification/current-information outcomes',()=>{
 const actual=row(dataset,route);assert.equal(actual.complete,true);assert.equal(actual.essentials,10)
 cannotOmit(['brief','database-query-knowledge','source-preparation','source-deficiency-review','entry-verification','information-maintenance','statistical-work','written-records','operating-interval'].map(clerk))
})

test('documentation knowledge retains internal/external characteristics, product life cycle and specific contents',()=>{
 cannotOmit(['document-reference','document-life-cycle','document-content-types','documentation-cycle'].map(data))
 assert.match(evidence(data('document-reference')),/shared file extension does not establish the same document type/)
 assert.match(evidence(data('document-life-cycle')),/earlier draft does not establish current issued product guidance/)
 assert.match(evidence(data('document-content-types')),/title\/template does not establish the required actual content/)
})

test('database classification preserves XML/document/full-text examples, actual structure and overlapping capabilities',()=>{
 cannotOmit(['database-reference','database-models','xml-database','document-database','fulltext-database','database-cycle'].map(data))
 assert.match(evidence(data('database-models')),/need not be exclusive categories/)
 assert.match(evidence(data('xml-database')),/Matching text does not establish the same actual XML path\/field/)
 assert.match(evidence(data('document-database')),/Matching names do not establish the same actual document\/value/)
 assert.match(evidence(data('fulltext-database')),/search hit does not establish complete current source content/)
})

test('standard query knowledge keeps actual SQL/database and XML/full-text document retrieval results distinct',()=>{
 cannotOmit(['query-reference','query-conditions','sql-query-meaning','document-query-meaning','query-cycle'].map(data))
 assert.match(evidence(data('sql-query-meaning')),/Successful execution does not establish the intended actual information retrieval/)
 assert.match(evidence(data('document-query-meaning')),/matching word does not establish the intended actual path\/current document/)
})

test('RDF/SPARQL knowledge requires term roles, actual shared bindings, scoped retrieval and manipulation',()=>{
 cannotOmit(['rdf-reference','rdf-terms','rdf-pattern-binding','rdf-shared-pattern','sparql-query-meaning','sparql-update-meaning','rdf-query-cycle'].map(rdf))
 assert.match(evidence(rdf('rdf-reference')),/shared label does not establish the same actual RDF resource/)
 assert.match(evidence(rdf('rdf-shared-pattern')),/Individually true statements do not establish a shared actual joined binding/)
 assert.match(evidence(rdf('sparql-update-meaning')),/success response does not establish the intended actual RDF change/)
 assert.match(design(rdf('sparql-update-meaning')).input,/no public endpoint or real account is altered/)
})

test('statistical analysis includes actual descriptive models/data mining and full correlation/forecast ICT branches',()=>{
 cannotOmit(['analysis-reference','paired-data','descriptive-analysis','pattern-mining','correlation-meaning','correlation-tool','time-series-identity','trend-model-meaning','trend-tool','analysis-cycle'].map(analysis))
 assert.match(design(analysis('analysis-reference')).input,/selected source path uses descriptive statistical models and data-mining techniques/)
 assert.match(evidence(analysis('pattern-mining')),/larger-looking rule score does not establish the actual specified pattern frequency/)
 assert.match(evidence(analysis('analysis-cycle')),/valid summary does not establish the missing actual source technique/)
})

test('paired correlations preserve true event identity and nonlinear/undefined/causal limits',()=>{
 assert.match(evidence(analysis('paired-data')),/plausible columns do not establish actual eligible paired observations/)
 assert.match(evidence(analysis('correlation-meaning')),/Near-zero linear correlation does not prove absence of every relationship/)
 assert.match(evidence(analysis('correlation-tool')),/strong coefficient does not establish valid actual intended association/)
})

test('actual forecasts keep historical cutoff, independent later truth, baseline tie and unquantified uncertainty honest',()=>{
 assert.match(evidence(analysis('time-series-identity')),/later observed value is not information available at the earlier forecast time/)
 assert.match(evidence(analysis('trend-model-meaning')),/good historical fit does not establish the changed future regime/)
 assert.match(evidence(analysis('trend-tool')),/perfect-looking leaked result does not establish valid actual forecasting/)
 assert.match(design(analysis('trend-tool')).input,/Trend forecast 8 and baseline 6 each differ by one/)
 assert.match(design(analysis('trend-model-meaning')).input,/unavailable uncertainty bound is stated unavailable/)
})

test('information security requires all actual confidentiality/integrity/availability controls and complete current results',()=>{
 cannotOmit(['security-reference','confidentiality-actions','integrity-actions','availability-actions','security-cycle'].map(secure))
 assert.match(evidence(secure('confidentiality-actions')),/Technical access\/send capability does not establish actual current authority/)
 assert.match(evidence(secure('integrity-actions')),/accepted intended update does not establish complete actual data integrity/)
 assert.match(evidence(secure('availability-actions')),/Backup\/restore success notice does not establish actual required usable secure information/)
})

test('entry requirements need actually upheld current conditions and applied program validation/read-back methods',()=>{
 cannotOmit(['entry-reference','entry-condition-check','entry-program-technique','requirements-cycle'].map(entry))
 assert.match(evidence(entry('entry-condition-check')),/Earlier readiness does not establish current actual entry conditions/)
 assert.match(evidence(entry('entry-program-technique')),/Accepted input does not establish the intended actual stored record/)
})

test('scan and manual key input require every actual original/captured/stored field rather than OCR or plausible guesses',()=>{
 cannotOmit(['processing-reference','scan-entry','manual-entry'].map(entry))
 assert.match(evidence(entry('scan-entry')),/Scan completion does not establish correct actual entered source information/)
 assert.match(evidence(entry('manual-entry')),/Plausibility does not establish faithful actual source entry/)
})

test('electronic entry processes an actual bounded large batch with field mappings and once-only retry accounting',()=>{
 cannotOmit(['electronic-entry','processing-cycle'].map(entry))
 assert.match(design(entry('electronic-entry')).input,/1,000 harmless fictional identified records/)
 assert.match(evidence(entry('electronic-entry')),/Import completion\/count does not establish correct once-only actual data transfer/)
})

test('cleansing detects true corrupt records, corrects only supported fields and maintains structure after new inputs',()=>{
 cannotOmit(['cleansing-reference','corrupt-record-detection','corrupt-record-correction','structured-data-maintenance','cleansing-cycle'].map(entry))
 assert.match(evidence(entry('cleansing-reference')),/Rarity or matching names do not establish actual corruption/)
 assert.match(evidence(entry('corrupt-record-correction')),/fixed-looking defect does not establish complete authorised actual correction/)
 assert.match(evidence(entry('structured-data-maintenance')),/old clean pass does not establish current maintained data structure/)
})

test('source preparation/deficiencies and complete entered-record verification cannot be replaced by matching counts or samples',()=>{
 cannotOmit([entry('batch-entry-verification')])
 assert.match(evidence(clerk('source-preparation')),/Sorted appearance does not establish complete correctly associated actual sources/)
 assert.match(evidence(clerk('source-deficiency-review')),/Program acceptance does not establish actual complete authoritative source data/)
 assert.match(evidence(entry('batch-entry-verification')),/Matching totals or a passing sample do not establish every actual required record/)
 assert.match(evidence(clerk('information-maintenance')),/current-looking display does not establish actual maintained\/retrieved information/)
})

test('word processing requires actual composed meaning, preserved editing/formatting and real complete print output',()=>{
 cannotOmit(['word-reference','written-composition','written-edit-format','written-print','word-cycle'].map(word))
 assert.match(evidence(word('written-composition')),/Typed text does not establish the actual required written meaning/)
 assert.match(evidence(word('written-edit-format')),/Good formatting does not establish correct actual written content/)
 assert.match(evidence(word('written-print')),/Preview or a sent print job does not establish complete actual intended output/)
})

test('practice-only forecast work cannot complete the occupation while unrelated receptionist remains complete',()=>{
 const draft=structuredClone(dataset);draft.learning_units.find(node=>node.id===analysis('trend-tool')).learning_design.scope='practice_sequence'
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('receptionist')).complete,true)
})

test('canonical actual forecast cannot be omitted even when every remaining source/route gate is marked',()=>{
 const draft=structuredClone(dataset),copy=draft.profession_pathways.routes.find(r=>r.id===route.id),missing=analysis('trend-tool')
 for(const step of copy.steps)step.requires=step.requires.filter(id=>id!==missing)
 copy.steps=copy.steps.filter(step=>step.id!==missing)
 assert.equal(row(draft,route).complete,false)
 assert.equal(row(draft,routeFor('receptionist')).complete,true)
})

test('actual source-deficiency revision invalidates its own occupation without changing reception work',()=>{
 const before=createReviewFingerprinter(dataset),draft=structuredClone(dataset)
 draft.learning_units.find(node=>node.id===clerk('source-deficiency-review')).learning_design.task+=' Recheck the actual original source identity and unresolved field.'
 const after=createReviewFingerprinter(draft)
 assert.notEqual(before(route.occupation_id,'occupation_pathway'),after(route.occupation_id,'occupation_pathway'))
 const unrelated=routeFor('receptionist');assert.equal(before(unrelated.occupation_id,'occupation_pathway'),after(unrelated.occupation_id,'occupation_pathway'))
})
