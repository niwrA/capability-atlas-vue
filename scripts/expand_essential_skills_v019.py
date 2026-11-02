"""Add a broad, source-informed learning scaffold for undecomposed ESCO Essential skills."""
import json
import re
import unicodedata
from pathlib import Path

path = Path('src/data.json')
data = json.loads(path.read_text())
cap_by_id = {c['id']: c for c in data['capabilities']}
covered = {e['from'] for e in data['decompositions'] if e['type'] == 'decomposes_into'}
roots, seen = [], set()
for rel in data['role_capability_assertions']:
    if rel['type'] == 'esco_essential' and rel['to'] not in covered and rel['to'] not in seen:
        roots.append(rel['to'])
        seen.add(rel['to'])

sources = {
    'finance': [
        {'title': 'Belastingdienst — Een administratie opzetten voor uw belastingaangiften', 'url': 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/ondernemen/administratie/een_administratie_opzetten'},
        {'title': 'IFRS — Conceptual Framework for Financial Reporting (2026 issued text)', 'url': 'https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2026/issued/cf.html'},
    ],
    'electrical': [
        {'title': 'NEN — NEN 1010 low-voltage installations', 'url': 'https://www.nen.nl/en/elektrotechniek/installatievoorschriften/nen-1010-laagspanningsinstallaties'},
        {'title': 'NEN — NEN 3140 low-voltage installation operations and safety', 'url': 'https://www.nen.nl/elektrotechniek/werkvoorschriften/laagspanninginstallaties'},
    ],
    'software_testing': [
        {'title': 'ISTQB — Certified Tester Foundation Level v4.0 overview', 'url': 'https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/'},
        {'title': 'ISTQB — CTFL v4.0.1 syllabus', 'url': 'https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf'},
    ],
    'health': [
        {'title': 'V&VN — The nursing process', 'url': 'https://www.venvn.nl/afdelingen/wijkverpleegkundigen/kennisplatform/het-verpleegkundig-proces'},
        {'title': 'WHO — Global Patient Safety Action Plan 2021–2030', 'url': 'https://www.who.int/publications/i/item/9789240032705'},
        {'title': 'V&VN — Clinical reasoning for nurses', 'url': 'https://www.venvn.nl/afdelingen/wijkverpleegkundigen/kennisplatform/beroepskennis/hoe-laat-je-het-verpleegkundig-proces-zo-effectief-mogelijk-verlopen'},
    ],
}

clinical_knowledge = {
    'adolescence medicine', 'biological chemistry', 'dietetics', 'general medicine', 'geriatrics',
    'human anatomy', 'human physiology', 'nursing science', 'pathology', 'pharmacology', 'psychiatry',
    'psychology', 'public health', 'sociology', 'surgery', 'paediatrics', 'primary care', 'acute care',
    'newborn care', 'infection control', 'palliative care', 'disability care', 'apply health sciences',
    'scientific research methodology', 'evidence-based nursing care',
}
clinical_practice = {
    'deal with emergency care situations', 'initiate life preserving measures', 'first aid', 'resuscitation',
    'safe management of medicines', 'provide treatment strategies for challenges to human health',
    'apply context specific clinical competences', 'implement nursing care', 'implement fundamentals of nursing',
    'provide professional care in nursing', 'provide basic support to patients', 'apply nursing care in long-term care',
    'support nurses', 'follow clinical guidelines', 'infection control', 'hygiene in a health care setting',
    'diagnose nursing care', 'plan nursing care', 'identify abnormalities',
}

units, edges = [], []
edge_ix = sum(e['type'] == 'decomposes_into' for e in data['decompositions'])
for root in roots:
    skill = cap_by_id[root]
    label = skill['label']
    low = label.lower()
    if any(t in low for t in ('account', 'financial', 'bookkeep', 'tax', 'commercial law', 'depreciation', 'statistics')):
        domain = 'finance'
    elif low in {'work ergonomically', 'react to events in time-critical environments'} or any(t in low for t in ('electric', 'wire', 'cable', 'electrical', 'precision tools', 'construction', 'measurement instruments', 'building systems')):
        domain = 'electrical'
    elif any(t in low for t in ('software', 'test findings', 'testing documentation', 'levels of software testing', 'customer software', 'software metrics', 'software architecture')) or low == 'address problems critically':
        domain = 'software_testing'
    else:
        domain = 'health'

    if domain == 'finance':
        steps = [
            (f'Identify evidence and rules for {label}',
             f'Using a fictional organization and supplied source records, identify the documents, dates, accounts, policy or jurisdictional rules relevant to {label}. Separate verified facts from assumptions, note missing evidence, and use only current materials supplied for the exercise.',
             'fictional accounting workpaper with supplied source records and rules',
             ['selects relevant source records and supplied rules', 'records missing or inconsistent evidence', 'does not infer a legal or tax conclusion beyond supplied materials']),
            (f'Apply and reconcile {label} in a workpaper',
             f'Complete a bounded fictional case involving {label} using the supplied accounting policy or current tax material. Show the calculation or decision trail, link each result to source evidence, cross-check totals or period boundaries, and flag uncertainty for qualified review.',
             'fictional accounting workpaper with supplied source records and rules',
             ['produces a traceable workpaper', 'reconciles outputs to source records and the supplied rule', 'flags exceptions and review needs']),
        ]
        basis = 'Atlas-authored practice scaffold informed by Belastingdienst administrative guidance and the IFRS Conceptual Framework. Not tax, legal, or accounting advice; use current jurisdiction-specific rules.'
        hours = (1, 4)
    elif domain == 'electrical':
        steps = [
            (f'Plan a safe training task for {label}',
             f'From a supplied diagram, equipment specification, task brief, and training risk assessment, identify the conditions, tools, competence boundaries, isolation requirements, and verification criteria relevant to {label}. Stop and seek the responsible supervisor if authorization, isolation, or safe conditions are unclear.',
             'supervised simulation on de-energized training equipment, or diagram-only exercise',
             ['uses the provided drawing and task specification', 'identifies hazards and authority limits before work', 'states stop-work and supervisor escalation conditions']),
            (f'Practice and verify {label} on isolated training equipment',
             f'In a supervised simulation using de-energized training equipment or a diagram-only exercise, perform or inspect the specified part of {label} against the provided procedure and criteria. Record observations and checks, compare results with supplied acceptance limits, and report deviations; this unit is not an instruction for live work.',
             'supervised simulation on de-energized training equipment, or diagram-only exercise',
             ['follows the supplied training procedure and supervision', 'records observations against stated criteria', 'stops and escalates deviations rather than improvising']),
        ]
        basis = 'Atlas-authored practice scaffold informed by NEN overviews of NEN 1010 and NEN 3140. Current standards, employer authorization, training, and supervision govern real work; not an electrical work instruction.'
        hours = (2, 5)
    elif domain == 'software_testing':
        steps = [
            (f'Analyze a sample test case for {label}',
             f'Using a small synthetic application, test basis, and version/build identifier, define the scope of {label}. Identify observable conditions, relevant risks, test data, expected results, and environment or level constraints; link each planned check to the stated requirement or architecture view.',
             'repeatable test exercise using a sample application and synthetic data',
             ['defines observable, traceable test conditions', 'selects relevant synthetic test data and environment details', 'states assumptions and coverage limits']),
            (f'Execute and report evidence for {label}',
             f'Run or review a repeatable check for {label} against the supplied sample application. Compare expected and actual behavior, record the build, environment, steps, evidence, and result, then communicate defects or coverage limits in a concise report without using real customer data.',
             'repeatable test exercise using a sample application and synthetic data',
             ['reproduces or repeats the check from recorded steps', 'distinguishes expected from observed behavior', 'reports evidence, impact, and limits clearly']),
        ]
        basis = 'Atlas-authored practice scaffold informed by the ISTQB Certified Tester Foundation Level v4.0.1 syllabus. Not an ISTQB course or certification.'
        hours = (1, 4)
    else:
        if low in clinical_knowledge:
            steps = [
                (f'Interpret supplied evidence for {label}',
                 f'Using a fictional learning case and instructor-selected current reference on {label}, identify relevant concepts and evidence. Distinguish established information from uncertainty, connect the concepts to the case without diagnosing or prescribing, and note where a qualified clinician or local guideline is needed.',
                 'case-based learning review using instructor-selected current references',
                 ['uses the supplied reference rather than unsupported recall', 'distinguishes case facts from interpretation and uncertainty', 'identifies the relevant professional or local-guideline boundary']),
                (f'Explain {label} in a bounded case review',
                 f'Explain how the supplied reference on {label} informs a fictional case or learning question. Present the reasoning in plain language, state limitations and missing information, and identify what would require assessment or action by an authorized professional under current local policy.',
                 'case-based learning review using instructor-selected current references',
                 ['explains the relevant concept against the supplied source', 'states limits and missing information', 'does not convert the exercise into unsupervised clinical advice']),
            ]
            hours = (2, 6)
        elif low in clinical_practice:
            steps = [
                (f'Scope and prepare a supervised scenario for {label}',
                 f'For a fictional case, locate the current local protocol and assigned care plan relevant to {label}. Identify the learner’s authorized role, required supervision, person’s preferences, safety checks, and escalation route before proposing any action; do not supply clinical thresholds or procedures from memory.',
                 'supervised simulation using a supplied current local protocol; no live-patient practice',
                 ['uses the current local protocol and assigned plan', 'checks role authorization, consent, and required supervision', 'identifies stop and escalation conditions']),
                (f'Review {label} in a supervised simulation',
                 f'In simulation only, demonstrate or review the assigned learning objective for {label} using the supplied current protocol and supervisor direction. Communicate respectfully, record objective observations in the exercise record, and escalate uncertainty through the designated route. This unit does not authorize independent clinical practice.',
                 'supervised simulation using a supplied current local protocol; no live-patient practice',
                 ['follows the supplied protocol within the assigned role', 'communicates and documents objectively', 'seeks supervisor support when criteria or scope are unclear']),
            ]
            hours = (2, 6)
        else:
            steps = [
                (f'Identify context and boundaries for {label}',
                 f'Given a fictional care or service scenario, identify the person’s stated needs and preferences, relevant observations, assigned plan, and organizational or legal boundaries related to {label}. Separate facts from interpretation, protect confidentiality, and identify who must be consulted when the plan or authority is unclear.',
                 'fictional, supervised case exercise with a supplied care plan and local guidance',
                 ['uses the person’s stated preferences and supplied plan', 'separates observation from inference', 'identifies confidentiality, role, and escalation boundaries']),
                (f'Apply {label} in a supervised case exercise',
                 f'Complete a fictional, supervised case exercise involving {label}. Use the supplied care plan and current organizational guidance, communicate with the person and relevant team members, record objective information, and review whether the intended outcome was met; do not invent clinical advice or policy.',
                 'fictional, supervised case exercise with a supplied care plan and local guidance',
                 ['follows the supplied plan and local guidance', 'communicates and records relevant information respectfully', 'reviews the outcome and escalates unmet needs or uncertainty']),
            ]
            hours = (1, 5)
        basis = 'Atlas-authored practice scaffold informed by V&VN material on the nursing process and WHO patient-safety guidance; local protocols and role scope govern practice. Not clinical guidance.'

    slug = unicodedata.normalize('NFKD', label).encode('ascii', 'ignore').decode().lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')[:52]
    suffix = root.rsplit('/', 1)[-1][:8].lower()
    children = []
    for number, (unit_label, definition, method, criteria) in enumerate(steps, 1):
        unit_id = f'atlas:alu:{slug}-{suffix}-{number}'
        children.append(unit_id)
        units.append({
            'id': unit_id, 'label': unit_label, 'label_nl': unit_label,
            'kind': 'learning_unit', 'definition': definition,
            'source': 'Capability Atlas', 'source_version': '0.19.0',
            'official': False, 'status': 'proposed', 'learning_domain': domain,
            'estimated_active_learning_hours': {'min': hours[0], 'max': hours[1], 'basis': 'illustrative estimate for one focused activity; not empirically validated'},
            'assessment': {'method': method, 'criteria': criteria}, 'reusability': None,
            'evidence_basis': basis, 'supporting_sources': sources[domain],
        })
    for child in children:
        edge_ix += 1
        edges.append({
            'from': root, 'to': child, 'type': 'decomposes_into',
            'validation': 'proposed', 'source': 'Capability Atlas broad essential-skill expansion v0.19.0',
            'relation_id': f'atlas-expansion-2026-decomp-{edge_ix:04d}',
            'completion_requirement': 'required',
        })

data['learning_units'].extend(units)
data['decompositions'].extend(edges)
data['metadata']['decomposition'] += (' Capability Atlas expansion v0.19.0 adds two proposed learning units for each of the previously undecomposed unique ESCO Essential skill nodes across the eight occupations. The new strand-specific exercises are source-informed, use fictional cases or controlled simulations, and remain unvalidated; local tax rules, electrical standards and authorization, testing context, and clinical scope govern real practice.')
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Added {len(units)} learning units and {len(edges)} required decomposition edges across {len(roots)} unique essential skills.')
