export class CatalogueLoadError extends Error {
  constructor(message, { action = 'retry', code = 'download_failed', status } = {}) {
    super(message)
    this.name = 'CatalogueLoadError'
    this.action = action
    this.code = code
    this.status = status
  }
}

export function decodeIndex(index) {
  if (index.format !== 1) throw new CatalogueLoadError('This catalogue needs a newer version of the app. Reload to continue. Your saved learning will be kept.', { action: 'reload', code: 'unsupported_version' })
  const decode = (row, fields, nodes) => {
    const record = {}
    for (let i = 0; i < fields.length; i++) {
      if (row[i] === undefined || row[i] === -1) continue
      const field = fields[i]
      record[field] = nodes && (field === 'from' || field === 'to') ? nodes[row[i]].id : index.strings[row[i]]
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
  return dataset
}

export async function loadAtlasData({ baseUrl = '/atlas-data/', fetcher = fetch, maxCachedChunks = 12, timeoutMs = 30000 } = {}) {
  const getJSON = async (file, cache) => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetcher(baseUrl + file, { cache, signal: controller.signal })
      if (!response.ok) {
        if (file.startsWith('details-') && [404, 410].includes(response.status)) throw new CatalogueLoadError('This learning content is no longer available for the open catalogue. Reload the catalogue to get the latest content. Your saved learning will be kept.', { action: 'reload', code: 'catalogue_changed', status: response.status })
        throw new CatalogueLoadError('Learning content is temporarily unavailable. Please try again.', { status: response.status })
      }
      if (file.startsWith('details-') && response.headers?.get('content-type')?.toLowerCase().includes('text/html')) throw new CatalogueLoadError('This learning content is no longer available for the open catalogue. Reload the catalogue to get the latest content. Your saved learning will be kept.', { action: 'reload', code: 'catalogue_changed' })
      return await response.json()
    } catch (error) {
      if (error instanceof CatalogueLoadError) throw error
      if (controller.signal.aborted) throw new CatalogueLoadError('The download is taking too long. Check your connection and try again.', { code: 'timeout' })
      throw new CatalogueLoadError('Learning content could not be downloaded. Check your connection and try again.')
    } finally { clearTimeout(timer) }
  }
  const index = await getJSON('index.json', 'no-cache')
  const dataset = decodeIndex(index)
  const buckets = new Map(index.nodes.map(row => [index.strings[row[0]], row[index.summaryFields.length]]))
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
  return { dataset, loadDetail }
}
