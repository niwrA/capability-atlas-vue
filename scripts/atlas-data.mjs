import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileReviews } from './review-model.mjs'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const nodeSections = ['roles', 'capabilities', 'learning_units', 'framework_outcomes', 'qualifications']
export const edgeSections = ['role_capability_assertions', 'decompositions', 'outcome_capability_links', 'qualification_requirements']
export const summaryFields = ['id', 'label', 'kind', 'sector', 'source', 'role_family', 'source_status', 'label_nl', 'notation', 'source_version', 'decomposition_family']
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
  for (const [bucket, records] of buckets) {
    const text = JSON.stringify(records)
    const file = `details-${bucket}-${hash(text).slice(0, 20)}.json`
    chunks[bucket] = file
    files.set(file, text)
  }
  const index = { format: 1, summaryFields, edgeFields, strings, nodes, sections, edges, chunks, catalogue: catalogueInfo(dataset), reviews: compileReviews(dataset) }
  return { index, files }
}
