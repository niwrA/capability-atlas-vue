// Fixed, inspectable scope. Listing a target never means its route is complete.
export const professionTargetGroups = [
  ['Existing contrasts', ['shelf filler', 'domestic cleaner', 'shop assistant', 'cook', 'administrative assistant', 'software developer']],
  ['Leather and footwear', ['leather goods manual operator', 'leather goods hand cutting operator', 'leather goods CAD patternmaker', 'leather goods finishing operator', 'leather goods patternmaker', 'footwear hand sewer', 'leather goods warehouse operator', 'footwear quality controller', 'leather goods hand stitcher', 'leather goods packing operator', 'leather goods quality control laboratory technician', 'leather goods quality controller', 'leather goods stitching machine operator', 'footwear factory warehouse operator', 'footwear finishing and packing operator', 'footwear patternmaker', 'footwear production machine operator', 'footwear quality control laboratory technician', 'leather goods maintenance technician', 'leather goods quality technician', 'footwear CAD patternmaker', 'leather goods industrial engineer', 'footwear stitching machine operator', 'footwear quality technician']],
  ['Textiles and clothing', ['clothing operations manager', 'knitting machine supervisor', 'textile operations manager', 'clothing finisher', 'embroiderer', 'embroidery machine operator', 'nonwoven textile technician', 'textile dyeing technician', 'textile dyer', 'textile quality manager', 'weaving textile technician', 'braiding textile technician', 'printing textile technician', 'textile printer', 'weaving machine supervisor']],
  ['Hospitality and visitor services', ['hotel porter', 'cloak room attendant', 'linen room attendant', 'locker room attendant', 'funeral attendant', 'amusement and recreation attendant', 'cemetery attendant', 'hotel concierge', 'room attendant', 'school bus attendant', 'train attendant', 'usher', 'hotel butler', 'leisure attendant', 'swimming facility attendant', 'hospitality establishment receptionist', 'costume attendant', 'receptionist', 'toilet attendant', 'kitchen porter']],
  ['Cleaning and facilities', ['amusement park cleaner', 'building caretaker', 'building exterior cleaner', 'sewerage cleaner', 'furniture cleaner', 'cacao beans cleaner', 'train cleaner', 'vehicle cleaner', 'window cleaner', 'drapery and carpet cleaner']],
  ['Office and information', ['fundraising assistant', 'sales support assistant', 'telephone switchboard operator', 'promotion assistant', 'engineering assistant', 'payroll clerk', 'supply chain assistant', 'actuarial assistant', 'conveyance clerk', 'data entry clerk']],
  ['Retail and logistics', ['leaflet distributor', 'hand packer', 'shop supervisor', 'personal shopper', 'warehouse operators for clothing', 'packaging and filling machine operator', 'mail clerk', 'postman/postwoman']],
  ['Growing and craft', ['fruit and vegetable picker', 'jewellery polisher', 'basketmaker', 'carpet handicraft worker', 'jewellery assembler', 'jewellery mounter', 'pottery and porcelain caster']],
]

export function professionTargets(dataset) {
  const targets = professionTargetGroups.flatMap(([group, labels]) => labels.map(label => {
    const role = dataset.roles.find(node => node.source === 'ESCO' && node.source_status === 'released' && node.label === label)
    if (!role) throw new Error('Unknown profession target: ' + label)
    return { id: role.id, label, group }
  }))
  if (targets.length !== 100 || new Set(targets.map(target => target.id)).size !== 100) throw new Error('The profession campaign requires 100 distinct targets')
  return targets
}
