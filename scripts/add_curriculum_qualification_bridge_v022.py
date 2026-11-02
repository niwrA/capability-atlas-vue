"""Add an initial Dutch curriculum-to-MBO qualification crosswalk."""
import json
from pathlib import Path

path = Path('src/data.json')
data = json.loads(path.read_text())
if any(x.get('id', '').startswith('sbb:') for x in data.get('qualifications', [])):
    raise SystemExit('Qualification bridge already exists; refusing duplicates.')

slo_url = 'https://slo-kerndoelen.files.svdcdn.com/production/uploads/assets/updates/Kerndoelenboekje-definitieve-conceptkerndoelen-Nederlands-en-rekenen-en-wiskunde.pdf?dm=1737022778'
slo_status_url = 'https://www.slo.nl/sectoren/po/kerndoelen/'
sbb_url = 'https://kwalificatie-mijn.s-bb.nl/Details/DownloadDocument/1963420'
sbb_sources = [{'title': 'SBB — Software development qualification dossier, version effective 2024-08-01', 'url': sbb_url}]
slo_sources = [
    {'title': 'SLO — Definitive concept core goals (revised 2025), Dutch and mathematics', 'url': slo_url},
    {'title': 'SLO — Current status of Dutch primary-school core goals', 'url': slo_status_url},
]

qualification_id = 'sbb:qualification:software-developer:25998'
outcomes = []
qualification_requirements = []
alignment_links = []
new_units = []
new_decompositions = []

def add_outcome(id_, label, label_nl, description, framework, code, stage, sources, status='in_force'):
    outcomes.append({
        'id': id_, 'label': label, 'label_nl': label_nl, 'kind': 'framework_outcome',
        'definition': description, 'framework': framework, 'framework_code': code,
        'education_stage': stage, 'source': framework, 'source_version': '2025',
        'official': True, 'official_status': status, 'supporting_sources': sources,
    })

def add_slo(id_suffix, label, dutch_label, description, code, stage, current_status='in_force'):
    add_outcome(f'slo:{id_suffix}', label, dutch_label, description,
                'SLO kerndoelen', code, stage, slo_sources, current_status)

def add_sbb_outcome(code, label_en, label_nl, short_description, part='beroepsspecifiek'):
    id_ = f'sbb:software-developer:2024:{code.lower().replace("-", ":")}'
    outcomes.append({
        'id': id_, 'label': f'MBO Software developer · {code} · {label_en}',
        'label_nl': label_nl, 'kind': 'framework_outcome',
        'definition': short_description, 'framework': 'SBB MBO qualification dossier',
        'framework_code': code, 'education_stage': 'mbo-level-4',
        'source': 'SBB', 'source_version': '2024 (effective 2024-08-01)',
        'official': True, 'official_status': 'qualification_requirement',
        'qualification_part': part, 'supporting_sources': sbb_sources,
    })
    qualification_requirements.append({
        'from': id_, 'to': qualification_id, 'type': 'qualification_requirement',
        'validation': 'source_backed', 'source': 'SBB qualification dossier 23399, profile 25998, version effective 2024-08-01',
        'source_url': sbb_url, 'requirement_part': part,
    })
    return id_

# SLO curriculum anchors. Current primary-school Dutch and mathematics goals
# were updated in 2025; SLO reports that they apply from August 2026.
po_nl3 = 'slo:po:nederlands:kerndoel-3:2025'
po_nl5 = 'slo:po:nederlands:kerndoel-5:2025'
po_nl9 = 'slo:po:nederlands:kerndoel-9:2025'
po_math1 = 'slo:po:rekenen-wiskunde:kerndoel-1:2025'
po_math3 = 'slo:po:rekenen-wiskunde:kerndoel-3:2025'
po_math5 = 'slo:po:rekenen-wiskunde:kerndoel-5:2025'
vo_math1 = 'slo:vo-onderbouw:rekenen-wiskunde:kerndoel-1:2025'
add_slo(po_nl3.removeprefix('slo:'), 'Primary Dutch 3 · Understand spoken and written texts', 'PO Nederlands kerndoel 3 · Luisteren en lezen met begrip', 'The learner demonstrates understanding of informational and literary texts through attentive listening, viewing, reading, vocabulary and knowledge-building, and retelling relevant meaning.', 'PO Nederlands kerndoel 3', 'primary')
add_slo(po_nl5.removeprefix('slo:'), 'Primary Dutch 5 · Speak and write for a purpose', 'PO Nederlands kerndoel 5 · Doelgericht spreken en schrijven', 'The learner speaks and writes in ways suited to purpose, audience and context, using an appropriate approach and revising communication where useful.', 'PO Nederlands kerndoel 5', 'primary')
add_slo(po_nl9.removeprefix('slo:'), 'Primary Dutch 9 · Take part in purposeful conversations', 'PO Nederlands kerndoel 9 · Doelgericht gesprekken voeren', 'The learner takes part in conversations suited to purpose, partners and context, listening, responding, contributing, and adapting communication.', 'PO Nederlands kerndoel 9', 'primary')
add_slo(po_math1.removeprefix('slo:'), 'Primary mathematics 1 · Whole and decimal numbers', 'PO Rekenen en wiskunde kerndoel 1 · Gehele en decimale getallen', 'The learner reasons and calculates with whole and decimal numbers, including comparison, ordering, operations, choosing methods, estimation and checking.', 'PO Rekenen en wiskunde kerndoel 1', 'primary')
add_slo(po_math3.removeprefix('slo:'), 'Primary mathematics 3 · Ratios', 'PO Rekenen en wiskunde kerndoel 3 · Verhoudingen', 'The learner reasons and calculates with ratios, percentages and scale, connects ratios with fractions and solves problems in concrete contexts.', 'PO Rekenen en wiskunde kerndoel 3', 'primary')
add_slo(po_math5.removeprefix('slo:'), 'Primary mathematics 5 · Interpret and represent data', 'PO Rekenen en wiskunde kerndoel 5 · Data', 'The learner interprets and represents data using tables, graphs or diagrams and draws and checks conclusions.', 'PO Rekenen en wiskunde kerndoel 5', 'primary')
add_slo(vo_math1.removeprefix('slo:'), 'Lower-secondary mathematics 1 · Numbers and quantities', 'VO onderbouw Rekenen en wiskunde kerndoel 1 · Getallen en grootheden', 'The learner reasons and calculates with numbers and quantities, using operations, number properties, ratios, units and measurement relationships.', 'VO onderbouw Rekenen en wiskunde kerndoel 1', 'lower-secondary')

# SBB qualification requirement outcomes, kept separate from the qualification.
work = [
 ('B1-K1-W1', 'Coordinate a software assignment, plan work and monitor progress', 'Stem opdracht af, plan werkzaamheden en bewaak de voortgang', 'Clarify the assignment, plan software work, communicate changes and monitor progress.'),
 ('B1-K1-W2', 'Create a technical software design', 'Maak een technisch ontwerp voor software', 'Develop a technical design that responds to requirements, alternatives, context and constraints.'),
 ('B1-K1-W3', 'Implement software components', 'Realiseer (onderdelen van) software', 'Implement software components to the agreed design and requirements, using tools, code conventions and relevant quality constraints.'),
 ('B1-K1-W4', 'Test software', 'Test software', 'Prepare and execute software tests, interpret results and record plausible conclusions.'),
 ('B1-K1-W5', 'Propose software improvements', 'Doe verbetervoorstellen voor de software', 'Interpret feedback, test results or reports and agree proposals for software improvement.'),
 ('B1-K2-W1', 'Work in an ICT project team', 'Werk samen in een projectteam', 'Coordinate tasks and collaborate with colleagues and relevant stakeholders in an ICT project team.'),
 ('B1-K2-W2', 'Present completed work', 'Presenteer het opgeleverde werk', 'Present a deliverable, explain work and choices, answer questions and check that the message is understood.'),
 ('B1-K2-W3', 'Evaluate collaboration', 'Evalueer de samenwerking', 'Reflect on personal performance and team process, identify improvements and act on learning needs.'),
]
sbb_ids={code:add_sbb_outcome(code,label,nl,definition) for code,label,nl,definition in work}
generic = [
 ('GEN-NL', 'Generic Dutch language requirement', 'Generiek examenonderdeel Nederlandse taal', 'The qualification dossier includes the national generic examination requirements for Dutch language.'),
 ('GEN-MATH', 'Generic mathematics requirement', 'Generiek examenonderdeel rekenen', 'The qualification dossier includes the national generic examination requirements for mathematics.'),
 ('GEN-CAREER-CITIZENSHIP', 'Career and citizenship requirement', 'Generiek examenonderdeel loopbaan en burgerschap', 'The qualification dossier includes national generic requirements for career and citizenship.'),
 ('GEN-ENGLISH', 'Generic English requirement (MBO level 4)', 'Generiek examenonderdeel Engels (alleen niveau 4)', 'The qualification dossier includes the national generic English examination requirement for MBO level 4.'),
]
for code,label,nl,description in generic:
    sbb_ids[code]=add_sbb_outcome(code,label,nl,description,'generiek')

qualifications=[{
    'id': qualification_id, 'label': 'MBO diploma · Software developer',
    'label_nl': 'MBO-diploma · Software developer', 'kind': 'qualification',
    'definition': 'A Dutch MBO qualification for Software developer. This record points to the SBB 2024 qualification dossier, profile 25998 in dossier 23399; the dossier describes the qualification requirements and the required generic examination components.',
    'source': 'SBB Kwalificatiestructuur', 'source_code': 'qualification 25998; dossier 23399',
    'source_version': '2024 (effective 2024-08-01)', 'official': True,
    'qualification_type': 'formal_mbo_diploma', 'mbo_level': 4, 'eqf_level': 4,
    'valid_from': '2024-08-01', 'supporting_sources': sbb_sources,
    'note': 'The qualification is awarded by an authorized education provider after its formal assessment. Atlas route completion does not confer this diploma.',
}]

def add_unit(id_,label,nl,definition,criteria,domain='school',hours=(1,3)):
    new_units.append({
        'id':id_,'label':label,'label_nl':nl,'kind':'learning_unit','definition':definition,
        'source':'Capability Atlas school-to-qualification bridge','source_version':'0.22.0',
        'official':False,'status':'proposed','learning_domain':domain,
        'estimated_active_learning_hours':{'min':hours[0],'max':hours[1],'basis':'illustrative guided practice; not validated'},
        'assessment':{'method':'short practical task with accessible text, objects or sample data','criteria':criteria},
        'reusability':None,
        'evidence_basis':'Atlas-authored learning activity aligned as a partial illustration of a referenced outcome; it does not by itself meet a curriculum or qualification requirement.',
        'supporting_sources':slo_sources+sbb_sources,
    })

school_units={
 'read-short-instructions':('Read a short text and find the key information','Lees een korte tekst en vindt de kerninformatie','Read or listen to a short accessible informational text, identify the question or purpose, and locate the information needed to respond.',['identifies the purpose or question','locates relevant details in the text','explains the response in their own words'],'school_language'),
 'retell-and-summarize':('Retell a text and distinguish its main idea','Vertelt een tekst na en benoemt de hoofdgedachte','After reading or listening to a short story or informational text, retell the main events or ideas and distinguish them from one supporting detail.',['states a relevant main idea','selects a supporting detail','uses an accessible spoken, signed, written or AAC-supported response'],'school_language'),
 'write-purposeful-message':('Write a short message for a reader','Schrijft een korte boodschap voor een lezer','Plan and write a short message for a stated reader and purpose, then revise it so the intended information is clear.',['identifies the reader and purpose','organizes the message so it can be followed','makes a revision based on a reader check'],'school_language'),
 'contribute-to-purposeful-conversation':('Contribute to a purposeful learning conversation','Draagt bij aan een doelgericht leergesprek','In a paired or small-group task, take a turn, listen and respond to another person, ask a relevant question, and help state a shared conclusion.',['contributes a relevant idea or question','responds to a partner’s contribution','summarizes or records a shared conclusion'],'school_language'),
 'place-value-to-1000':('Represent and compare whole numbers to 1,000','Representeert en vergelijkt hele getallen tot 1.000','Represent whole numbers to 1,000 with objects, place-value charts, numerals and number lines, then compare and order them.',['matches a representation to a numeral','explains the value of a digit by position','orders and compares numbers accurately'],'school_numeracy'),
 'add-subtract-to-1000':('Add and subtract whole numbers to 1,000','Telt hele getallen tot 1.000 op en trekt ze af','Solve practical addition and subtraction problems with whole numbers to 1,000, choose a suitable written or mental method, and estimate to check the result.',['selects a method appropriate to the numbers','calculates and records the result','uses an estimate to judge plausibility'],'school_numeracy'),
 'interpret-decimals-in-context':('Interpret decimals in money and measurement','Interpreteert decimalen bij geld en meten','Use decimal numbers in simple money or measurement examples, compare values and explain what the digits represent in context.',['reads and compares decimal values','connects a decimal to a stated quantity or amount','checks the reasonableness of a result'],'school_numeracy'),
 'model-common-fractions':('Model common fractions as equal parts','Modelleert eenvoudige breuken als gelijke delen','Use shapes, collections or a number line to represent common fractions as equal parts of a whole and compare simple examples.',['divides a whole into equal parts','matches a fraction name or notation to a model','compares simple fractions using the model'],'school_numeracy'),
 'connect-fractions-decimals-ratios':('Connect fractions, decimals, ratios and percentages','Verbindt breuken, decimalen, verhoudingen en procenten','Use a visual model or supplied context to connect common fractions, decimal numbers, ratios and percentages; explain which representation is useful for the question.',['represents the same relationship in two forms','performs a simple supported conversion','explains the quantity or relationship represented'],'school_numeracy'),
 'interpret-data-display':('Interpret a simple table or graph and explain a conclusion','Interpreteert een tabel of grafiek en licht een conclusie toe','Read a simple table, pictogram, bar chart or line graph, answer a question using the data, and explain one conclusion and its limit.',['reads the displayed categories and values correctly','supports a conclusion with a relevant value','does not claim more than the displayed data shows'],'school_numeracy'),
 'present-a-technical-result':('Present a technical result to a teammate or client','Presenteert een technisch resultaat aan een teamgenoot of opdrachtgever','Present a small software change or test result to a specified audience, explain what was done and why, answer questions, and check whether the key message was understood.',['structures the explanation around purpose and audience','supports claims with a supplied artifact or test result','answers a question and checks shared understanding'],'vocational_communication'),
}
for slug,args in school_units.items():
    add_unit(f'atlas:alu:school:{slug}',*args)

# Learning progressions are Atlas proposals; official outcomes remain separate nodes.
def add_edge(a,b,typ='prerequisite_for',validation='proposed',source='Capability Atlas school-to-qualification bridge v0.22.0',**extra):
    obj={'from':a,'to':b,'type':typ,'validation':validation,'source':source}
    obj.update(extra)
    (qualification_requirements if typ=='qualification_requirement' else alignment_links if typ=='supports_outcome' else new_decompositions).append(obj)

add_edge('atlas:alu:development:numeracy:represent-first-addition','atlas:alu:school:place-value-to-1000')
add_edge('atlas:alu:school:place-value-to-1000','atlas:alu:school:add-subtract-to-1000')
add_edge('atlas:alu:school:add-subtract-to-1000','atlas:alu:school:interpret-decimals-in-context')
add_edge('atlas:alu:school:add-subtract-to-1000','atlas:alu:school:model-common-fractions')
add_edge('atlas:alu:school:model-common-fractions','atlas:alu:school:connect-fractions-decimals-ratios')
add_edge('atlas:alu:school:interpret-data-display','atlas:alu:school:connect-fractions-decimals-ratios')

# School activities partially illustrate the outcomes; no one ALU is equivalent to a standard.
for unit_id in ['atlas:alu:development:numeracy:notice-small-quantities','atlas:alu:development:numeracy:experience-number-words','atlas:alu:development:numeracy:match-count-word-to-object','atlas:alu:development:numeracy:understand-counted-total','atlas:alu:development:numeracy:connect-quantity-word-symbol','atlas:alu:development:numeracy:combine-two-small-sets','atlas:alu:development:numeracy:represent-first-addition','atlas:alu:school:place-value-to-1000','atlas:alu:school:add-subtract-to-1000']:
    add_edge(unit_id,po_math1,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:model-common-fractions','atlas:alu:school:connect-fractions-decimals-ratios','atlas:math:percent:interpret-parts-per-hundred','atlas:math:percent:convert-to-factor','atlas:math:percent:multiply-amount','atlas:alu:life-manage-personal-finances-1']:
    add_edge(unit_id,po_math3,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:place-value-to-1000','atlas:alu:school:add-subtract-to-1000','atlas:alu:school:interpret-decimals-in-context','atlas:alu:school:model-common-fractions','atlas:alu:school:connect-fractions-decimals-ratios','atlas:math:percent:interpret-parts-per-hundred','atlas:math:percent:convert-to-factor','atlas:math:percent:multiply-amount']:
    add_edge(unit_id,vo_math1,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:read-short-instructions','atlas:alu:school:retell-and-summarize']:
    add_edge(unit_id,po_nl3,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:write-purposeful-message','atlas:alu:school:retell-and-summarize','atlas:alu:school:present-a-technical-result','atlas:software:documentation:document-technical-behavior']:
    add_edge(unit_id,po_nl5,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:contribute-to-purposeful-conversation','atlas:alu:school:present-a-technical-result']:
    add_edge(unit_id,po_nl9,'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:interpret-data-display']:
    add_edge(unit_id,po_math5,'supports_outcome',mapping_scope='partial_illustration')

# Selected existing Atlas software activities are draft partial alignments to SBB work processes.
for unit_id in ['atlas:software:requirements:extract-user-need','atlas:software:scale:break-down-work','atlas:software:scale:estimate-and-adjust','atlas:software:scale:set-project-boundary','atlas:software:scale:track-risk-and-change']:
    add_edge(unit_id,sbb_ids['B1-K1-W1'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:design:map-control-flow','atlas:software:design:separate-responsibilities','atlas:software:scale:read-system-diagram','atlas:software:scale:review-diagram-change','atlas:software:scale:make-quality-criteria-measurable','atlas:software:scale:generate-alternatives']:
    add_edge(unit_id,sbb_ids['B1-K1-W2'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:prototype:build-thin-slice','atlas:software:programming:implement-and-explain-function','atlas:software:reuse:use-a-library-through-its-interface','atlas:software:tools:record-change-in-version-control','atlas:software:scale:define-component-contract','atlas:software:scale:integrate-and-observe']:
    add_edge(unit_id,sbb_ids['B1-K1-W3'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:scale:reproduce-fault','atlas:software:scale:isolate-fault','atlas:software:scale:verify-fix','atlas:software:scale:test-concurrent-behavior','atlas:software:scale:triage-anomaly','atlas:software:scale:verify-anomaly-correction']:
    add_edge(unit_id,sbb_ids['B1-K1-W4'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:evolution:revise-a-feature-from-feedback','atlas:software:scale:generate-alternatives','atlas:software:scale:select-testable-idea','atlas:software:scale:assess-technology-change','atlas:software:scale:plan-adoption-checkpoint']:
    add_edge(unit_id,sbb_ids['B1-K1-W5'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:scale:prepare-review','atlas:software:scale:close-change','atlas:software:scale:review-delivery','atlas:alu:school:contribute-to-purposeful-conversation']:
    add_edge(unit_id,sbb_ids['B1-K2-W1'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:present-a-technical-result']:
    add_edge(unit_id,sbb_ids['B1-K2-W2'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:software:scale:review-delivery','atlas:software:scale:close-change','atlas:alu:school:present-a-technical-result']:
    add_edge(unit_id,sbb_ids['B1-K2-W3'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:school:read-short-instructions','atlas:alu:school:retell-and-summarize','atlas:alu:school:write-purposeful-message','atlas:alu:school:contribute-to-purposeful-conversation','atlas:alu:school:present-a-technical-result','atlas:software:documentation:document-technical-behavior']:
    add_edge(unit_id,sbb_ids['GEN-NL'],'supports_outcome',mapping_scope='partial_illustration')
for unit_id in ['atlas:alu:development:numeracy:notice-small-quantities','atlas:alu:development:numeracy:experience-number-words','atlas:alu:development:numeracy:match-count-word-to-object','atlas:alu:development:numeracy:understand-counted-total','atlas:alu:development:numeracy:connect-quantity-word-symbol','atlas:alu:development:numeracy:combine-two-small-sets','atlas:alu:development:numeracy:represent-first-addition','atlas:alu:school:place-value-to-1000','atlas:alu:school:add-subtract-to-1000','atlas:alu:school:interpret-decimals-in-context','atlas:alu:school:model-common-fractions','atlas:alu:school:connect-fractions-decimals-ratios','atlas:math:percent:interpret-parts-per-hundred','atlas:math:percent:convert-to-factor','atlas:math:percent:multiply-amount','atlas:alu:school:interpret-data-display']:
    add_edge(unit_id,sbb_ids['GEN-MATH'],'supports_outcome',mapping_scope='partial_illustration')

data.setdefault('framework_outcomes',[]).extend(outcomes)
data.setdefault('qualifications',[]).extend(qualifications)
data.setdefault('qualification_requirements',[]).extend(qualification_requirements)
data.setdefault('outcome_capability_links',[]).extend(alignment_links)
data['learning_units'].extend(new_units)
data['decompositions'].extend(new_decompositions)
data['metadata']['source'] += ' plus SLO curriculum outcomes and SBB MBO Software developer qualification requirements'
data['metadata']['decomposition'] += ' Capability Atlas school-to-qualification bridge v0.22.0 adds partial Atlas mappings to current SLO primary and lower-secondary Dutch and mathematics outcomes, plus the versioned SBB Software developer MBO level 4 qualification dossier (profile 25998, dossier 23399). Official outcomes and qualification requirements are represented as separate nodes; Atlas learning-unit alignments are proposed and partial, not equivalences or claims of qualification readiness. Several official requirements remain unmapped.'
data['metadata']['source_note'] += ' SLO curriculum outcome records retain their sector, kerndoel code, and status; SBB qualification requirements retain dossier version and source. Partial Atlas alignments do not satisfy or certify official outcomes.'
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print(f'Added {len(outcomes)} curriculum/qualification outcome nodes, {len(qualifications)} qualification, {len(new_units)} school ALUs, {len(qualification_requirements)} qualification requirement links, {len(alignment_links)} proposed outcome alignments, and {len(new_decompositions)} progression relations.')
