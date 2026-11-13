import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorProfessionActivity } from '../scripts/profession-authoring.mjs'

const spec={id:'atlas:test:authored',label:'Check a labelled training record',concept:'A recorded observation stays attached to its actual identifier.',parents:[['atlas:test:input','Use the supplied accessible identifier reference.']],input:'Record A says blue; record B says red; a labelled blue prop belongs to A.',task:'Attach the observed blue prop result to A and keep B unchanged.',outputs:['Attaches the blue result to A','Keeps the other record unchanged'],variation:{change:'The replacement prop belongs to B.',materials:'A labelled B prop with a red observation.',prompt:'Update the correct record.',evidence:['B receives the red observation and A stays unchanged.']},difficulty:['Updating the nearest visible row.','Match the actual identifier before recording.'],minutes:[5,10,15,45,2,5],supporting_sources:[{title:'Applicable record reference',url:'https://example.com/record-reference'}]}

test('repeat activity authoring with source links preserves exact serialisation and owned edges',()=>{
 const dataset={learning_units:[],decompositions:[]}
 authorProfessionActivity(dataset,spec)
 const before=JSON.stringify(dataset)
 authorProfessionActivity(dataset,spec)
 assert.equal(JSON.stringify(dataset),before)
})

test('new reuse metadata does not become invented history when a legacy record lacked it',()=>{
 const dataset={learning_units:[{id:spec.id,label:'Earlier lesson',definition:'Earlier content',source:'Earlier draft',source_version:'0'}],decompositions:[]}
 authorProfessionActivity(dataset,spec)
 const before=JSON.stringify(dataset),history=structuredClone(dataset.learning_units[0].previous_authored_draft)
 assert.equal(history.reusability,undefined)
 authorProfessionActivity(dataset,spec)
 assert.deepEqual(dataset.learning_units[0].previous_authored_draft,history)
 assert.equal(JSON.stringify(dataset),before)
})
