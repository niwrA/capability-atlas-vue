// Format 4 preserves the existing string slots and encoded metadata values.
// Only their transport representation changes; content and graph IDs do not.
const prefixes = [
  'http://data.europa.eu/esco/skill/', 'http://data.europa.eu/esco/occupation/',
  'atlas:alu:profession-domain:', 'atlas:alu:profession-foundation:',
  'atlas:alu:foundation-exploration:', 'atlas:esco-breakdown:',
  'atlas:alu:development:', 'atlas:alu:pilot:',
]
const scalar = value => value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const reference = (value, length) => Number.isInteger(value) && value >= 0 && value < length

export function encodeStringTable(values) {
  if (!Array.isArray(values) || values.some(value => !scalar(value))) throw new Error('Invalid catalogue string table')
  return { encoding: 'prefix-v1', prefixes: [...prefixes], values: values.map(value => {
    if (typeof value !== 'string') return value
    const prefix = prefixes.findIndex(candidate => value.startsWith(candidate))
    return prefix < 0 ? value : [prefix, value.slice(prefixes[prefix].length)]
  }) }
}

export function decodeStringTable(encoded) {
  if (!exactKeys(encoded, ['encoding', 'prefixes', 'values']) || encoded.encoding !== 'prefix-v1' || !Array.isArray(encoded.prefixes) || encoded.prefixes.some(value => typeof value !== 'string' || !value.length) || !Array.isArray(encoded.values)) throw new Error('Invalid catalogue string table')
  return encoded.values.map(value => {
    if (scalar(value)) return value
    if (!Array.isArray(value) || value.length !== 2 || !reference(value[0], encoded.prefixes.length) || typeof value[1] !== 'string') throw new Error('Invalid catalogue string prefix reference')
    return encoded.prefixes[value[0]] + value[1]
  })
}

const maxDepth = 256
function tag(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1) throw new Error('Invalid pooled catalogue metadata value')
  return Object.keys(value)[0]
}
function primitive(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return true
  if (!value || typeof value !== 'object') throw new Error('Invalid pooled catalogue metadata value')
  return false
}

export function poolMetadata(value) {
  const counts = new Map(), values = new Map()
  const scan = (item, depth = 0) => {
    if (depth > maxDepth) throw new Error('Catalogue metadata nesting is too deep')
    if (primitive(item)) return
    if (!Array.isArray(item)) {
      const kind = tag(item)
      if (kind !== 'o' && kind !== 'n' || kind === 'o' && (!Array.isArray(item.o) || item.o.length % 2) || kind === 'n' && (typeof item.n !== 'number' || !Number.isFinite(item.n))) throw new Error('Invalid encoded catalogue metadata')
    }
    const key = JSON.stringify(item)
    counts.set(key, (counts.get(key) || 0) + 1); values.set(key, item)
    for (const child of Object.values(item)) scan(child, depth + 1)
  }
  scan(value)
  const keys = [...counts].filter(([key, count]) => count > 1 && key.length > 40).map(([key]) => key)
  const ids = new Map(keys.map((key, index) => [key, index]))
  const encode = (item, skip) => {
    if (primitive(item)) return item
    const key = JSON.stringify(item)
    if (key !== skip && ids.has(key)) return { r: ids.get(key) }
    if (Array.isArray(item)) return item.map(child => encode(child))
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, encode(child)]))
  }
  return { encoding: 'subtree-v1', root: encode(value), pool: keys.map(key => encode(values.get(key), key)) }
}

export function unpoolMetadata(encoded, { maxValues = 2_000_000 } = {}) {
  if (!exactKeys(encoded, ['encoding', 'root', 'pool']) || encoded.encoding !== 'subtree-v1' || !Array.isArray(encoded.pool) || !Number.isInteger(maxValues) || maxValues < 1) throw new Error('Invalid catalogue metadata pool')
  // Validate even unused entries. A corrupt dormant reference must not become
  // a delayed cycle or dangling reference when the next catalogue uses it.
  const states = new Uint8Array(encoded.pool.length)
  const validate = (item, depth = 0) => {
    if (depth > maxDepth) throw new Error('Catalogue metadata nesting is too deep')
    if (primitive(item)) return
    if (Array.isArray(item)) { for (const child of item) validate(child, depth + 1); return }
    const kind = tag(item)
    if (kind === 'r') {
      if (!reference(item.r, encoded.pool.length)) throw new Error('Invalid catalogue metadata pool reference')
      if (states[item.r] === 1) throw new Error('Cyclic catalogue metadata pool')
      if (!states[item.r]) {
        states[item.r] = 1; validate(encoded.pool[item.r], depth + 1); states[item.r] = 2
      }
    } else if (kind === 'n') {
      if (typeof item.n !== 'number' || !Number.isFinite(item.n)) throw new Error('Invalid catalogue metadata number')
    } else if (kind === 'o') {
      if (!Array.isArray(item.o) && !(exactKeys(item.o, ['r']))) throw new Error('Invalid catalogue metadata object')
      validate(item.o, depth + 1)
      let fields = item.o
      while (exactKeys(fields, ['r'])) fields = encoded.pool[fields.r]
      if (!Array.isArray(fields) || fields.length % 2) throw new Error('Invalid catalogue metadata object')
    } else throw new Error('Invalid catalogue metadata tag')
  }
  validate(encoded.root)
  for (let index = 0; index < encoded.pool.length; index++) validate({ r: index })
  let remaining = maxValues
  const expand = (item, depth = 0) => {
    if (--remaining < 0) throw new Error('Catalogue metadata expansion is too large')
    if (depth > maxDepth) throw new Error('Catalogue metadata nesting is too deep')
    if (primitive(item)) return item
    if (Array.isArray(item)) return item.map(child => expand(child, depth + 1))
    if (Object.hasOwn(item, 'r')) return expand(encoded.pool[item.r], depth + 1)
    // Rebuild each occurrence, rather than caching mutable objects by pool ID.
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, expand(child, depth + 1)]))
  }
  return expand(encoded.root)
}
