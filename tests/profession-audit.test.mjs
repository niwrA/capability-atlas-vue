import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readDataset, compileDataset } from '../scripts/atlas-data.mjs'
import { auditProfessions, compactProfessionCoverage } from '../src/profession-audit.js'
import { evaluatePilot } from '../src/pilot-model.js'
import { decodeIndex } from '../src/atlas-loader.js'
import { isGeneratedActivity } from '../src/catalogue-model.js'
import { createReviewFingerprinter } from '../scripts/review-model.mjs'
import { spawnSync } from 'node:child_process'
import { root } from '../scripts/atlas-data.mjs'

const dataset=await readDataset()
const route=dataset.profession_pathways.routes[0]
const target=route.occupation_id
const result=dataset=>auditProfessions(dataset).rows.find(row=>row.id===target)

test('100 distinct target professions are separate from counted complete authored routes',()=>{
  const report=auditProfessions(dataset)
  assert.deepEqual(report.errors,[])
  assert.equal(report.rows.length,100)
  assert.equal(new Set(report.rows.map(row=>row.id)).size,100)
  assert.ok(report.complete>=1)
  assert.equal(result(dataset).complete,true)
  assert.ok(report.rows.some(row=>row.status==='unworked'))
  assert.equal(route.source_definition,dataset.roles.find(node=>node.id===target).definition)
})

test('the command-line goal gate cannot pass before the required profession count is reached',()=>{
  const report=auditProfessions(dataset)
  const command=spawnSync(process.execPath,['scripts/audit-professions.mjs','--require-target'],{cwd:root,encoding:'utf8'})
  assert.equal(command.error,undefined)
  assert.equal(JSON.parse(command.stdout).complete,report.complete)
  assert.equal(command.status,report.errors.length===0&&report.complete>=report.target?0:1)
})

test('a complete manual-operator proposal includes source knowledge and actual occupational work outcomes',()=>{
  const row=result(dataset)
  assert.equal(row.essentials,4)
  assert.ok(row.activities>=40)
  assert.equal(route.occupation_outcomes.length,3)
  assert.ok(route.occupation_facets.some(facet=>facet.source_fragment.includes('prepare the joint')))
  assert.ok(route.occupation_facets.some(facet=>facet.source_fragment.includes('give shape')))
  const nodes=['roles','capabilities','learning_units'].flatMap(key=>dataset[key])
  assert.equal(evaluatePilot(route,nodes,new Set(dataset.learning_units.map(node=>node.id))).complete,true)
  for(const id of route.occupation_outcomes){
    const completed=dataset.learning_units.filter(node=>node.id!==id).map(node=>node.id)
    assert.equal(evaluatePilot(route,nodes,new Set(completed)).complete,false)
  }
})

test('every authored occupational activity is required even when all gates are manually marked',()=>{
  const records=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]).map(node=>[node.id,node]))
  const starts=new Set(dataset.starting_foundations.entries.map(entry=>entry.id))
  for(const route of dataset.profession_pathways.routes){
    assert.equal(auditProfessions(dataset).rows.find(row=>row.id===route.occupation_id).complete,true)
    const nodes=route.steps.map(step=>records.get(step.id))
    const all=new Set(nodes.map(node=>node.id))
    for(const node of nodes.filter(node=>node.kind==='learning_unit'&&!starts.has(node.id))){
      const completed=new Set(all);completed.delete(node.id)
      assert.equal(evaluatePilot(route,nodes,completed).complete,false,node.label)
    }
  }
})

test('CAD patternmaking includes actual geometry, constraint, nesting and allocation outcomes',()=>{
  const cad=dataset.profession_pathways.routes.find(route=>dataset.roles.find(node=>node.id===route.occupation_id)?.label==='leather goods CAD patternmaker')
  assert.ok(cad)
  const coverage=auditProfessions(dataset).rows.find(row=>row.id===cad.occupation_id)
  assert.equal(coverage.complete,true)
  assert.equal(coverage.essentials,6)
  assert.ok(coverage.activities>=65)
  assert.ok(cad.occupation_facets.some(facet=>facet.source_fragment.includes('nesting modules')))
  assert.ok(cad.occupation_facets.some(facet=>facet.source_fragment.includes('material consumption')))
  const area=dataset.learning_units.find(node=>node.id==='atlas:alu:profession-domain:leather-cad:area-unit')
  const consumption=dataset.learning_units.find(node=>node.id==='atlas:alu:profession-domain:leather-cad:consumption')
  assert.equal(area.learning_design.focus.mode,'introduce')
  assert.equal(consumption.learning_design.focus.mode,'introduce')
  assert.match(consumption.learning_design.input,/48 cm2 allocated/)
  assert.match(consumption.learning_design.input,/32 cm2 net/)
  assert.ok(consumption.learning_design.dependency_basis.some(item=>item.input_id===area.id))
})

test('generated scaffolds, missing criteria, unexplained dependencies and omitted work cannot inflate profession coverage',()=>{
  for(const change of [
    (d,r)=>{r.authoring_basis='generated_scaffold'},
    (d,r)=>{r.steps.find(step=>step.id===target).requires.pop()},
    (d,r)=>{delete d.learning_units.find(node=>node.id===r.occupation_outcomes[0]).learning_design},
    (d,r)=>{d.learning_units.find(node=>node.id===r.occupation_outcomes[0]).learning_design.scope='practice_sequence'},
    (d,r)=>{d.learning_units.find(node=>node.id===r.occupation_outcomes[0]).learning_design.dependency_basis=[]},
    (d,r)=>{r.occupation_facets=[]},
    (d,r)=>{r.skill_coverage[0].source_definition='An outdated definition'},
    (d,r)=>{r.steps.find(step=>step.id===r.occupation_outcomes[0]).mode='gate'},
  ]){
    const draft=structuredClone(dataset),copy=draft.profession_pathways.routes[0]
    change(draft,copy)
    assert.equal(result(draft).complete,false)
    assert.ok(result(draft).blockers.length)
  }
})

test('the strict audit catches a route that bypasses a required canonical component',()=>{
  const draft=structuredClone(dataset),copy=draft.profession_pathways.routes[0]
  const skill=copy.skill_coverage[0].skill_id
  const canonical=draft.decompositions.find(edge=>edge.from===skill&&edge.type==='decomposes_into'&&edge.completion_requirement!=='optional').to
  const step=copy.steps.find(step=>step.id===skill)
  step.requires=step.requires.filter(id=>id!==canonical)
  // Remove every other reference as well, so a direct child cannot hide behind
  // the contextual exercise or another activity's prerequisites.
  for(const input of copy.steps)input.requires=input.requires.filter(id=>id!==canonical)
  assert.equal(result(draft).complete,false)
  assert.ok(result(draft).blockers.some(blocker=>blocker.kind==='omitted_component'||blocker.kind==='omitted_prerequisite'))
})

test('compilation preserves profession navigation and coverage while activity criteria remain lazy',()=>{
  const {index}=compileDataset(dataset),compact=decodeIndex(index)
  assert.deepEqual(compact.profession_pathways,dataset.profession_pathways)
  assert.equal(compact.profession_coverage.complete,auditProfessions(dataset).complete)
  assert.equal(compact.profession_coverage.rows.length,100)
  assert.ok(compact.learning_units.every(node=>!node.learning_design))
  const rewritten=compact.learning_units.find(node=>node.id===route.skill_coverage[0].activity_ids[0])
  assert.equal(rewritten.authoring_origin,'individual')
  assert.equal(isGeneratedActivity(rewritten),false)
})

test('profession source mappings and supported starting assumptions participate in pathway review fingerprints',()=>{
  const before=createReviewFingerprinter(dataset)(target,'occupation_pathway')
  for(const change of [
    d=>{d.profession_pathways.routes[0].occupation_facets[0].source_fragment+=' revised'},
    d=>{d.profession_pathways.routes[0].skill_coverage[0].facets[0].source_fragment+=' revised'},
    d=>{d.starting_foundations.entries[0].support+=' Changed support assumption.'},
  ]){const draft=structuredClone(dataset);change(draft);assert.notEqual(createReviewFingerprinter(draft)(target,'occupation_pathway'),before)}
})

test('compact campaign diagnostics retain exact gap counts without changing completeness',()=>{
  const full=auditProfessions(dataset),small=compactProfessionCoverage(full)
  assert.equal(small.complete,full.complete)
  for(const row of small.rows){
    const original=full.rows.find(item=>item.id===row.id)
    assert.equal(row.complete,original.complete)
    assert.equal(row.blocker_count,original.blockers.length)
    assert.equal(Object.values(row.blocker_counts).reduce((sum,count)=>sum+count,0),row.blocker_count)
    assert.ok(row.blockers.every(example=>original.blockers.some(item=>item.id===example.id&&item.kind===example.kind)))
  }
  assert.ok(Buffer.byteLength(JSON.stringify(small))<Buffer.byteLength(JSON.stringify(full))/3)
})
