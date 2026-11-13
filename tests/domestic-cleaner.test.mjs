import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDataset} from '../scripts/atlas-data.mjs'
import {domesticCleanerId as domestic} from '../scripts/profession-domestic-cleaner.mjs'
import {auditProfessions} from '../src/profession-audit.js'
import {evaluatePilot} from '../src/pilot-model.js'
import {assessLearningDesign} from '../src/learning-design.js'
import {createReviewFingerprinter} from '../scripts/review-model.mjs'

const dataset=await readDataset(),nodes=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
const role=dataset.roles.find(node=>node.source==='ESCO'&&node.label==='domestic cleaner')
const route=dataset.profession_pathways.routes.find(route=>route.occupation_id===role.id)
const changed=(id,change)=>({...dataset,learning_units:dataset.learning_units.map(node=>node.id===id?change(structuredClone(node)):node)})

test('domestic cleaner retains all twenty exact essentials, every house-description clause and nine complete contextual methods',()=>{
 const result=auditProfessions(dataset).rows.find(row=>row.id===role.id)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 assert.equal(route.skill_coverage.length,20)
 assert.equal(route.occupation_outcomes.length,9)
 const required=dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&edge.type==='esco_essential').map(edge=>edge.to).sort()
 assert.deepEqual(route.skill_coverage.map(mapping=>mapping.skill_id).sort(),required)
 for(const facet of route.occupation_facets)assert.ok(role.definition.includes(facet.source_fragment),facet.source_fragment)
 for(const id of route.occupation_outcomes){assert.equal(assessLearningDesign(nodes.get(id)).status,'draft_ready',id);assert.equal(nodes.get(id).learning_design.effort.observed,false)}
})

test('every full domestic context stays required and missing actual equipment/material disinfection blocks the whole profession',()=>{
 const actual=route.steps.map(step=>nodes.get(step.id)),done=new Set(actual.map(node=>node.id))
 assert.equal(evaluatePilot(route,actual,done).complete,true)
 for(const id of route.occupation_outcomes){const partial=new Set(done);assert.ok(partial.delete(id));assert.equal(evaluatePilot(route,actual,partial).complete,false,id)}
 const broken=changed(domestic('equipment-material-disinfection'),node=>({...node,learning_design:undefined}))
 assert.equal(auditProfessions(broken).rows.find(row=>row.id===role.id).complete,false)
})

test('actual house-disinfection revisions invalidate domestic review while independent postal and shelf-filler contexts stay stable',()=>{
 const before=createReviewFingerprinter(dataset),after=createReviewFingerprinter(changed(domestic('equipment-material-disinfection'),node=>({...node,learning_design:{...node.learning_design,task:node.learning_design.task+' Verify the complete newly qualified actual article process.'}})))
 assert.notEqual(before(role.id,'occupation_pathway'),after(role.id,'occupation_pathway'))
 for(const label of ['postman/postwoman','shelf filler']){const other=dataset.roles.find(node=>node.source==='ESCO'&&node.label===label);assert.equal(before(other.id,'occupation_pathway'),after(other.id,'occupation_pathway'),label)}
})
