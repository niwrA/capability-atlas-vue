import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preserveIndividualRevisions, replaceOwnedRecords } from '../scripts/authoring-records.mjs'
import { reconcileAuthoredRoutes } from '../scripts/reconcile-authored-routes.mjs'

test('comparison regeneration retains individually authored content without retaining ordinary sketches or inventing unrelated records',()=>{
 const current={id:'family:a',kind:'learning_unit',authoring_origin:'individual',definition:'Complete revised task',learning_design:{scope:'activity',task:'Observe the changed case'}}
 const ordinary={id:'family:b',definition:'Old ordinary sketch'},unrelated={id:'other:c',authoring_origin:'individual',definition:'Unrelated current lesson'}
 const oldProposal={id:'family:a',definition:'Earlier sketch'},newProposal={id:'family:b',definition:'Updated ordinary sketch'},newRecord={id:'family:d',definition:'New comparison sketch'}
 const generated=[oldProposal,newProposal,newRecord],existing=[current,ordinary,unrelated]
 const chosen=preserveIndividualRevisions(existing,generated)
 assert.equal(chosen[0],current)
 assert.equal(chosen[1],newProposal)
 assert.equal(chosen[2],newRecord)
 assert.equal(chosen.length,generated.length)
 assert.deepEqual(generated,[oldProposal,newProposal,newRecord])
 const result=replaceOwnedRecords(existing,chosen,node=>node.id.startsWith('family:'))
 assert.deepEqual(result.map(node=>node.id),['family:a','family:b','other:c','family:d'])
 assert.equal(result[0],current)
 assert.equal(result[2],unrelated)
 assert.equal(JSON.stringify(replaceOwnedRecords(result,preserveIndividualRevisions(result,generated),node=>node.id.startsWith('family:'))),JSON.stringify(result))
})

test('a shared authored activity used only by an older context follows current canonical inputs and retains earlier assumptions on that context',()=>{
 const start={id:'start',kind:'learning_unit'},old={id:'old',kind:'learning_unit'},updated={id:'updated',kind:'learning_unit',authoring_origin:'individual'},core={id:'core',kind:'learning_unit',authoring_origin:'individual'},part={id:'part',kind:'learning_unit',authoring_origin:'individual'},context={id:'context',kind:'learning_unit'}
 const legacyContext={id:'legacy-context',kind:'learning_unit'}
 const route={id:'route',occupation_id:'role',end_ids:['role'],demonstrations:{skill:'context','legacy-skill':'legacy-context'},steps:[
  {id:'role',stage:'work',mode:'gate',requires:['skill','legacy-skill']},
  {id:'skill',stage:'work',mode:'gate',requires:['context']},
  {id:'legacy-skill',stage:'work',mode:'gate',requires:['legacy-context'],gap:'Unreviewed legacy source'},
  {id:'context',stage:'work',mode:'activity',requires:['start']},
  {id:'legacy-context',stage:'work',mode:'activity',requires:['core']},
  {id:'core',stage:'shared',mode:'activity',requires:['old']},
  {id:'old',stage:'shared',mode:'activity',requires:['start']},
  {id:'start',stage:'early',mode:'activity',requires:[]},
 ]}
 const dataset={roles:[{id:'role',kind:'role'}],capabilities:[{id:'skill',kind:'skill'},{id:'legacy-skill',kind:'skill'}],learning_units:[start,old,updated,core,part,context,legacyContext],starting_foundations:{entries:[{id:'start'}]},pathway_exploration:{routes:[route]},decompositions:[
  {from:'skill',to:'part',type:'decomposes_into'},
  {from:'start',to:'part',type:'prerequisite_for'},
  {from:'updated',to:'core',type:'prerequisite_for'},
  {from:'start',to:'updated',type:'prerequisite_for'},
 ]}
 reconcileAuthoredRoutes(dataset)
 const steps=new Map(route.steps.map(step=>[step.id,step]))
 assert.deepEqual(steps.get('core').requires,['updated'])
 assert.deepEqual(steps.get('updated').requires,['start'])
 assert.ok(steps.get('legacy-context').requires.includes('core'))
 assert.ok(steps.get('legacy-context').requires.includes('old'))
 assert.ok(steps.get('skill').requires.includes('part'))
 assert.equal(steps.get('legacy-skill').gap,'Unreviewed legacy source')
 assert.ok(steps.get('old'))
 const before=JSON.stringify(route)
 reconcileAuthoredRoutes(dataset)
 assert.equal(JSON.stringify(route),before)
})
