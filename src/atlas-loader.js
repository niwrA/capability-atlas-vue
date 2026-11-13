import { decodePathwayAudit } from './pathway-audit.js'
import { decodeMetadata } from './catalogue-metadata.js'
import { decodeStringTable, unpoolMetadata } from './catalogue-encoding.js'

export class CatalogueLoadError extends Error {
  constructor(message, { action = 'retry', code = 'download_failed', status } = {}) {
    super(message)
    this.name = 'CatalogueLoadError'
    this.action = action
    this.code = code
    this.status = status
  }
}

function decodeCatalogue(index) {
  if (![1, 2, 3, 4].includes(index.format)) throw new CatalogueLoadError('This catalogue needs a newer version of the app. Reload to continue. Your saved learning will be kept.', { action: 'reload', code: 'unsupported_version' })
  let metadata = index, strings = index.strings
  if (index.format >= 2) {
    try {
      if (index.format === 4) strings = decodeStringTable(index.strings)
      metadata = decodeMetadata(index.format === 4 ? unpoolMetadata(index.metadata) : index.metadata, strings)
      if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw new Error('Invalid metadata root')
    } catch {
      throw new CatalogueLoadError('This catalogue metadata is incomplete or does not match the app. Reload to get the current catalogue. Your saved learning will be kept.', { action: 'reload', code: 'invalid_metadata' })
    }
  }
  const decode = (row, fields, nodes) => {
    const record = {}
    for (let i = 0; i < fields.length; i++) {
      if (row[i] === undefined || row[i] === -1) continue
      const field = fields[i]
      record[field] = nodes && (field === 'from' || field === 'to') ? nodes[row[i]].id : strings[row[i]]
    }
    return record
  }
  const nodes = index.nodes.map(row => decode(row, index.summaryFields))
  const dataset = {}
  for (const [section, [start, length]] of Object.entries(index.sections)) dataset[section] = nodes.slice(start, start + length)
  for (const [section, rows] of Object.entries(index.edges)) {
    dataset[section] = rows.map(row => decode(row, index.edgeFields, nodes))
  }
  dataset.catalogue = index.catalogue
  dataset.review_registry = index.reviews || {}
  // Earlier format-2 catalogues kept these routes outside the string table.
  // Prefer an explicitly encoded value, including null, while retaining them.
  dataset.pilot_pathway = Object.hasOwn(metadata,'pilot_pathway') ? metadata.pilot_pathway : index.pilot_pathway
  dataset.pathway_exploration = Object.hasOwn(metadata,'pathway_exploration') ? metadata.pathway_exploration : index.pathway_exploration
  dataset.profession_pathways = metadata.profession_pathways
  dataset.profession_coverage = metadata.profession_coverage
  dataset.quantity_practice = index.quantity_practice
  dataset.learning_design_summary = index.learning_design_summary
  dataset.pathway_audit = index.pathway_audit
  return { dataset, nodes }
}

export function decodeIndex(index) { return decodeCatalogue(index).dataset }

export async function loadAtlasData({ baseUrl = '/atlas-data/', fetcher = fetch, maxCachedChunks = 12, timeoutMs = 30000 } = {}) {
  const getJSON = async (file, cache) => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetcher(baseUrl + file, { cache, signal: controller.signal })
      if (!response.ok) {
        if (/^(details-|pathway-audit-)/.test(file) && [404, 410].includes(response.status)) throw new CatalogueLoadError('This learning content is no longer available for the open catalogue. Reload the catalogue to get the latest content. Your saved learning will be kept.', { action: 'reload', code: 'catalogue_changed', status: response.status })
        throw new CatalogueLoadError('Learning content is temporarily unavailable. Please try again.', { status: response.status })
      }
      if (/^(details-|pathway-audit-)/.test(file) && response.headers?.get('content-type')?.toLowerCase().includes('text/html')) throw new CatalogueLoadError('This learning content is no longer available for the open catalogue. Reload the catalogue to get the latest content. Your saved learning will be kept.', { action: 'reload', code: 'catalogue_changed' })
      return await response.json()
    } catch (error) {
      if (error instanceof CatalogueLoadError) throw error
      if (controller.signal.aborted) throw new CatalogueLoadError('The download is taking too long. Check your connection and try again.', { code: 'timeout' })
      throw new CatalogueLoadError('Learning content could not be downloaded. Check your connection and try again.')
    } finally { clearTimeout(timer) }
  }
  const index = await getJSON('index.json', 'no-cache')
  const { dataset, nodes } = decodeCatalogue(index)
  const buckets = new Map(index.nodes.map((row, position) => [nodes[position].id, row[index.summaryFields.length]]))
  const chunks = index.chunks, bucketIds = new Map()
  for (const [id, bucket] of buckets) {
    if (!bucketIds.has(bucket)) bucketIds.set(bucket, [])
    bucketIds.get(bucket).push(id)
  }
  const cache = new Map(), pending = new Map(), retryBuckets = new Set()
  async function loadDetail(id) {
    const bucket = buckets.get(id)
    if (bucket === undefined) throw new Error('This learning item is not in the catalogue.')
    if (cache.has(bucket)) {
      const records = cache.get(bucket)
      cache.delete(bucket); cache.set(bucket, records)
      return records.get(id)
    }
    if (!pending.has(bucket)) {
      const request = getJSON(chunks[bucket], retryBuckets.has(bucket) ? 'reload' : 'force-cache').then(rows => {
        if (!Array.isArray(rows)) throw new CatalogueLoadError('This learning content does not match the open catalogue. Reload the catalogue to continue.', { action: 'reload', code: 'catalogue_changed' })
        const records = new Map(rows.map(record => [record.id, record]))
        // Reject incomplete batches rather than silently showing partial content.
        for (const record of rows) if (buckets.get(record.id) !== bucket) throw new CatalogueLoadError('This learning content does not match the open catalogue. Reload the catalogue to continue.', { action: 'reload', code: 'catalogue_changed' })
        const expectedIds = bucketIds.get(bucket)
        if (records.size !== expectedIds.length || expectedIds.some(id => !records.has(id))) throw new CatalogueLoadError('Learning content is incomplete for this catalogue. Reload the catalogue to continue.', { action: 'reload', code: 'incomplete_catalogue' })
        retryBuckets.delete(bucket)
        cache.set(bucket, records)
        while (cache.size > maxCachedChunks) cache.delete(cache.keys().next().value)
        return records
      }).catch(error => { retryBuckets.add(bucket); throw error }).finally(() => pending.delete(bucket))
      pending.set(bucket, request)
    }
    return (await pending.get(bucket)).get(id)
  }
  let auditCache, auditPending, auditRetry = false
  async function loadPathwayAudit() {
    if (auditCache) return auditCache
    if (!index.pathway_audit) return null
    if (!auditPending) auditPending = getJSON(index.pathway_audit.file,auditRetry?'reload':'force-cache').then(encoded=>{
      let report
      try{report=decodePathwayAudit(encoded,['roles','capabilities','learning_units','framework_outcomes','qualifications'].flatMap(section=>dataset[section]||[]))}catch{throw new CatalogueLoadError('This pathway audit does not match the open catalogue. Reload to get the current report. Saved learning will be kept.',{action:'reload',code:'catalogue_changed'})}
      const expected = new Set(dataset.capabilities.filter(node=>node.source!=='ESCO'||node.source_status==='released').map(node=>node.id))
      if(report?.format!==1 || report.policy_version!==index.pathway_audit.policy_version || !Array.isArray(report.rows) || report.rows.length!==index.pathway_audit.summary.targets || new Set(report.rows.map(row=>row.id)).size!==expected.size || report.rows.some(row=>!expected.has(row.id)||!Array.isArray(row.blockers)) || !Array.isArray(report.priorities)||!Array.isArray(report.starts)) throw new CatalogueLoadError('This pathway audit does not match the open catalogue. Reload to get the current report. Saved learning will be kept.',{action:'reload',code:'catalogue_changed'})
      auditCache=report; auditRetry=false; return report
    }).catch(error=>{auditRetry=true;throw error}).finally(()=>{auditPending=null})
    return auditPending
  }
  return { dataset, loadDetail, loadPathwayAudit }
}
