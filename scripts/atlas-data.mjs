import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileReviews } from './review-model.mjs'
import { auditPilot } from '../src/pilot-model.js'
import { auditExploration } from '../src/foundation-model.js'
import { auditProfessions, compactProfessionCoverage } from '../src/profession-audit.js'
import { auditQuantityPractice } from '../src/quantity-practice.js'
import { assessLearningDesign } from '../src/learning-design.js'
import { auditAllSkills, encodePathwayAudit } from '../src/pathway-audit.js'
import { encodeMetadata } from '../src/catalogue-metadata.js'
import { encodeStringTable, poolMetadata } from '../src/catalogue-encoding.js'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const nodeSections = ['roles', 'capabilities', 'learning_units', 'framework_outcomes', 'qualifications']
export const edgeSections = ['role_capability_assertions', 'decompositions', 'outcome_capability_links', 'qualification_requirements']
export const summaryFields = ['id', 'label', 'kind', 'sector', 'source', 'role_family', 'source_status', 'label_nl', 'notation', 'source_version', 'decomposition_family', 'authoring_origin']
export const edgeFields = ['from', 'to', 'type', 'validation', 'completion_requirement', 'completionRequirement', 'relationType', 'escoType']
const hash = value => createHash('sha256').update(value).digest('hex')

function catalogueInfo(dataset) {
  const roles = dataset.roles.filter(node => node.source === 'ESCO' && node.source_status === 'released')
  const skills = dataset.capabilities.filter(node => node.source === 'ESCO' && node.source_status === 'released')
  const edges = dataset.role_capability_assertions.filter(edge => edge.type.startsWith('esco_'))
  const hashLines = values => hash(values.sort().join('\n') + '\n')
  const report = dataset.esco_full_catalogue_import
  const verified = !!report && roles.length === report.inventory.occupations && skills.length === report.inventory.skill_knowledge_concepts && edges.length === report.inventory.occupation_skill_links && hashLines(roles.map(node => node.id)) === report.fingerprints_sha256.occupation_ids && hashLines(skills.map(node => node.id)) === report.fingerprints_sha256.skill_ids && hashLines(edges.map(edge => [edge.from, edge.to, edge.type].join('\t'))) === report.fingerprints_sha256.occupation_skill_links
  return {
    verified, version: report?.source.version || null, links: edges.length,
    occupationGroups: (dataset.esco_classifications || []).filter(node => /^http:\/\/data.europa.eu\/esco\/isco\/C\d$/.test(node.id)).map(node => ({ code: String(node.notation), label: node.label, label_nl: node.label_nl })),
  }
}

export async function readDataset(directory = resolve(root, 'data')) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'))
  const dataset = {}
  for (const [section, files] of Object.entries(manifest.sections)) {
    const parts = await Promise.all(files.map(file => readFile(resolve(directory, file), 'utf8').then(JSON.parse)))
    dataset[section] = manifest.arrays.includes(section) ? parts.flat() : parts[0]
  }
  return dataset
}

// One canonical authoring format; preserve record order and every source field.
export async function writeDataset(dataset, directory = resolve(root, 'data')) {
  await mkdir(directory, { recursive: true })
  let previous = { sections: {} }
  try { previous = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const manifest = { format: 1, arrays: [], sections: {} }
  for (const [section, value] of Object.entries(dataset)) {
    const parts = Array.isArray(value) ? [] : [value]
    if (Array.isArray(value)) {
      manifest.arrays.push(section)
      for (let start = 0; start < value.length; start += 500) parts.push(value.slice(start, start + 500))
    }
    manifest.sections[section] = []
    for (let i = 0; i < parts.length; i++) {
      const text = JSON.stringify(parts[i], null, 2) + '\n'
      const digest = hash(text).slice(0, 16)
      const file = Array.isArray(value) ? `${section}/${String(i).padStart(3, '0')}-${digest}.json` : `${section}-${digest}.json`
      // Published content-addressed files are immutable. Reuse identical files
      // rather than replacing them while Windows readers may have them open.
      try {
        const existing = await readFile(resolve(directory, file), 'utf8')
        if (existing !== text) throw new Error(`Content-addressed source file differs: ${file}`)
        manifest.sections[section].push(file)
        continue
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      await mkdir(dirname(resolve(directory, file)), { recursive: true })
      const temporary = resolve(directory, file + '.tmp')
      await writeFile(temporary, text)
      await rename(temporary, resolve(directory, file))
      manifest.sections[section].push(file)
    }
  }
  await writeFile(resolve(directory, 'manifest.json.tmp'), JSON.stringify(manifest, null, 2) + '\n')
  await rename(resolve(directory, 'manifest.json.tmp'), resolve(directory, 'manifest.json'))
  const currentFiles = new Set(Object.values(manifest.sections).flat())
  for (const file of Object.values(previous.sections).flat()) {
    if (currentFiles.has(file)) continue
    const target = resolve(directory, file), path = relative(resolve(directory), target)
    if (path.startsWith('..') || isAbsolute(path)) throw new Error('Source path leaves the data directory')
    await unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}

export function compileDataset(dataset) {
  const records = nodeSections.flatMap(section => dataset[section] || [])
  const indexes = new Map()
  records.forEach((record, i) => {
    if (!record.id || indexes.has(record.id)) throw new Error(`Missing or duplicate node ID: ${record.id}`)
    indexes.set(record.id, i)
  })
  const strings = [], stringIndexes = new Map()
  const intern = value => {
    if (value === undefined) return -1
    if (!stringIndexes.has(value)) { stringIndexes.set(value, strings.length); strings.push(value) }
    return stringIndexes.get(value)
  }
  const buckets = new Map()
  const nodes = records.map(record => {
    const bucket = hash(record.id).slice(0, 2)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket).push(record)
    return [...summaryFields.map(field => intern(record[field])), bucket]
  })
  const sections = {}
  let offset = 0
  for (const section of nodeSections) {
    sections[section] = [offset, (dataset[section] || []).length]
    offset += sections[section][1]
  }
  const edges = Object.fromEntries(edgeSections.map(section => [section, (dataset[section] || []).map(edge => {
    if (!indexes.has(edge.from) || !indexes.has(edge.to)) throw new Error(`Dangling edge: ${edge.from} -> ${edge.to}`)
    const row = edgeFields.map(field => field === 'from' || field === 'to' ? indexes.get(edge[field]) : intern(edge[field]))
    while (row.at(-1) === -1) row.pop()
    return row
  })]))
  const files = new Map(), chunks = {}
  if (dataset.pilot_pathway) {
    const audit = auditPilot(dataset)
    if (!audit.valid) throw new Error('Invalid pilot pathway: ' + audit.errors.join('; '))
  }
  const explorationAudit = auditExploration(dataset)
  const professionCoverage = auditProfessions(dataset)
  if(professionCoverage.errors.length)throw new Error('Invalid profession campaign: '+professionCoverage.errors.join('; '))
  if (!explorationAudit.valid) throw new Error('Invalid foundation exploration: ' + explorationAudit.errors.join('; '))
  const practiceErrors = auditQuantityPractice(dataset)
  const learningDesignSummary = { not_specified: 0, incomplete: 0, needs_split: 0, draft_ready: 0 }
  for (const record of dataset.learning_units || []) {
    const assessment = assessLearningDesign(record)
    learningDesignSummary[assessment.status]++
    if (assessment.errors.length) throw new Error(`Invalid learning design: ${record.id}: ${assessment.errors.join('; ')}`)
  }
  for (const record of records) if (record.practice_exercise) {
    const { revision, ...content } = record.practice_exercise
    if (hash(JSON.stringify(content)) !== revision) practiceErrors.push(`Stale practice revision: ${record.id}`)
  }
  if (practiceErrors.length) throw new Error('Invalid quantity practice: ' + practiceErrors.join('; '))
  for (const [bucket, records] of buckets) {
    const text = JSON.stringify(records)
    const file = `details-${bucket}-${hash(text).slice(0, 20)}.json`
    chunks[bucket] = file
    files.set(file, text)
  }
  const auditFiles = new Map()
  let pathwayAudit
  if (dataset.starting_foundations) {
    const report = auditAllSkills(dataset)
    report.baseline_matches_scope = report.baseline?.target_ids_sha256 === hash(report.rows.map(row=>row.id).sort().join('\n'))
    const content = JSON.stringify(encodePathwayAudit(report,records.map(node=>node.id))), file = `pathway-audit-${hash(content).slice(0,20)}.json`
    auditFiles.set(file,content)
    pathwayAudit = {file,policy_version:report.policy_version,summary:report.summary,baseline:report.baseline,baseline_matches_scope:report.baseline_matches_scope}
  }
  const index = { format: 4, summaryFields, edgeFields, strings, nodes, sections, edges, chunks, catalogue: catalogueInfo(dataset), reviews: compileReviews(dataset), quantity_practice: dataset.quantity_practice, learning_design_summary: learningDesignSummary, pathway_audit:pathwayAudit }
  index.metadata=encodeMetadata({
    ...(dataset.pilot_pathway!==undefined?{pilot_pathway:dataset.pilot_pathway}:{}),
    ...(dataset.pathway_exploration!==undefined?{pathway_exploration:dataset.pathway_exploration}:{}),
    ...(dataset.profession_pathways?{profession_pathways:dataset.profession_pathways,profession_coverage:compactProfessionCoverage(professionCoverage)}:{}),
  },intern)
  index.metadata = poolMetadata(index.metadata)
  index.strings = encodeStringTable(strings)
  return { index, files, auditFiles }
}
