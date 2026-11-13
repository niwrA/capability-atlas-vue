// Route metadata shares the catalogue's string table. Repeated source text,
// record IDs and object keys are stored once; decoded application data keeps
// exactly the same shape. Numbers need a tag because bare integers are strings.
export function encodeMetadata(value, intern) {
  if (typeof value === 'string') return intern(value)
  if (typeof value === 'number' && Number.isFinite(value)) return { n: value }
  if (value === null || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(item => encodeMetadata(item, intern))
  if (value && typeof value === 'object') return { o: Object.entries(value).flatMap(([key, item]) => [intern(key), encodeMetadata(item, intern)]) }
  throw new Error('Unsupported catalogue metadata value')
}

export function decodeMetadata(value, strings) {
  const string = index => {
    if (!Number.isInteger(index) || index < 0 || index >= strings.length || typeof strings[index] !== 'string') throw new Error('Invalid catalogue metadata string reference')
    return strings[index]
  }
  const decode = item => {
    if (typeof item === 'number') return string(item)
    if (item === null || typeof item === 'boolean') return item
    if (Array.isArray(item)) return item.map(decode)
    if (!item || typeof item !== 'object' || Object.keys(item).length !== 1) throw new Error('Invalid catalogue metadata value')
    if (Object.hasOwn(item, 'n') && typeof item.n === 'number' && Number.isFinite(item.n)) return item.n
    if (!Array.isArray(item.o) || item.o.length % 2) throw new Error('Invalid catalogue metadata object')
    const entries = [], keys = new Set()
    for (let index = 0; index < item.o.length; index += 2) {
      const key = string(item.o[index])
      if (keys.has(key)) throw new Error('Duplicate catalogue metadata key')
      keys.add(key); entries.push([key, decode(item.o[index + 1])])
    }
    return Object.fromEntries(entries)
  }
  return decode(value)
}
