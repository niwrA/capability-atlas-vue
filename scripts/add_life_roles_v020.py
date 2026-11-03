"""Add Atlas-draft life roles, separate from ESCO occupational roles."""
from dataset_io import load_dataset, save_dataset
import json
import re
from pathlib import Path

data=load_dataset()
if any(r.get('role_family')=='life' for r in data['roles']):
    raise SystemExit('Life roles already exist; refusing to add duplicates.')

life_sources={
 'social':[
  {'title':'European Commission JRC — LifeComp conceptual reference model','url':'https://joint-research-centre.ec.europa.eu/scientific-activities/key-competences-lifelong-learning/lifecomp/lifecomp-conceptual-reference-model_en'}],
 'parent':[
  {'title':'WHO/UNICEF/World Bank — Nurturing care for early childhood development','url':'https://www.who.int/publications/i/item/9789241514064/'},
  {'title':'UNICEF — Parenting of Adolescents Programming Guidance','url':'https://www.unicef.org/documents/parenting-adolescents-programming-guidance'}],
 'adult':[
  {'title':'EU/OECD-INFE — Financial competence framework for adults in the EU','url':'https://www.oecd.org/en/publications/financial-competence-framework-for-adults-in-the-european-union_510f133c-en.html'},
  {'title':'European Commission JRC — Digital Competence Framework (DigComp)','url':'https://joint-research-centre.ec.europa.eu/scientific-activities/key-competences-lifelong-learning/digital-competence-framework-digcomp_en'},
  {'title':'WHO — Health literacy','url':'https://www.who.int/news-room/fact-sheets/detail/health-literacy'},
  {'title':'European Commission JRC — LifeComp conceptual reference model','url':'https://joint-research-centre.ec.europa.eu/scientific-activities/key-competences-lifelong-learning/lifecomp/lifecomp-conceptual-reference-model_en'}]
}

skills={}
def add_skill(key,label,definition,domains,required=(),optional=()):
    skills[key]={'id':f'atlas:skill:{key}','label':label,'definition':definition,'domains':domains,'required':list(required),'optional':list(optional)}

friend='friend'; parent='parent'; adult='adult'
add_skill('listen-attentively','Listen attentively and check understanding','Give another person attention, invite their view, reflect what you heard, and check whether you understood without rushing to advise.', ['social'], required=[friend,parent])
add_skill('empathy-perspective-taking','Understand another person’s perspective','Consider another person’s feelings, experiences, and values while recognizing that their perspective may differ from yours.', ['social'], required=[friend])
add_skill('communicate-respectfully','Communicate honestly and respectfully','Express needs, appreciation, disagreement, and uncertainty in a clear way that respects the other person and the situation.', ['social'], required=[friend,parent,adult])
add_skill('reliable-follow-through','Build trust through reliability','Make realistic commitments, communicate when circumstances change, and follow through or repair a missed commitment.', ['social'], required=[friend])
add_skill('reciprocal-support','Offer and receive support reciprocally','Notice when support may be welcome, ask rather than assume, offer help within your capacity, and allow others to support you.', ['social'], required=[friend])
add_skill('respect-boundaries-consent','Respect boundaries, privacy, and consent','Notice stated and unstated limits, ask permission when appropriate, respect a refusal, and protect information shared in confidence.', ['social'], required=[friend,parent])
add_skill('repair-disagreement','Address disagreement and repair harm','Describe a disagreement without personal attacks, listen to the other view, acknowledge your contribution, and agree a next step when both people are ready.', ['social'], required=[friend,parent])
add_skill('maintain-connection','Maintain meaningful social connection','Make and sustain contact in ways that fit both people’s preferences, access needs, time, and circumstances.', ['social'], required=[friend], optional=[adult])
add_skill('support-friend-in-distress','Respond when a friend is in serious distress','Listen without promising secrecy about immediate danger, ask what support is wanted, and help connect the person with trusted or professional support when appropriate.', ['social'], optional=[friend])
add_skill('include-different-needs','Include people with different needs and circumstances','Adapt plans and communication to access needs, culture, resources, and preferences without assuming one person speaks for a whole group.', ['social'], required=[friend,parent,adult])

add_skill('responsive-caregiving','Notice and respond to a child’s cues','Observe a child’s verbal and non-verbal cues, respond warmly and predictably, and adapt the response to the child’s age, communication, and context.', ['parent'], required=[parent])
add_skill('understand-child-development','Use age-aware expectations','Use an age- and development-aware source to distinguish reasonable expectations from assumptions, and seek qualified guidance when a concern arises.', ['parent'], required=[parent])
add_skill('create-predictable-routines','Create workable family routines','Agree simple routines with the child where appropriate, explain transitions, and adapt routines when family circumstances or the child’s needs change.', ['parent'], required=[parent])
add_skill('set-positive-limits','Set clear, non-violent limits','State a specific, realistic expectation; explain a proportionate response; and follow through calmly without physical punishment, humiliation, or threats.', ['parent'], required=[parent])
add_skill('support-child-autonomy','Support a child’s growing autonomy','Offer choices appropriate to the child’s age and capacity, listen to their views, and adjust responsibility as skills and circumstances develop.', ['parent'], required=[parent])
add_skill('promote-child-safety','Support a child’s safety and protection','Recognize a safety concern, follow current local safeguarding guidance, document or share only what is needed, and seek help from the designated service or professional.', ['parent'], required=[parent])
add_skill('coordinate-child-support','Coordinate with caregivers and services','Share relevant information respectfully with co-caregivers, school, or services; clarify responsibilities and consent; and follow agreed plans.', ['parent'], required=[parent])
add_skill('parent-self-regulation','Manage stress and seek support','Notice when stress is affecting a decision or relationship, pause where safe, contact a trusted person or service, and return with a calmer response or revised plan.', ['social'], required=[parent,adult])
add_skill('support-child-learning','Support play, curiosity, and learning','Create age-appropriate opportunities for a child to explore, play, ask questions, and learn through everyday interaction without requiring costly materials.', ['parent'], required=[parent])
add_skill('support-child-specific-needs','Find support for a child’s additional needs','Describe the child’s strengths and support needs, listen to the child and family, and identify suitable qualified services without treating a diagnosis as a full description of the child.', ['parent'], optional=[parent])
add_skill('digital-family-safety','Agree age-aware digital safety practices','Discuss online opportunities and risks with the child, agree privacy and help-seeking steps, and adapt expectations to age, accessibility, and current guidance.', ['parent','adult'], optional=[parent,adult])
add_skill('coordinate-separated-care','Coordinate care across households','Use agreed communication and handover arrangements, keep the child out of adult conflict, and follow any applicable legal or professional arrangements.', ['parent'], optional=[parent])

add_skill('manage-personal-finances','Manage day-to-day personal finances','Use a simple budget to compare income, regular costs, savings goals, and irregular expenses; recognize uncertainty and avoid relying on unsupported financial promises.', ['adult'], required=[adult])
add_skill('pay-bills-and-keep-records','Pay bills and organize personal records','Track due dates, check bills against agreements, keep essential records in an accessible and secure place, and query errors with the relevant provider.', ['adult'], required=[adult])
add_skill('organize-household','Organize recurring household tasks','Plan recurring tasks, supplies, appointments, and basic upkeep using a routine that can be adjusted to time, health, disability, and available resources.', ['adult'], required=[adult])
add_skill('plan-food-safely','Plan food and household essentials','Plan a practical set of meals and essential supplies within budget, preferences, dietary needs, and food-safety information from a reliable local source.', ['adult'], required=[adult])
add_skill('use-digital-services-safely','Use digital services and protect accounts','Find and use common online services, manage strong authentication and account recovery, recognize suspicious requests, and seek help before sharing sensitive information.', ['adult'], required=[adult])
add_skill('evaluate-information','Evaluate information before acting','Check who produced information, its date and evidence, compare it with an authoritative source, and distinguish fact, opinion, advertising, and uncertainty.', ['adult','social'], required=[adult])
add_skill('navigate-health-services','Navigate health information and services','Find a suitable health service, prepare questions, understand the information provided, and ask for clarification or an interpreter; do not replace professional assessment with online searching.', ['adult'], required=[adult])
add_skill('manage-time-and-mobility','Plan time, appointments, and transport','Use calendars, reminders, and route information to plan commitments, allow for access and travel needs, and communicate early when plans change.', ['adult'], required=[adult])
add_skill('navigate-public-services','Find and use public or community services','Identify the responsible organization, check eligibility and current instructions from an official source, prepare requested information, and ask for assistance if access barriers arise.', ['adult'], required=[adult])
add_skill('everyday-problem-solving','Solve everyday problems and ask for help','Define the immediate problem, compare realistic options, consider safety and consequences, choose a reversible next step where possible, and seek help when the issue exceeds your knowledge or capacity.', ['adult','social'], required=[adult])
add_skill('prepare-for-emergencies','Prepare for common household disruptions','Know how to contact local emergency services, identify essential contacts and information, and agree a simple household plan suited to the people and risks involved.', ['adult'], required=[adult])
add_skill('manage-housing-agreements','Understand housing choices and agreements','Compare costs and responsibilities, read an agreement before committing, identify unclear terms, and seek independent tenant or legal advice when needed.', ['adult'], optional=[adult])
add_skill('support-dependents','Coordinate support for a dependent person','Clarify the person’s preferences, agreed responsibilities, service contacts, and backup arrangements while respecting their privacy and decision-making rights.', ['adult','parent'], optional=[adult])
add_skill('plan-work-study-transitions','Plan a work or study transition','Identify the goal, relevant deadlines, required documents, support options, and a manageable sequence of next actions; review the plan as circumstances change.', ['adult'], optional=[adult])

for item in skills.values():
    data['capabilities'].append({
        'id':item['id'],'label':item['label'],'label_nl':item['label'],'kind':'skill',
        'source':'Capability Atlas life-role framework','source_version':'0.20.0','official':False,
        'framework_domains':item['domains'],'definition':item['definition']
    })

roles=[
 {'key':'friend','id':'atlas:role:good-friend','label':'Good friend','note':'An Atlas-draft life role about mutual, respectful friendship. It is a flexible reflection scaffold, not a test of whether someone is a good friend.'},
 {'key':'parent','id':'atlas:role:parent','label':'Parent','note':'An Atlas-draft life role about responsive, safe, supportive caregiving. Children, families, cultures, and circumstances differ; use current local guidance and qualified support.'},
 {'key':'adult','id':'atlas:role:independent-adult','label':'Independent adult','note':'An Atlas-draft life role about managing everyday decisions and knowing when and how to use support. Independence does not mean doing everything alone.'},
]
role_by_key={r['key']:r for r in roles}
for role in roles:
    data['roles'].append({'id':role['id'],'label':role['label'],'kind':'role','source':'Capability Atlas','source_version':'0.20.0','official':False,'role_family':'life','note':role['note']})

assertions=[]
for key,item in skills.items():
    for role_key in item['required']:
        assertions.append({'from':role_by_key[role_key]['id'],'to':item['id'],'type':'atlas_required','validation':'proposed','source':'Capability Atlas life-role framework v0.20.0'})
    for role_key in item['optional']:
        assertions.append({'from':role_by_key[role_key]['id'],'to':item['id'],'type':'atlas_optional','validation':'proposed','source':'Capability Atlas life-role framework v0.20.0'})
data['role_capability_assertions'].extend(assertions)

units=[]; edges=[]
for key,item in skills.items():
    domains=item['domains']
    domain='parent' if 'parent' in domains and key not in {'listen-attentively','communicate-respectfully','respect-boundaries-consent','repair-disagreement','include-different-needs','parent-self-regulation','support-dependents','digital-family-safety'} else 'adult' if 'adult' in domains else 'social'
    if domain=='parent':
        methods='fictional family scenario and reflective role-play; use age-appropriate guidance'
        basis='Atlas-authored draft informed by WHO/UNICEF nurturing-care material and UNICEF parenting guidance. Not individualized parenting, safeguarding, or clinical advice.'
        steps=[
          ('Notice needs, context, and choices',f'Given a fictional family scenario about {item["label"].lower()}, identify the child’s stated or observable cues, relevant context, available guidance, and uncertainty. Consider developmental stage and family circumstances without assuming one approach fits every child.', ['distinguishes observed information from assumptions','uses age- and context-aware guidance','identifies when qualified or local support is needed']),
          ('Practice a safe, respectful response',f'In a fictional role-play, practice {item["label"].lower()} using the supplied family guidance. Explain the next step in clear language, respect the child’s dignity and developing agency, and identify how to review or seek support if the approach is not working.', ['uses a respectful, non-violent response','adapts to the child and family context','names a review or support route'])]
        sources=life_sources['parent']
    elif domain=='adult':
        methods='fictional everyday-life planning exercise using sample documents and local resource links'
        basis='Atlas-authored draft informed by EU/OECD-INFE financial competence, European Commission DigComp, WHO health-literacy, and LifeComp frameworks as relevant. Local laws, services, and circumstances vary.'
        steps=[
          ('Understand options and constraints',f'Using a fictional everyday scenario about {item["label"].lower()}, identify the goal, relevant documents or information, deadlines, costs or risks, and the authoritative local source to consult. Separate facts from assumptions and note when advice or support is needed.', ['identifies the goal and relevant constraints','checks a current and appropriate source','recognizes when to ask for qualified or community support']),
          ('Make and review a practical plan',f'Create a short, realistic plan for {item["label"].lower()} using the supplied sample information. Record the next actions and any deadlines, protect personal information, and state how you would check the result or revise the plan if circumstances change.', ['sets manageable next actions','records a check or review point','accounts for privacy, access needs, and available support'])]
        sources=life_sources['adult']
    else:
        methods='fictional conversation scenario and reflective role-play'
        basis='Atlas-authored draft informed by the European Commission JRC LifeComp social competences (empathy, communication, collaboration) and personal wellbeing. These are reflective skills, not a universal scoring standard for friendship.'
        steps=[
          ('Notice perspective, needs, and boundaries',f'Given a fictional friendship scenario about {item["label"].lower()}, identify what each person has said, what remains uncertain, and which preferences or boundaries should be checked directly. Avoid assuming that one communication style or level of contact suits everyone.', ['separates stated information from assumptions','recognizes differing perspectives and access needs','identifies a respectful way to check preferences']),
          ('Practice a mutual and respectful response',f'In a fictional role-play, practice {item["label"].lower()}. Communicate clearly, respect a refusal or different preference, and review whether the response supports mutual trust without exceeding your own capacity.', ['uses respectful, clear communication','respects consent, privacy, and capacity','identifies a repair or follow-up step when appropriate'])]
        sources=life_sources['social']
    slug=re.sub(r'[^a-z0-9]+','-',key).strip('-')
    for i,(unit_label,definition,criteria) in enumerate([(f'{item["label"]}: {steps[0][0]}',steps[0][1],steps[0][2]),(f'{item["label"]}: {steps[1][0]}',steps[1][1],steps[1][2])],1):
        unit_id=f'atlas:alu:life-{slug}-{i}'
        units.append({'id':unit_id,'label':unit_label,'label_nl':unit_label,'kind':'learning_unit','definition':definition,'source':'Capability Atlas life-role framework','source_version':'0.20.0','official':False,'status':'proposed','learning_domain':f'life_{domain}','estimated_active_learning_hours':{'min':1,'max':3,'basis':'illustrative short practice activity; not validated'},'assessment':{'method':methods,'criteria':criteria},'reusability':None,'evidence_basis':basis,'supporting_sources':sources})
        edges.append({'from':item['id'],'to':unit_id,'type':'decomposes_into','validation':'proposed','source':'Capability Atlas life-role framework v0.20.0','relation_id':f'atlas-life-decomp-{slug}-{i}','completion_requirement':'required'})
data['learning_units'].extend(units)
data['decompositions'].extend(edges)
data['metadata']['title']='ESCO occupations and Atlas life-role learning pilot'
data['metadata']['decomposition'] += ' Capability Atlas life-role framework v0.20.0 adds three draft roles outside ESCO (Good friend, Parent, Independent adult), with reusable, explicitly Atlas-authored capabilities and two proposed learning activities per capability. Role links distinguish Atlas core and context-dependent capabilities. Social content is informed by LifeComp; parenting content by WHO/UNICEF nurturing-care and parenting guidance; independent-adult content by LifeComp, DigComp, EU/OECD-INFE financial competence, and WHO health literacy. This is a flexible reflective framework, not a validated assessment or a universal prescription.'
save_dataset(data)
print(f'Added {len(roles)} life roles, {len(skills)} Atlas capabilities, {len(assertions)} role links, {len(units)} learning units and {len(edges)} decompositions.')
