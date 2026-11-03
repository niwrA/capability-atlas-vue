import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCatalogueModel } from '../src/catalogue-model.js'
import { compileReviews, createReviewFingerprinter } from '../scripts/content-reviews.mjs'
import { compileDataset } from '../scripts/atlas-data.mjs'
import { decodeIndex } from '../src/atlas-loader.js'

function fixture() {
  return {
    roles: [
      { id: 'role:none', label: 'No breakdown', label_nl: 'Geen activiteiten', kind: 'role', source: 'ESCO', source_status: 'released', notation: '1234.1', official: true },
      { id: 'role:partial', label: 'Partial breakdown', kind: 'role', source: 'ESCO', source_status: 'released', notation: '2345.1' },
      { id: 'role:generated', label: 'Generated breakdown', kind: 'role', source: 'ESCO', source_status: 'released', notation: '2345.2' },
      { id: 'role:manual', label: 'Authored breakdown', kind: 'role', source: 'ESCO', source_status: 'released', notation: '3456.1' },
      { id: 'role:retired', label: 'Retired role', kind: 'role', source: 'ESCO', source_status: 'obsolete', notation: '3456.2' },
      { id: 'role:life', label: 'Atlas life role', kind: 'role', source: 'Atlas', role_family: 'life' },
    ],
    capabilities: ['missing', 'generated', 'manual'].map(name => ({ id: `skill:${name}`, label: name, kind: 'skill', source: 'ESCO', source_status: 'released' })),
    learning_units: [
      { id: 'unit:generated', label: 'Generated activity', kind: 'learning_unit', decomposition_family: 'test-template', assessment: { criteria: ['A draft criterion'] } },
      { id: 'unit:manual', label: 'Authored activity', kind: 'learning_unit', official: false },
    ],
    role_capability_assertions: [
      { from: 'role:none', to: 'skill:missing', type: 'esco_essential' },
      { from: 'role:none', to: 'skill:generated', type: 'esco_optional' },
      { from: 'role:partial', to: 'skill:generated', type: 'esco_essential' },
      { from: 'role:partial', to: 'skill:missing', type: 'esco_essential' },
      { from: 'role:generated', to: 'skill:generated', type: 'esco_essential' },
      { from: 'role:manual', to: 'skill:manual', type: 'esco_essential' },
      { from: 'role:life', to: 'skill:manual', type: 'atlas_required' },
    ],
    decompositions: [
      { from: 'skill:generated', to: 'unit:generated', type: 'decomposes_into' },
      { from: 'skill:manual', to: 'unit:manual', type: 'decomposes_into' },
      { from: 'skill:missing', to: 'unit:manual', type: 'contains_candidate', completion_requirement: 'optional' },
    ],
    catalogue: { occupationGroups: [{ code: '1', label: 'Managers' }, { code: '2', label: 'Professionals' }, { code: '3', label: 'Technicians' }] },
  }
}

test('coverage separates no activities, partial drafts, generated drafts, and authored drafts', () => {
  const model = createCatalogueModel(fixture())
  assert.equal(model.coverageFor('role:none').units, 0, 'Optional activities do not fill required coverage')
  assert.equal(model.coverageFor('role:none').breakdown, 'none')
  assert.equal(model.coverageFor('role:partial').breakdown, 'partial')
  assert.deepEqual(model.coverageFor('role:partial').missingIds, ['skill:missing'])
  assert.equal(model.coverageFor('role:generated').contentLabel, 'Generated draft activities')
  assert.equal(model.coverageFor('role:manual').contentLabel, 'Draft learning activities')
  assert.equal(model.coverageFor('unit:manual').units, 1, 'An individual activity does not need its own breakdown')
  assert.equal(model.coverageFor('role:none').reviewLabel, 'No documented review', 'Official source records do not imply content review')
  assert.deepEqual(model.overview.breakdownCounts, { none: 1, partial: 1, draft: 2, unmapped: 0 })
  const earlierTemplates = fixture()
  earlierTemplates.learning_units[1].source_version = '0.19.0'
  assert.equal(createCatalogueModel(earlierTemplates).coverageFor('role:manual').contentLabel, 'Generated draft activities')
})

test('pagination covers every active occupation exactly once and categories distinguish Atlas roles', () => {
  const model = createCatalogueModel(fixture())
  const first = model.browse({ pageSize: 2 }), second = model.browse({ page: 2, pageSize: 2 })
  const ids = [...first.items, ...second.items].map(node => node.id)
  assert.equal(new Set(ids).size, 4)
  assert.ok(!ids.includes('role:retired') && !ids.includes('role:life'))
  assert.equal(model.browse({ group: 'all' }).total, 5)
  assert.equal(model.browse({ group: 'atlas-life' }).total, 1)
  assert.equal(model.browse({ group: '2' }).total, 2)
  assert.equal(model.browse({ query: 'Geen activiteiten' }).items[0].id, 'role:none')
  assert.equal(model.browse({ coverage: 'none' }).total, 1)
  assert.equal(model.browse({ coverage: 'reviewed' }).total, 0)
  assert.equal(model.browse({ page: 99, pageSize: 2 }).page, 2)
  assert.deepEqual(model.browse({ query: 'does not exist' }), { items: [], total: 0, pages: 1, page: 1, start: 0, end: 0 })
})

function review(dataset, target = 'unit:generated', scope = 'activity_content') {
  return {
    id: 'fixture-review', target_id: target, scope, decision: 'accepted',
    reviewer: { name: 'Example reviewer', expertise: 'Fixture expertise' },
    reviewed_at: '2026-10-01', summary: 'Fixture review, used only in tests.',
    evidence: [{ title: 'Fixture review evidence', url: 'https://example.org/review' }],
    content_fingerprint: createReviewFingerprinter(dataset)(target, scope),
  }
}

test('a documented activity review does not promote an entire occupation to reviewed', () => {
  const dataset = fixture()
  dataset.content_reviews = { format: 1, records: [review(dataset)] }
  dataset.review_registry = compileReviews(dataset)
  const model = createCatalogueModel(dataset)
  assert.equal(model.coverageFor('unit:generated').contentLabel, 'Reviewed content')
  assert.equal(model.coverageFor('unit:generated').reviewedCapabilities, 0, 'An activity review is not a capability review')
  assert.equal(model.coverageFor('role:generated').contentLabel, 'Generated draft activities')
  assert.equal(model.coverageFor('role:generated').reviewedActivities, 1)
  assert.equal(model.overview.reviewedPathways, 0)
  const delivered = createCatalogueModel(decodeIndex(compileDataset(dataset).index))
  assert.equal(delivered.coverageFor('unit:generated').contentLabel, 'Reviewed content')
  assert.equal(delivered.coverageFor('role:generated').reviewLabel, 'No documented review')
})

test('review evidence is bound to its scope and content version, including prerequisite edits', () => {
  const dataset = fixture()
  const record = review(dataset, 'role:generated', 'occupation_pathway')
  dataset.content_reviews = { format: 1, records: [record] }
  assert.equal(compileReviews(dataset)['role:generated'].status, 'reviewed')
  dataset.learning_units[0].assessment.criteria.push('An updated criterion')
  const stale = compileReviews(dataset)['role:generated']
  assert.equal(stale.status, 'outdated')
  assert.equal(stale.records[0].current, false)
  record.content_fingerprint = createReviewFingerprinter(dataset)(record.target_id, record.scope)
  dataset.decompositions.push({ from: 'unit:manual', to: 'unit:generated', type: 'prerequisite_for' })
  assert.equal(compileReviews(dataset)['role:generated'].status, 'outdated')
  assert.throws(() => createReviewFingerprinter(dataset)('role:generated', 'activity_content'), /Invalid/)
})

test('newer requested changes supersede acceptance and incomplete evidence fails the build', () => {
  const dataset = fixture(), accepted = review(dataset)
  dataset.content_reviews = { format: 1, records: [accepted, { ...accepted, id: 'fixture-changes', reviewed_at: '2026-10-02', decision: 'changes_requested' }] }
  assert.equal(compileReviews(dataset)['unit:generated'].status, 'changes_requested')
  for (const patch of [{ reviewer: {} }, { evidence: [] }, { evidence: [{ title: 'Invalid URL', url: 'javascript:alert(1)' }] }, { reviewed_at: 2026 }]) {
    dataset.content_reviews.records = [{ ...accepted, ...patch }]
    assert.throws(() => compileReviews(dataset), /Incomplete content review/)
  }
  dataset.content_reviews.records = [accepted, accepted]
  assert.throws(() => compileReviews(dataset), /Incomplete/)
  assert.equal(compileDataset(fixture()).index.catalogue.verified, false, 'A catalogue without a reconciled inventory is not labelled complete')
})
