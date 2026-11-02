"""Add early communication and numeracy routes to the Capability Atlas."""
import json
from pathlib import Path

path = Path('src/data.json')
data = json.loads(path.read_text())
if any(x.get('id', '').startswith('atlas:alu:development:') for x in data['learning_units']):
    raise SystemExit('Developmental foundations already exist; refusing duplicates.')

asha = [
    {'title': 'ASHA — Communication Milestones: Birth to 1 Year', 'url': 'https://www.asha.org/public/developmental-milestones/communication-milestones-birth-to-1-year/'},
    {'title': 'ASHA — Communication Milestones: 13 to 18 Months', 'url': 'https://www.asha.org/public/developmental-milestones/communication-milestones-13-to-18-months/'},
    {'title': 'ASHA — AAC in Early Intervention (no prerequisites)', 'url': 'https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/'},
    {'title': 'Harvard Center on the Developing Child — Serve and Return', 'url': 'https://developingchild.harvard.edu/key-concept/serve-and-return/'},
]
ies = [
    {'title': 'IES — Teaching Math to Young Children: Practice Guide', 'url': 'https://ies.ed.gov/ncee/wwc/PracticeGuide/18'},
    {'title': 'IES — Teaching Math to Young Children Toolkit', 'url': 'https://ies.ed.gov/ncee/rel/math-young-children'},
]

units = []
edges = []

def unit(id_, label, definition, criteria, domain, sources, basis, methods):
    units.append({
        'id': id_, 'label': label, 'label_nl': label, 'kind': 'learning_unit',
        'definition': definition, 'source': 'Capability Atlas developmental foundations',
        'source_version': '0.21.0', 'official': False, 'status': 'proposed',
        'learning_domain': domain,
        'estimated_active_learning_hours': {'min': 1, 'max': 3, 'basis': 'illustrative guided play or scenario activity; not validated'},
        'assessment': {'method': methods, 'criteria': criteria}, 'reusability': None,
        'evidence_basis': basis, 'supporting_sources': sources,
    })

def edge(a, b, typ='prerequisite_for', requirement=None, relid=None):
    obj = {'from': a, 'to': b, 'type': typ, 'validation': 'proposed',
           'source': 'Capability Atlas developmental foundations v0.21.0'}
    if requirement is not None:
        obj['completion_requirement'] = requirement
    if relid:
        obj['relation_id'] = relid
    edges.append(obj)

# These form suggested routes into caregiver practice. The route links are not
# clinical milestones, age deadlines, prerequisites for AAC, or diagnostic criteria.
comm = [
 ('respond-to-early-signals', 'Notice and respond to early communication signals',
  'In a short video or fictional observation, notice a young child’s gaze, movement, vocalization, gesture, sign, or use of a communication aid. Describe a warm response that follows the child’s focus and allows time for a reply.',
  ['notices more than spoken words as possible communication','describes a responsive, non-intrusive return','allows time and recognizes when the child signals to pause'], 'Harvard Center on the Developing Child serve-and-return guidance and ASHA early communication milestones inform this draft. Signals and interaction styles vary; this is not a diagnostic checklist.'),
 ('share-attention-and-turns', 'Share attention and take communicative turns',
  'Using a familiar play or daily-routine example, practice following the child’s interest, taking a brief turn, pausing, and responding to the child’s next signal in the communication modes available to them.',
  ['follows the child’s focus rather than demanding eye contact','creates a reciprocal opportunity to communicate','adapts timing and sensory or access demands'], 'ASHA milestones and Harvard serve-and-return guidance inform this flexible practice activity.'),
 ('connect-symbols-with-meaning', 'Connect familiar words or symbols with meaning',
  'Use a familiar object, action, person, or routine to model a meaningful word, sign, gesture, picture, or AAC symbol. Observe how the child responds and keep the interaction natural and pressure-free.',
  ['uses a meaningful referent and an accessible communication form','models rather than requiring imitation','recognizes a response in any available mode'], 'ASHA early communication milestones and AAC early-intervention guidance inform this draft. AAC can be introduced without prerequisite skills.'),
 ('use-first-meaningful-message', 'Support a first meaningful word, sign, or AAC message',
  'In a fictional caregiver scenario, identify how to notice and respond to a child’s first meaningful spoken word, sign, gesture, picture choice, or AAC symbol. Practice acknowledging the message and expanding the interaction without requiring speech.',
  ['accepts the child’s current communication mode','responds to the meaning rather than correcting form','does not withhold AAC or other communication supports pending speech'], 'ASHA communication milestones and its AAC early-intervention guidance inform this draft; there is no prerequisite for considering AAC.'),
 ('expand-and-combine-messages', 'Expand early messages into short exchanges',
  'Given a play or routine example, respond to the child’s message with one relevant word, sign, symbol, or short phrase, then leave room for another turn. Include spoken, signed, and AAC-supported communication as appropriate.',
  ['models a small, relevant language expansion','preserves the child’s meaning and communication mode','supports a back-and-forth exchange without pressure'], 'ASHA early communication guidance informs this draft; communication development varies and is not a fixed age sequence.'),
]
comm_ids=[]
for slug, label, definition, criteria, basis in comm:
    id_ = f'atlas:alu:development:communication:{slug}'
    comm_ids.append(id_)
    unit(id_, label, definition, criteria, 'life_parent_early_communication', asha,
         basis, 'Fictional caregiver scenario, video observation, or accessible play demonstration')

for a, b in zip(comm_ids, comm_ids[1:]):
    edge(a, b)

math = [
 ('notice-small-quantities', 'Notice small quantities and changes',
  'During familiar play or routines, notice whether a small set is empty, has one item, or has more than one; compare two small sets as same, more, or fewer using objects, movement, or images.',
  ['compares small sets using concrete objects or images','uses same, more, fewer, or none meaningfully','does not require numeral recognition'], 'Early number-sense activity informed by IES guidance on recognizing small collections and learning number through meaningful routines.'),
 ('experience-number-words', 'Experience the first number words in routines',
  'Use a playful routine, rhyme, or accessible communication system to hear, see, sign, or select the number words one, two, and three in a stable sequence, without requiring a child to recite them on demand.',
  ['models a stable short number-word sequence','accepts spoken, signed, visual, or AAC-supported access','keeps the activity playful and responsive'], 'IES foundational counting progression informs this draft. The language and modality can be adapted to the learner.'),
 ('match-count-word-to-object', 'Match one count word to one object',
  'With a small set of movable objects, model assigning one spoken, signed, or AAC-supported count word to each object exactly once. Begin with a small number and use pointing, eye gaze, or object movement as accessible.',
  ['coordinates one count word or symbol with each object','avoids skipping or counting an item twice','chooses an accessible way to track counted objects'], 'IES guidance identifies one-to-one correspondence as a foundational counting principle.'),
 ('understand-counted-total', 'Understand that the last count gives the total',
  'Count a small collection together, then use the final count word or symbol to answer “how many?” without recounting. Repeat with a small number of objects in varied arrangements.',
  ['uses the final count as the total for the collection','recognizes that rearranging the same objects does not change their number','uses concrete objects or images'], 'IES guidance describes cardinality and meaningful counting as steps beyond reciting the number sequence.'),
 ('connect-quantity-word-symbol', 'Connect a small quantity, number word, and numeral',
  'Match sets of one to five objects with an appropriate spoken, signed, or AAC-supported number word and a written numeral or tactile/visual representation. Use only as many symbols as are accessible to the learner.',
  ['matches small quantities with their number words','matches the same quantities to numerals or accessible representations','distinguishes quantity from the numeral used to label it'], 'IES early mathematics guidance supports connecting counted quantities, number words, and numerals.'),
 ('combine-two-small-sets', 'Combine two small sets and count all',
  'Use counters, toys, fingers, drawings, or another accessible representation to join two small sets, then count the combined collection to find how many there are.',
  ['represents both starting sets','combines the sets without losing or duplicating objects','counts the combined set and states or selects the total'], 'IES and What Works Clearinghouse guidance describe concrete counting strategies as an entry to simple addition.'),
 ('represent-first-addition', 'Represent a first addition with objects and symbols',
  'Show a small “put together” story with objects or drawings, then connect the action to a simple addition expression such as 2 + 1. Explain what each number represents and check the answer by counting the combined set.',
  ['models the story with objects or drawings','connects each numeral and operation sign to the modeled action','checks the result with a concrete count'], 'IES early mathematics guidance supports building operations from meaningful concrete situations and representations.'),
]
math_ids=[]
for slug, label, definition, criteria, basis in math:
    id_ = f'atlas:alu:development:numeracy:{slug}'
    math_ids.append(id_)
    unit(id_, label, definition, criteria, 'life_parent_early_numeracy', ies,
         basis, 'Guided play or a short practical demonstration with small sets and accessible materials')

# Suggested progression edges for learning routes. These are not universal,
# age-bound developmental gates. Keep these separate from decomposition scoring.
for a, b in zip(math_ids[:5], math_ids[1:5]):
    edge(a, b)
edge(math_ids[4], math_ids[5])
edge(math_ids[5], math_ids[6])

# Expand the existing count-and-cardinality activity into explicit foundations.
count_unit = 'atlas:math:multiplication:count-and-cardinality'
for id_ in math_ids[:5]:
    edge(count_unit, id_, 'decomposes_into', 'required', f'atlas-v021-count-foundation-{id_.rsplit(":",1)[-1]}')

# Expand the existing first-addition skill into concrete first-calculation steps.
addition_unit = 'atlas:math:addition:single-digit-within-ten'
for id_ in math_ids[5:]:
    edge(addition_unit, id_, 'decomposes_into', 'required', f'atlas-v021-addition-foundation-{id_.rsplit(":",1)[-1]}')

# Add two caregiver-practice ALUs beneath the existing Parent core capability.
parent_skill = 'atlas:skill:support-child-learning'
caregiver_units = [
 ('atlas:alu:life:support-early-communication', 'Practice supporting early communication',
  'Using a fictional family scenario, choose one accessible way to follow the child’s interest, respond to an early signal, model a meaningful word, sign, or symbol, and leave time for the child’s next message. Do not treat spoken words as the only valid outcome.',
  ['recognizes spoken, signed, gestural, picture, and AAC communication','models language or symbols in context without requiring imitation','knows when to seek qualified communication or hearing support'], 'ASHA milestones and early-intervention AAC guidance, plus Harvard serve-and-return guidance, inform this Atlas proposal. It is not diagnosis or therapy.'),
 ('atlas:alu:life:support-first-numeracy', 'Practice playful number talk and first calculations',
  'Using a fictional family scenario, choose an everyday playful activity that notices small quantities, models counting one item at a time, and combines or removes a small set. Adapt to the child’s interests and communication mode; do not turn routine play into a test.',
  ['chooses a concrete, accessible activity','models a quantity or count in context','connects a first combine-or-remove action to the resulting amount','adapts the activity to observed interest and current understanding'], 'IES early mathematics practice guidance informs this Atlas proposal. It is not a developmental screen or individualized instruction plan.'),
]
for id_, label, definition, criteria, basis in caregiver_units:
    unit(id_, label, definition, criteria, 'life_parent', asha + ies,
         basis, 'Fictional caregiver scenario and reflective activity design')
    edge(parent_skill, id_, 'decomposes_into', 'required', f'atlas-v021-{id_.rsplit(":",1)[-1]}')

# End the developmental routes at caregiver practice and at practical adult finance.
edge(comm_ids[-1], caregiver_units[0][0])
edge(math_ids[-1], caregiver_units[1][0])
edge('atlas:math:addition:within-twenty', 'atlas:alu:life-manage-personal-finances-1')

data['learning_units'].extend(units)
data['decompositions'].extend(edges)
data['metadata']['title'] = 'ESCO occupations and Atlas life-role learning pilot'
data['metadata']['decomposition'] += ' Capability Atlas developmental foundations v0.21.0 adds suggested early communication and numeracy routes: responsive exchanges through first meaningful words/signs/AAC messages, and small quantities through one-to-one counting, cardinality, numeral links, and first addition. These routes connect to caregiver practice and personal-finance learning; they are proposed pathways, not universal developmental schedules or diagnostic criteria.'
data['metadata']['source_note'] += ' Early-development content draws on ASHA communication milestones and AAC guidance, Harvard serve-and-return resources, and IES early mathematics practice guidance. All links and activities remain Atlas proposals.'
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print(f'Added {len(units)} developmental ALUs and {len(edges)} proposed relations.')
