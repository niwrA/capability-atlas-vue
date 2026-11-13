import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'

const source={
 roles:[{id:'role:a',label:'A'},{id:'role:b',label:'B'},{id:'role:unrouted',label:'Unrouted'}],
 capabilities:[{id:'skill:shared',label:'Shared skill'}],
 learning_units:['canonical','context:a','context:b'].map(id=>({id,kind:'learning_unit',label:id,definition:'Original '+id})),
 role_capability_assertions:['role:a','role:b','role:unrouted'].map(from=>({from,to:'skill:shared',type:'esco_essential'})),
 decompositions:[{from:'skill:shared',to:'canonical',type:'decomposes_into'}],
 starting_foundations:{entries:[]},
 profession_pathways:{routes:['a','b'].map(key=>({
  id:'route:'+key,occupation_id:'role:'+key,end_ids:['role:'+key],version:1,scope:'Original scope '+key,
  semantics:'All inputs required',access:'Original access',source_definition:key,
  steps:[{id:'role:'+key,requires:['skill:shared']},{id:'skill:shared',requires:['canonical','context:'+key]},{id:'canonical',requires:[]},{id:'context:'+key,requires:[]}],
  occupation_outcomes:['context:'+key],occupation_facets:[{source_fragment:key,activity_ids:['context:'+key]}],
  skill_coverage:[{skill_id:'skill:shared',activity_ids:['canonical'],facets:[{source_fragment:'Shared',activity_ids:['canonical']}]}],
 }))},
}

test('occupational reviews follow only their own demonstrations while a shared skill review retains all contexts',()=>{
 const before=createReviewFingerprinter(source),changed=structuredClone(source)
 changed.learning_units.find(node=>node.id==='context:b').definition='Changed actual B method'
 const after=createReviewFingerprinter(changed)
 assert.equal(before('role:a','occupation_pathway'),after('role:a','occupation_pathway'))
 assert.notEqual(before('role:b','occupation_pathway'),after('role:b','occupation_pathway'))
 assert.notEqual(before('skill:shared','skill_breakdown'),after('skill:shared','skill_breakdown'))
 assert.equal(before('role:unrouted','occupation_pathway'),after('role:unrouted','occupation_pathway'),'No authored route does not imply all other occupations\' contexts')
})

test('canonical shared-content changes still invalidate every dependent occupation and skill review',()=>{
 const before=createReviewFingerprinter(source),changed=structuredClone(source)
 changed.learning_units.find(node=>node.id==='canonical').definition='Changed canonical content'
 const after=createReviewFingerprinter(changed)
 for(const role of source.roles)assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 assert.notEqual(before('skill:shared','skill_breakdown'),after('skill:shared','skill_breakdown'))
})

test('route policy, source mappings and declared input edits affect their own occupation without leaking to another route',()=>{
 const before=createReviewFingerprinter(source)
 for(const change of [
  route=>{route.scope='Changed B policy'},
  route=>{route.skill_coverage[0].facets[0].source_fragment='Changed B mapping'},
  route=>{route.steps.find(step=>step.id==='skill:shared').requires.pop()},
 ]){
  const changed=structuredClone(source);change(changed.profession_pathways.routes[1]);const after=createReviewFingerprinter(changed)
  assert.equal(before('role:a','occupation_pathway'),after('role:a','occupation_pathway'))
  assert.notEqual(before('role:b','occupation_pathway'),after('role:b','occupation_pathway'))
  assert.notEqual(before('skill:shared','skill_breakdown'),after('skill:shared','skill_breakdown'))
 }
})
