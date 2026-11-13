export function ensureStartingFoundations(dataset) {
  dataset.starting_foundations ||= { format: 1,
    note: 'Proposed entry conditions, not a universal age test or a claim of no prior abilities. These assumptions are explicit boundaries of the current authored model.',
    entries: [
      { id: 'atlas:alu:development:communication:respond-to-early-signals', assumed_ability: 'The person can express or show an individual signal that a familiar supporter can notice.', support: 'A familiar supporter observes, responds and adapts communication access; no speech prerequisite is imposed.' },
      { id: 'atlas:alu:development:numeracy:notice-small-quantities', assumed_ability: 'The person can attend or respond to a change involving a small collection in a supported routine.', support: 'Use accessible objects or descriptions and a supporter who notices responses; no numeral reading is assumed.' },
      { id: 'atlas:alu:pilot:shelf-filler:explore-and-place', assumed_ability: 'The person can indicate a choice or participate in exploring a familiar safe object.', support: 'Objects, positioning or access aids and a familiar helper; directing a helper can replace independent placement.' },
      { id: 'atlas:alu:pilot:shelf-filler:choice-and-pause', assumed_ability: 'An individual preference, comfort or pause signal can be noticed during a familiar routine.', support: 'A trusted supporter offers choices, waits, honours stopping signals and provides co-regulation.' },
    ] }
}
