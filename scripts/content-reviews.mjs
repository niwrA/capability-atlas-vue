import { pathToFileURL } from 'node:url'
import { readDataset, writeDataset } from './atlas-data.mjs'
import { compileReviews, createReviewFingerprinter } from './review-model.mjs'
export { compileReviews, createReviewFingerprinter } from './review-model.mjs'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, scope] = process.argv.slice(2)
  if (id === '--record') {
    if (!scope) throw new Error('Usage: node scripts/content-reviews.mjs --record PATH_TO_REVIEW_JSON')
    const { readFile } = await import('node:fs/promises')
    const dataset = await readDataset(), record = JSON.parse(await readFile(scope, 'utf8'))
    dataset.content_reviews ??= { format: 1, records: [] }
    dataset.content_reviews.records.push(record)
    const registry = compileReviews(dataset)
    await writeDataset(dataset)
    console.log(`Recorded ${record.id}: ${registry[record.target_id].status}. Rebuild browser data to publish it.`)
  } else {
    if (!id || !scope) throw new Error('Usage: node scripts/content-reviews.mjs TARGET_ID SCOPE')
    console.log(createReviewFingerprinter(await readDataset())(id, scope))
  }
}
