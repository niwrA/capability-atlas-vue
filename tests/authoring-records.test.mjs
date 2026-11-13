import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replaceOwnedRecords } from '../scripts/authoring-records.mjs'
import { readDataset } from '../scripts/atlas-data.mjs'
import { applyQuantityPractice } from '../scripts/quantity-practice.mjs'
import { applyCapabilityBreakdowns } from '../scripts/capability-breakdowns.mjs'

test('rebuilding an older content family preserves new records and immutable chunk positions',()=>{
 const owns=node=>node.id.startsWith('family:'),first={id:'official:1'},newer={id:'new-profession:1',content:'Keep this new family unchanged'}
 const records=[first,{id:'family:a',content:'old'},{id:'family:retired'},newer,{id:'family:b',content:'unchanged'}]
 const authored=[{id:'family:a',content:'revised'},{id:'family:b',content:'unchanged'},{id:'family:new',content:'new'}]
 const result=replaceOwnedRecords(records,authored,owns)
 assert.deepEqual(result.map(node=>node.id),['official:1','family:a','new-profession:1','family:b','family:new'])
 assert.equal(result[0],first)
 assert.equal(result[2],newer)
 assert.equal(result[1].content,'revised')
 assert.equal(records[1].content,'old')
 assert.equal(JSON.stringify(replaceOwnedRecords(result,authored,owns)),JSON.stringify(result))
})

test('authored duplicates and replacements outside ownership cannot be silently dropped or overwrite other families',()=>{
 const owns=node=>node.id.startsWith('family:')
 assert.throws(()=>replaceOwnedRecords([],[{id:'family:a'},{id:'family:a'}],owns),/Duplicate authored record/)
 assert.throws(()=>replaceOwnedRecords([{id:'other:a'}],[{id:'other:a'}],owns),/outside generator ownership/)
})

test('quantity and source-breakdown generators keep newly added profession records and existing positions',async()=>{
 const dataset=await readDataset(),newer={id:'atlas:test:new-family',label:'New unrelated content'}
 dataset.learning_units.push(newer)
 const before=dataset.learning_units.map(node=>node.id)
 applyCapabilityBreakdowns(dataset)
 applyQuantityPractice(dataset)
 assert.deepEqual(dataset.learning_units.map(node=>node.id),before)
 assert.equal(dataset.learning_units.at(-1),newer)
})
