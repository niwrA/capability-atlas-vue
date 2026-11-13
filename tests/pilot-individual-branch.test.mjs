import { test } from 'node:test'
import assert from 'node:assert/strict'
import { individualPilotBranch } from '../scripts/pilot-individual-branch.mjs'
import { preserveIndividualRevisions,replaceOwnedRecords } from '../scripts/authoring-records.mjs'

function fixture(){
 const start={id:'start',kind:'learning_unit'},reference={id:'pilot:reference',kind:'learning_unit',authoring_origin:'individual',learning_design:{task:'Complete exact current reference task'}},method={id:'method',kind:'learning_unit',authoring_origin:'individual'},cycle={id:'cycle',kind:'learning_unit',authoring_origin:'individual'},source={id:'source',kind:'skill'},optional={id:'orientation',kind:'learning_unit'}
 return {capabilities:[source],learning_units:[start,reference,method,cycle,optional],starting_foundations:{entries:[{id:start.id}]},pilot_pathway:{steps:[{id:'start',stage:'early'},{id:'pilot:reference',stage:'work'}]},decompositions:[
  {type:'decomposes_into',from:'source',to:reference.id},{type:'decomposes_into',from:'source',to:method.id},{type:'decomposes_into',from:'source',to:cycle.id},{type:'decomposes_into',from:'source',to:optional.id,completion_requirement:'optional'},
  {type:'prerequisite_for',from:start.id,to:reference.id},{type:'prerequisite_for',from:reference.id,to:method.id},{type:'prerequisite_for',from:method.id,to:cycle.id},
 ]}
}

test('a precise pilot demonstration that is also the canonical reference keeps actual inputs without self-dependency',()=>{
 const dataset=fixture(),result=individualPilotBranch(dataset,'source','pilot:reference','work')
 assert.equal(result.demonstration,dataset.learning_units[1])
 const steps=new Map(result.steps.map(step=>[step.id,step]))
 assert.deepEqual(steps.get('pilot:reference').requires,['start'])
 assert.deepEqual(steps.get('method').requires,['pilot:reference'])
 assert.deepEqual(steps.get('cycle').requires,['method'])
 assert.deepEqual(steps.get('source').requires,['pilot:reference','method','cycle'])
 assert.equal(steps.has('orientation'),false)
 assert.equal(steps.get('start').stage,'early')
 assert.equal(steps.get('source').mode,'gate')
})

test('separate individually authored context remains required along with all canonical source components',()=>{
 const dataset=fixture()
 dataset.learning_units.push({id:'pilot:context',kind:'learning_unit',authoring_origin:'individual'})
 dataset.decompositions.push({type:'prerequisite_for',from:'cycle',to:'pilot:context'})
 const result=individualPilotBranch(dataset,'source','pilot:context','work'),steps=new Map(result.steps.map(step=>[step.id,step]))
 assert.deepEqual(steps.get('pilot:context').requires,['cycle'])
 assert.deepEqual(steps.get('source').requires,['pilot:reference','method','cycle','pilot:context'])
 assert.ok(result.steps.findIndex(step=>step.id==='cycle')<result.steps.findIndex(step=>step.id==='pilot:context'))
})

test('missing canonical inputs and actual context/source cycles fail rather than becoming unconstrained activities',()=>{
 const missing=fixture();missing.learning_units=missing.learning_units.filter(node=>node.id!=='method')
 assert.throws(()=>individualPilotBranch(missing,'source','pilot:reference','work'),/Missing individual pilot branch input: method/)
 const cyclic=fixture();cyclic.decompositions.push({type:'prerequisite_for',from:'source',to:'pilot:reference'})
 assert.throws(()=>individualPilotBranch(cyclic,'source','pilot:reference','work'),/Individual pilot branch cycle/)
})

test('ordinary templates retain their existing path and owned replacement preserves individual content in its existing position',()=>{
 const dataset=fixture();dataset.learning_units[1].authoring_origin='generated'
 assert.equal(individualPilotBranch(dataset,'source','pilot:reference','work'),null)
 dataset.learning_units[1].authoring_origin='individual'
 const current=dataset.learning_units[1],generated=[{id:current.id,definition:'Earlier generic orientation'}]
 const replaced=replaceOwnedRecords(dataset.learning_units,preserveIndividualRevisions(dataset.learning_units,generated),node=>node.id.startsWith('pilot:'))
 assert.equal(replaced[1],current)
 assert.equal(replaced[1].learning_design.task,'Complete exact current reference task')
 assert.deepEqual(replaced.filter(node=>!node.id.startsWith('pilot:')),dataset.learning_units.filter(node=>!node.id.startsWith('pilot:')))
})
