"""Create two Atlas-authored draft learning steps for undecomposed ESCO sample skills.

Official ESCO labels/types and role-skill mappings remain unchanged. The rule-based
learning content is proposed, not an ESCO prerequisite standard or validated rubric.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "src" / "data.json"
VERSION = "0.26.0"
SOURCE = "Capability Atlas ESCO skill-breakdown draft v0.26.0"
READING_ROOT = "atlas:alu:profession-foundation:communication:read-and-produce-practical-texts"
NUMERACY_ROOT = "atlas:alu:profession-foundation:numeracy:solve-routine-number-problems"

NUMBER_TERMS = re.compile(
    r"\b(calculate|calculation|count|estimate|measure|measurement|numer|quantity|quantit|"
    r"statistic|budget|price|rate|ratio|percent|dose|weigh|weight|length|volume|currency|"
    r"cost|finance|tax|payment|account|stock level|financial|sales figure|data processing|"
    r"currenc\w*|shipment payment|investment|property value|electricity consumption)\b",
    re.I,
)
LAW_TERMS = re.compile(
    r"\b(law|legal|legislation|regulat\w*|complian\w*|comply|standard|polic\w*|"
    r"procedur\w*|permit|authorization|licen[cs]e|safety|welfare|hygiene|quality assurance|"
    r"data protection|privacy|ethical code|ethical practice|equal pay|human rights|employee rights|"
    r"corporate governance|social change|social awareness|issue fines)\b",
    re.I,
)
MILITARY_TERMS = re.compile(
    r"\b(military|weapon|weaponry|battle|combat|ammunition|explosive|ordnance|warfare|"
    r"troop|firearm|targeting|military operation|geolocation|battlefield|land mine|disarm)\b",
    re.I,
)
HEALTH_TERMS = re.compile(
    r"\b(patient|clinical|medical|nurs|diagnos|medication|drug|dose|therap|healthcare|"
    r"health care|vital signs|infection|specimen|care plan)\b",
    re.I,
)
HAZARD_TERMS = re.compile(
    r"\b(electrical|high voltage|chemical|hazard|aircraft|aviation|machinery|industrial|"
    r"heavy vehicle|confined space|fire safety|radiation|explosive|weapon|military)\b",
    re.I,
)
DIGITAL_TERMS = re.compile(
    r"\b(computer|software|programming|program|ICT|digital|data|information technology|"
    r"database|website|web|application|network|cyber|code|coding|automation|Haskell|Erlang|"
    r"Ruby|Lisp|Prolog|Visual Basic|JavaScript|Java|Perl|Smalltalk|Groovy|ASP\.NET|XQuery|"
    r"SPARQL|Maven|Puppet|MDX|STAF|APL|API|Objective-C|COBOL|Ansible|AJAX|LINQ|"
    r"query language|software configuration|virtual learning environment|video game|LDAP|N1QL|"
    r"VBScript|firewall|work with virtual learning environments|read 3D displays|"
    r"C\+\+|TypeScript|MATLAB|ABAP|SAP R3|\bR\b|Scala|PHP)\b",
    re.I,
)
ANIMAL_LAND_TERMS = re.compile(
    r"\b(animal\w*|livestock|veterinary|veterinarian|pet|dog|horse|fish|fishery|aquaculture|"
    r"crop|tree|vineyard|grape|farm|agricultural|agriculture|forestry|horticulture|"
    r"greenhouse|plant disease|slaughter|breeding|biomass|soil|harvest|beekeeping|dairy|poultry|"
    r"wilderness|tree protection|broodstock|pesticide\w*|herbicide\w*|lawn care|feed pets|bathe dogs|"
    r"care for the flock|vine maintenance|work with veterinarians|educate people about nature)\b",
    re.I,
)
FOOD_HOSPITALITY_TERMS = re.compile(
    r"\b(food|ingredient|chocolate|wine|tea|coffee|recipe|restaurant|catering|kitchen|"
    r"hygienic practices in food|food production|food supply|hospitality|hotel|barrel|"
    r"bake\w*|cook\w*|culinary|flavour|flavor|food aesthetic|soap|gambling|betting|"
    r"amusement park|guest|accommodation|visitor information|product quality)\b",
    re.I,
)
TRANSPORT_TERMS = re.compile(
    r"\b(aircraft|aviation|air traffic|airport|ship|vessel|maritime|helicopter|flight|"
    r"passenger|cargo|freight|transport|vehicle|driv|route planning|dock|port|crew|"
    r"logistic\w*|load\w*|unload\w*|supply chain|traffic|sail\w*|navigation|passenger|"
    r"vehicle part|secured transportation|dispatch|shipment|railcar|read maps|anticipate foreseeable|"
    r"secure ships|climb on railcars|escort pedestrians|park vehicles|provide railway technical advice)\b",
    re.I,
)
ARTS_TERMS = re.compile(
    r"\b(art\w*|music\w*|performer|performance|dance\w*|theatre|theater|camera|"
    r"film|motion picture|rehearsal|script|sound equipment|stage|costume|cultural|"
    r"instrument|engraving|engrave|iconographic|textile|garment|apparel|upholstery|"
    r"sew\w*|embroid\w*|dye fabric|casting|stave|leather goods|footwear|jewellery|jewelry|"
    r"plaster|mould|mold|ink|pattern|hair|stylist|costume|fabrics)\b",
    re.I,
)
MANUFACTURING_TERMS = re.compile(
    r"\b(manufactur\w*|production line|production process|production schedule|machine\w*|"
    r"moulding|molding|machining|industrial|equipment|component|assembly|assembling|"
    r"cast\w*|fabricat\w*|factory|cleanroom|insulation material|engine part|"
    r"construction equipment|technical drawing|circuit diagram|electromechan\w*|"
    r"measuring machine|industrial process|drywall|gypsum|concrete|wafers|wafer|filament|"
    r"roofing|reinforcing steel|pipe bedding|pipe flow|rubber|cement|tiles|wires|circuit breaker|"
    r"extrusion|sharpen|saw off|smooth surface|positioning equipment|seal wires|cut material|"
    r"heat metals|pack leather|clear out drains|guide drill pipes|work with chemicals|"
    r"disassemble engines|form bed for glass|join wood|prevent pipeline deterioration|"
    r"paint with a paint gun|align components|spot metal imperfections|protect window frames)\b",
    re.I,
)
PUBLIC_SAFETY_TERMS = re.compile(
    r"\b(frisk|restrain|law enforcement|public safety|security threat|prison|detention|"
    r"emergency plan|emergency situation|surveillance|security officer|police|protective service|"
    r"detain|offender|aggressive behaviour|accident site|unsafe environment|time-critical decision|"
    r"rescue bathers|extinguish fires|rescue operation|protect individuals from harm|safeguard|"
    r"pyrotechnic|store pyrotechnical|practice vigilance|be at ease in unsafe environments)\b",
    re.I,
)
COMMUNICATION_TERMS = re.compile(
    r"\b(communicat\w*|listen\w*|explain\w*|advise\w*|liais\w*|assist\w*|support\w*|"
    r"serv\w*|customer|client|patient|student|teach\w*|train\w*|instruct\w*|negotiat\w*|"
    r"complaint|sell\w*|present\w*|respond\w*|interview\w*|counsel\w*|language|"
    r"public relation|mediat\w*|persuad\w*|inform\w*|cooperat\w*|collaborat\w*|"
    r"consult\w*|ask questions|pass on|provide information|humanitarian aid|international environment|"
    r"promot\w*|encourag\w*|relat\w*|show good manners|play with children|target groups|"
    r"satisfy customers|provide expertise|answer requests|diplomacy|good manners)\b",
    re.I,
)
MANAGEMENT_TERMS = re.compile(
    r"\b(manag\w*|supervis\w*|lead\w*|coordinat\w*|organis\w*|organiz\w*|plan\w*|"
    r"schedul\w*|allocat\w*|assign\w*|oversee|direct\w*|recruit\w*|staff|team|"
    r"delegat\w*|budget\w*|prioritis\w*|prioritiz\w*|deploy\w*|organise labour|"
    r"adjust priorities|meet deadlines|work in shifts|anticipate the overhaul)\b",
    re.I,
)
INSPECTION_TERMS = re.compile(
    r"\b(inspect\w*|monitor\w*|test\w*|assess\w*|evaluat\w*|analys\w*|analyz\w*|"
    r"identif\w*|detect\w*|collect\w*|examin\w*|investigat\w*|diagnos\w*|verif\w*|"
    r"check\w*|review\w*|compar\w*|research\w*|audit\w*|survey\w*|sample\w*|"
    r"measur\w*|troubleshoot\w*|screen\w*|observ\w*|forecast\w*|search historical sources|"
    r"keep up to date|gather data|anticipate potential|identify suppliers|solve technical problems|"
    r"determine cause|recognise signs|recognize signs|study topics|classify insurance claims|"
    r"consider the impact|select routes|observe events|think abstractly|think proactively|"
    r"spatial awareness|make time-critical decisions|determine resale value|determine appropriate|"
    r"make decisions regarding|profile people|differentiate types|recognise|recognize|"
    r"follow the news|study media sources|participate in scientific|compute results|work out odds)\b",
    re.I,
)
ARTIFACT_TERMS = re.compile(
    r"\b(writ\w*|document\w*|record\w*|report\w*|creat\w*|design\w*|develop\w*|"
    r"produc\w*|draft\w*|draw\w*|compil\w*|prepar\w*|construct\w*|model\w*|"
    r"compos\w*|edit\w*|publish\w*|formulat\w*|generat\w*|build\w*|manufactur\w*|"
    r"fill out forms|decode texts|translate keywords|disseminate results|integrate content)\b",
    re.I,
)
OPERATION_TERMS = re.compile(
    r"\b(operat\w*|maintain\w*|repair\w*|install\w*|assembl\w*|construct\w*|"
    r"manufactur\w*|build\w*|use\w*|appl\w*|perform\w*|execut\w*|carry out|tend\w*|"
    r"breed\w*|farm\w*|cultivat\w*|harvest\w*|handl\w*|clean\w*|wash\w*|remov\w*|"
    r"load\w*|driv\w*|sail\w*|fly\w*|cook\w*|process\w*|administer\w*|deliver\w*|"
    r"prepare\w*|follow work schedule|work on uneven surfaces|tolerate strong smells|"
    r"place drywall|place gypsum|clear drains|clear pipelines|unload supplies|lay base|"
    r"tie reinforcing|attach roofing|splice cable|lay tiles|smooth surfaces|place glass|"
    r"store crops|pack goods|pack merchandise|buy groceries|purchase fruits|make the beds|"
    r"read gas meter|control air flow|fill the vat|vacuum surfaces|put up signs|finish barrels|"
    r"conduct field work|set up automotive robot|enhance landscapes|crimp wire|moor vessels|"
    r"sand wood|stack empty pallets|colour glass|color glass|bend staves|nurse trees|replace die|"
    r"manipulate metal|maintain fuel distribution|strip wire|affix memorial|connect armature|"
    r"dispose of cutting waste|rinse glass|synchronise|synchronize|keep time accurately|"
    r"coach during|distribute meals|package purchases|grind meat|read handwritten|sterilise|sterilize|"
    r"dispose of hazardous waste|control minor maintenance|match vessels|order optical supplies|"
    r"smooth burred surfaces|dump contents|select unshelled almonds|control temperature|"
    r"restock|pick orders|wax body|manipulate glass|fill etchings|mix chemicals|preset costumes|"
    r"smooth glass|calibrate electronic|attach power cords|reserve merchandise|pass dental instruments|"
    r"smoothen rough|set window|log transmitter|restock|adjust cylinder valves|fell trees|"
    r"hire beaters|bend wire|label foodstuffs|unbind books|adjust voltage|mount stones|prune hedges|"
    r"make farrier|concentrate pulp|finish mortar|mark a metal|establish green roof|manoeuvre|maneuver|"
    r"shine shoes|adjust cut sizes|blend beverages|insert bladders|boil water|store pyrotechnical|"
    r"ensure maintenance|pack vegetables|move filled moulds|move filled molds|adjust glass sheets|"
    r"vacuum street debris|replace defect components|manipulate wood|treat scalp|dispose of non-hazardous|"
    r"dispose of nonhazardous|select fruits and vegetables|ensure correct gas pressure|"
    r"set up dates|arrange furniture|read care labels|set prices of menu|buy new library|"
    r"select new library|scan photos|control expenses|work in cold environments|"
    r"ensure correct metal temperature|attach horseshoes|cut glass|cut keys|set import export strategies|"
    r"maintain infrastructure|make reservations|customise travel package|customize travel package|"
    r"transfer luggage|track shipments|track shipping sites|load and unload|clean winery|"
    r"sanitize winery|sanitise winery|fill moulds|fill molds|adjust voltage|control air flow)\b",
    re.I,
)


def has_required_decomposition(skill_id: str, edges: list[dict]) -> bool:
    return any(
        edge.get("from") == skill_id
        and edge.get("type") in {"decomposes_into", "contains_candidate"}
        and edge.get("completion_requirement") != "optional"
        and edge.get("type") != "contains_candidate"
        for edge in edges
    )


def classify(skill: dict) -> str:
    label = skill.get("label", "")
    if MILITARY_TERMS.search(label):
        return "military-governance"
    if PUBLIC_SAFETY_TERMS.search(label):
        return "public-safety-and-rights"
    if LAW_TERMS.search(label):
        return "rules-and-quality"
    if HEALTH_TERMS.search(label):
        return "health-and-care"
    if NUMBER_TERMS.search(label):
        return "quantitative"
    if DIGITAL_TERMS.search(label):
        return "digital-and-information"
    if ANIMAL_LAND_TERMS.search(label):
        return "animal-land-and-environment"
    if FOOD_HOSPITALITY_TERMS.search(label):
        return "food-and-hospitality"
    if TRANSPORT_TERMS.search(label):
        return "transport-and-logistics"
    if ARTS_TERMS.search(label):
        return "craft-and-creative-production"
    if MANUFACTURING_TERMS.search(label):
        return "manufacturing-and-technical-work"
    if skill.get("esco_skill_type") == "knowledge":
        return "knowledge"
    if COMMUNICATION_TERMS.search(label):
        return "communication-and-service"
    if MANAGEMENT_TERMS.search(label):
        return "planning-and-coordination"
    if INSPECTION_TERMS.search(label):
        return "inspection-and-analysis"
    if ARTIFACT_TERMS.search(label):
        return "design-and-documentation"
    if OPERATION_TERMS.search(label) or HAZARD_TERMS.search(label):
        return "technical-or-practical-operation"
    return "guided-skill-application"


def activity_pair(skill: dict, family: str) -> tuple[dict, dict]:
    label = skill["label"].strip().rstrip(".")
    skill_type = skill.get("esco_skill_type") or "skill"
    sensitive_military = family == "military-governance"
    health = family == "health-and-care"
    hazardous = bool(HAZARD_TERMS.search(label))
    uuid = skill["id"].rsplit("/", 1)[-1]
    first_id = f"atlas:esco-breakdown:{uuid}:1"
    second_id = f"atlas:esco-breakdown:{uuid}:2"

    if family == "military-governance":
        first_title = f"Identify authority and limits for {label}"
        second_title = f"Review a fictional governance case for {label}"
        first_body = (
            f"Using current, approved policy supplied for the exercise, identify who is authorized to act, "
            f"what the stated limits are, what evidence may be used, and which concerns must be escalated "
            f"when considering ‘{label}’. Work only with fictional material and non-operational descriptions."
        )
        second_body = (
            f"Review a fictional, non-operational scenario related to ‘{label}’. Cite the supplied policy "
            f"and its date, distinguish known facts from assumptions, identify a compliance or safety concern, "
            f"and record the appropriate review or escalation route. Do not practise weapons use, tactics, "
            f"targeting, surveillance, or live operations."
        )
        first_criteria = ["identifies the supplied authority and limits", "separates facts from assumptions", "names a safe review or escalation route"]
        second_criteria = ["cites the supplied policy and date", "identifies the issue without adding operational detail", "records a proportionate escalation or review decision"]
    elif family == "rules-and-quality":
        first_title = f"Find the governing criteria for {label}"
        second_title = f"Apply supplied criteria to a case about {label}"
        first_body = (
            f"For a fictional task involving ‘{label}’, locate the current authoritative standard, policy, "
            f"procedure, or quality specification supplied by the exercise. Record its jurisdiction or workplace "
            f"context, date/version, applicable clauses, and limits; flag anything that needs an authorized reviewer."
        )
        second_body = (
            f"Compare a fictional case about ‘{label}’ with the supplied current criteria. Record the evidence "
            f"for each relevant requirement, distinguish compliance from uncertainty, and draft a factual "
            f"exception or escalation note. This exercise is not legal advice or a compliance determination."
        )
        first_criteria = ["uses an authoritative supplied reference", "records its context and version", "extracts relevant criteria without inventing requirements"]
        second_criteria = ["links each conclusion to case evidence", "flags missing information or uncertainty", "records an appropriate review or escalation"]
    elif health:
        first_title = f"Prepare a supervised simulation for {label}"
        second_title = f"Practise and hand over a fictional case for {label}"
        first_body = (
            f"Using a fictional case, a current local protocol supplied by a qualified educator, and an explicitly "
            f"defined learner role, identify the purpose of ‘{label}’, the permitted scope, privacy needs, "
            f"materials, and the supervisor or escalation contact. Do not use real patient data or infer clinical thresholds."
        )
        second_body = (
            f"In simulation only, work through the assigned part of ‘{label}’ exactly within the supplied local "
            f"protocol and learner scope. Record observations or actions factually, state what remains uncertain, "
            f"and make a structured handover to the named supervisor. This activity does not authorize clinical practice."
        )
        first_criteria = ["states the assigned role and scope", "uses only fictional data and the supplied local protocol", "identifies privacy and escalation boundaries"]
        second_criteria = ["follows the supplied simulation brief", "records facts without adding a diagnosis or unsupported threshold", "hands over uncertainty to the named supervisor"]
    elif family == "quantitative":
        first_title = f"Set up quantities and units for {label}"
        second_title = f"Complete and check a bounded {label} exercise"
        first_body = (
            f"From a fictional work item involving ‘{label}’, list the supplied quantities, units, rates, dates, "
            f"and permitted method. Check that values refer to the same context and identify missing inputs before "
            f"calculating or recording anything. Use no live financial, clinical, or operational decisions."
        )
        second_body = (
            f"Solve one bounded, fictional ‘{label}’ exercise using only the supplied data and stated method. "
            f"Show units and intermediate steps, estimate whether the result is plausible, independently check it, "
            f"and record assumptions or unresolved inputs."
        )
        first_criteria = ["identifies relevant values and units", "selects only a supplied method", "flags missing or incompatible inputs"]
        second_criteria = ["shows a traceable calculation or quantity decision", "checks the result independently for plausibility", "records units and assumptions"]
    elif family == "digital-and-information":
        first_title = f"Set up a safe practice task for {label}"
        second_title = f"Use {label} on synthetic data and verify the output"
        first_body = (
            f"Using documentation supplied for ‘{label}’, identify the intended input and output, software or "
            f"version context, access permissions, data-handling limits, and a small observable success check. "
            f"Work in a sandbox or fictional dataset; do not use live credentials or personal data."
        )
        second_body = (
            f"Complete one bounded ‘{label}’ exercise using a synthetic dataset or isolated development environment. "
            f"Compare the output with an expected example, reproduce and correct one harmless error, and document "
            f"the tool/version and any limitation. Do not connect to production systems."
        )
        first_criteria = ["follows the supplied documentation and version context", "identifies permissions and data boundaries", "defines an observable expected result"]
        second_criteria = ["completes the synthetic exercise", "checks output against an expected example", "records tool/version and avoids production data"]
    elif family == "animal-land-and-environment":
        first_title = f"Prepare a welfare-aware task for {label}"
        second_title = f"Practise {label} with supplied care or land-use guidance"
        first_body = (
            f"For a fictional or supervised exercise involving ‘{label}’, identify the species, crop, habitat, "
            f"season, or environmental context and consult the current local guidance supplied by the educator. "
            f"State welfare, biosecurity, environmental, and authorization limits; flag signs or conditions that "
            f"require a qualified specialist rather than improvising."
        )
        second_body = (
            f"Complete a bounded simulation or supervised training task for ‘{label}’ using the supplied care, "
            f"production, or environmental procedure. Record observations, compare them only with the provided "
            f"criteria, and report welfare or environmental concerns. This activity does not teach veterinary "
            f"diagnosis, treatment, or unsupplied chemical use."
        )
        first_criteria = ["uses current supplied context-specific guidance", "identifies welfare and environmental limits", "recognizes when qualified specialist review is required"]
        second_criteria = ["follows the supplied supervised or simulated procedure", "records observable facts rather than unsupported conclusions", "reports exceptions through the stated route"]
    elif family == "food-and-hospitality":
        first_title = f"Read the supplied process for {label}"
        second_title = f"Practise {label} and check the service or product"
        first_body = (
            f"For a fictional or supervised ‘{label}’ task, identify the recipe, service brief, product specification, "
            f"allergen information, hygiene plan, equipment, and permitted substitutions supplied for the exercise. "
            f"Mark any missing or conflicting instruction for the responsible supervisor; do not invent safety limits."
        )
        second_body = (
            f"Complete a small simulated or supervised ‘{label}’ task using the supplied workplace hygiene code, "
            f"food-safety plan, or service standard. Check the result against stated quality criteria, record any "
            f"deviation, and report it to the named supervisor."
        )
        first_criteria = ["locates the supplied specification and safety plan", "identifies relevant allergen or hygiene information", "flags ambiguity for the responsible person"]
        second_criteria = ["follows the supplied process in a bounded task", "checks the result against provided criteria", "records and reports deviations without inventing thresholds"]
    elif family == "transport-and-logistics":
        first_title = f"Check the work brief and limits for {label}"
        second_title = f"Run a dispatch or movement simulation for {label}"
        first_body = (
            f"For a fictional ‘{label}’ assignment, interpret the supplied work order, route or movement plan, "
            f"manifest, time constraints, access permissions, and safety notices. Identify who is authorized to "
            f"approve changes and what must be checked before a real operation."
        )
        second_body = (
            f"Use a tabletop, simulator, or sample documents to practise ‘{label}’. Track the relevant items or "
            f"information through the stated steps, reconcile the final record with the supplied manifest or plan, "
            f"and report a fictional delay, mismatch, or unsafe condition. This exercise is not flight, driving, "
            f"or live-navigation instruction."
        )
        first_criteria = ["extracts the assignment, route, and authorization boundaries", "checks the supplied records for completeness", "identifies required approval before a change"]
        second_criteria = ["follows the simulation or sample workflow", "reconciles the outcome to the supplied plan or manifest", "records and escalates a discrepancy"]
    elif family == "craft-and-creative-production":
        first_title = f"Interpret the brief and materials for {label}"
        second_title = f"Create or rehearse a bounded sample of {label}"
        first_body = (
            f"For a fictional ‘{label}’ commission or practice piece, identify the creative brief, audience, style "
            f"references, materials, rights or attribution requirements, schedule, and safe workspace instructions. "
            f"Clarify which elements are fixed and where creative choice is allowed."
        )
        second_body = (
            f"Produce or rehearse a small sample of ‘{label}’ using the approved materials, references, and time "
            f"limit supplied for the exercise. Review the sample against the brief and one craft or performance "
            f"criterion, seek feedback, and make one documented revision."
        )
        first_criteria = ["identifies the audience and constraints in the brief", "uses materials and references appropriately", "checks rights, attribution, and workspace safety where relevant"]
        second_criteria = ["creates or rehearses the bounded sample", "compares it with the stated brief and criterion", "uses feedback to revise one specific aspect"]
    elif family == "manufacturing-and-technical-work":
        first_title = f"Prepare a controlled training task for {label}"
        second_title = f"Complete a simulated build or maintenance step for {label}"
        first_body = (
            f"For a fictional or training-rig task involving ‘{label}’, read the supplied drawing, job card, "
            f"material specification, machine manual, and quality checks. Identify tool authorization, isolation "
            f"or guarding requirements, tolerances supplied by the exercise, and stop conditions."
        )
        second_body = (
            f"Complete one bounded ‘{label}’ step using a simulator, sample component, or isolated training rig "
            f"and the supplied procedure. Inspect the output against stated specifications, record material or "
            f"tool details when required, and stop for qualified review if a defect or unsafe condition appears. "
            f"This draft is not live-work instruction."
        )
        first_criteria = ["interprets the supplied drawing or job card", "identifies authorization and protective controls", "uses only tolerances and checks stated in the exercise"]
        second_criteria = ["follows the bounded training procedure", "checks the output against the supplied specification", "records defects and stops for unsafe or out-of-scope conditions"]
    elif family == "public-safety-and-rights":
        first_title = f"Review authority, rights, and escalation for {label}"
        second_title = f"Evaluate a fictional public-safety case involving {label}"
        first_body = (
            f"Using current approved agency or workplace policy supplied for a fictional ‘{label}’ case, identify "
            f"the learner's role, legal and rights-based limits, de-escalation expectations, reporting channel, "
            f"and conditions requiring a qualified decision-maker. Do not practise physical intervention."
        )
        second_body = (
            f"Work through a fictional tabletop case related to ‘{label}’. Separate verified facts from assumptions, "
            f"choose a proportionate non-physical response within the supplied policy, protect privacy, and record "
            f"when to request qualified assistance. Do not rehearse coercive techniques or real interventions."
        )
        first_criteria = ["cites the supplied policy and role limits", "identifies rights, privacy, and de-escalation requirements", "names the qualified escalation route"]
        second_criteria = ["distinguishes facts from assumptions", "selects a proportionate policy-based tabletop response", "records when and why to escalate"]
    elif family == "communication-and-service":
        first_title = f"Clarify the audience and purpose for {label}"
        second_title = f"Demonstrate {label} and confirm understanding"
        first_body = (
            f"In a fictional interaction involving ‘{label}’, identify the other person's stated need, the purpose "
            f"of the exchange, the information that may be shared, and any role boundary. Choose an appropriate "
            f"language, channel, tone, and accessible way to check understanding."
        )
        second_body = (
            f"Role-play ‘{label}’ in a bounded scenario. Give or receive the relevant information, use a clear "
            f"check-back question, respond to one clarification or change, and make a concise factual note or handover "
            f"when the role requires it."
        )
        first_criteria = ["states the audience and purpose", "respects privacy, accessibility, and role boundaries", "chooses a suitable way to confirm understanding"]
        second_criteria = ["communicates the relevant information accurately", "checks understanding and responds to clarification", "records or hands over only necessary facts"]
    elif family == "planning-and-coordination":
        first_title = f"Plan roles, resources, and checkpoints for {label}"
        second_title = f"Coordinate {label} through a changing scenario"
        first_body = (
            f"For a fictional assignment involving ‘{label}’, translate the stated objective into work steps, "
            f"owners, resources, timing, dependencies, and observable checkpoints. State constraints, decision "
            f"authority, and what should trigger a pause or escalation."
        )
        second_body = (
            f"Run a tabletop scenario for ‘{label}’. Track progress against the plan, respond to one supplied "
            f"change in resources or priorities, communicate the adjustment to affected people, and record the "
            f"decision and follow-up owner."
        )
        first_criteria = ["connects actions to a stated objective", "assigns roles and resources within stated authority", "defines checkpoints and escalation conditions"]
        second_criteria = ["notices the supplied change", "updates and communicates the plan proportionately", "records the decision and next owner"]
    elif family == "inspection-and-analysis":
        first_title = f"Choose evidence and criteria for {label}"
        second_title = f"Apply {label} to a sample and record findings"
        first_body = (
            f"For a fictional case involving ‘{label}’, select the supplied criteria and evidence sources before "
            f"reaching a conclusion. Distinguish direct observations from reports or assumptions, note limitations, "
            f"and decide what additional information would be needed."
        )
        second_body = (
            f"Apply ‘{label}’ to a synthetic sample or case file using the supplied criteria. Record what was "
            f"observed, compare it with the stated threshold or expectation when one is provided, explain uncertainty, "
            f"and route significant exceptions to the named reviewer."
        )
        first_criteria = ["selects evidence relevant to the question", "separates observation from inference", "states criteria and limitations"]
        second_criteria = ["records reproducible observations", "compares evidence only with supplied criteria", "communicates uncertainty or exceptions"]
    elif family == "design-and-documentation":
        first_title = f"Turn a brief into criteria for {label}"
        second_title = f"Produce and review a bounded {label} work item"
        first_body = (
            f"Given a fictional brief involving ‘{label}’, identify the intended audience, purpose, required inputs, "
            f"constraints, format, and acceptance criteria. Mark ambiguities and ask for clarification instead of "
            f"silently filling gaps."
        )
        second_body = (
            f"Create one small fictional ‘{label}’ work item from the supplied brief. Review it against each stated "
            f"criterion, check names, values, sources, and version details where relevant, revise one defect, and "
            f"explain what remains incomplete."
        )
        first_criteria = ["extracts purpose, audience, and constraints", "defines observable acceptance checks", "flags ambiguity without inventing requirements"]
        second_criteria = ["produces an output traceable to the brief", "checks the output against stated criteria", "revises a defect and records remaining limitations"]
    elif family == "technical-or-practical-operation":
        first_title = f"Prepare a safe practice setup for {label}"
        second_title = f"Practise {label} under supplied controls and log the result"
        first_body = (
            f"For a fictional or training-rig task involving ‘{label}’, identify the authorized learner role, "
            f"approved instructions, required checks, protective controls, stop conditions, and supervisor. Use "
            f"simulator data, isolated equipment, or a paper case wherever the real task could cause harm."
        )
        second_body = (
            f"Complete a bounded simulation of ‘{label}’ using the supplied approved procedure and controls. "
            f"Check the result against stated criteria, stop when a limit or unexpected condition appears, and "
            f"record the result and any defect for qualified review. This draft is not an instruction for live work."
        )
        first_criteria = ["uses the supplied procedure and correct learner scope", "identifies protective controls and stop conditions", "selects simulation or isolated equipment when needed"]
        second_criteria = ["follows the supplied controls in simulation", "checks the outcome against explicit criteria", "stops and reports unexpected conditions accurately"]
    elif family == "knowledge":
        first_title = f"Explain the key ideas in {label}"
        second_title = f"Use {label} to interpret a bounded case"
        first_body = (
            f"Use a reliable source or course material supplied for ‘{label}’ to define its central terms, map "
            f"the relationships between them, and identify a common misconception or limitation. Cite the source "
            f"and distinguish established information from an unresolved question."
        )
        second_body = (
            f"Interpret a fictional case or synthetic example using ‘{label}’. Select the relevant concepts, "
            f"explain how they support the interpretation, identify assumptions, and state what evidence or expert "
            f"review would be needed before acting in a real setting."
        )
        first_criteria = ["defines central terms accurately from the supplied source", "shows at least one relationship between concepts", "states a limitation or uncertainty"]
        second_criteria = ["selects relevant concepts for the case", "links interpretation to evidence and assumptions", "identifies limits on real-world use"]
    else:
        first_title = f"Set a clear outcome and boundaries for {label}"
        second_title = f"Demonstrate {label} in a guided task and review the result"
        first_body = (
            f"For a fictional task involving ‘{label}’, restate the intended outcome, identify the supplied "
            f"instructions and constraints, and choose observable checks for a successful attempt. Ask for missing "
            f"information rather than guessing."
        )
        second_body = (
            f"Demonstrate ‘{label}’ once in a low-risk guided exercise using the supplied materials and success "
            f"checks. Record the result, compare it with the stated outcome, receive feedback, and identify one "
            f"specific improvement for a second attempt."
        )
        first_criteria = ["restates the intended outcome", "identifies constraints and missing information", "chooses observable checks"]
        second_criteria = ["completes a bounded guided attempt", "compares the result with the stated outcome", "uses feedback to identify a concrete improvement"]

    if hazardous and family not in {"military-governance", "public-safety-and-rights", "health-and-care", "rules-and-quality", "manufacturing-and-technical-work", "transport-and-logistics"}:
        boundary = " Only use a fictional case, simulator, or isolated training equipment under a supplied procedure and qualified supervision; this is not authorization for live practice."
        first_body += boundary
        second_body += boundary

    def unit(unit_id: str, title: str, body: str, criteria: list[str], stage: int) -> dict:
        return {
            "id": unit_id,
            "label": title,
            "label_nl": title,
            "kind": "learning_unit",
            "definition": body,
            "source": "Capability Atlas",
            "source_version": VERSION,
            "official": False,
            "status": "proposed",
            "estimated_active_learning_hours": {"min": 1 if stage == 1 else 2, "max": 3 if stage == 1 else 4, "basis": "illustrative draft estimate; not empirically calibrated"},
            "assessment": {"method": "fictional case, guided demonstration, or simulation with a reviewer", "criteria": criteria},
            "reusability": {"classification": "occupation-context dependent", "hypothesis": f"This draft uses the ESCO label and a {family.replace('-', ' ')} activity pattern. The work sample and rubric need review by a practitioner in the specific occupation."},
            "evidence_basis": "Atlas-authored draft generated from an official ESCO skill label/type and a reusable instructional pattern; not an ESCO learning outcome or validated competency standard.",
            "esco_skill_uri": skill["id"],
            "decomposition_stage": stage,
            "decomposition_family": family,
        }

    return (
        unit(first_id, first_title, first_body, first_criteria, 1),
        unit(second_id, second_title, second_body, second_criteria, 2),
    )


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    skills_by_id = {skill["id"]: skill for skill in data["capabilities"] if skill.get("source") == "ESCO"}
    placeholder_skills = {
        unit.get("esco_skill_uri")
        for unit in data["learning_units"]
        if unit.get("id", "").startswith("atlas:esco-entry-practice:") and unit.get("esco_skill_uri")
    }
    already_broken = {sid for sid in placeholder_skills if has_required_decomposition(sid, data["decompositions"])}
    to_break = sorted(sid for sid in placeholder_skills - already_broken if sid in skills_by_id)
    unit_ids = {unit["id"] for unit in data["learning_units"]}
    edge_keys = {(edge["from"], edge["to"], edge.get("type")) for edge in data["decompositions"]}
    new_units = []
    new_edges = []
    family_counts = Counter()
    quantitative_count = 0

    for skill_id in to_break:
        skill = skills_by_id[skill_id]
        family = classify(skill)
        family_counts[family] += 1
        first, second = activity_pair(skill, family)
        for activity in (first, second):
            if activity["id"] in unit_ids:
                continue
            new_units.append(activity)
            unit_ids.add(activity["id"])
        for activity in (first, second):
            key = (skill_id, activity["id"], "decomposes_into")
            if key not in edge_keys:
                new_edges.append({
                    "from": skill_id, "to": activity["id"], "type": "decomposes_into",
                    "validation": "proposed", "source": SOURCE, "completion_requirement": "required",
                    "rationale": f"Two-stage draft breakdown using the ESCO label/type and the Atlas {family} activity pattern; requires practitioner review.",
                })
                edge_keys.add(key)
        prerequisite_key = (first["id"], second["id"], "prerequisite_for")
        if prerequisite_key not in edge_keys:
            new_edges.append({
                "from": first["id"], "to": second["id"], "type": "prerequisite_for",
                "validation": "proposed", "strength": "recommended", "source": SOURCE,
                "rationale": "Suggested sequence: establish the task context before the guided application; order needs review in the relevant occupation.",
            })
            edge_keys.add(prerequisite_key)
        roots = [READING_ROOT]
        if NUMBER_TERMS.search(skill.get("label", "")):
            roots.append(NUMERACY_ROOT)
            quantitative_count += 1
        for root in roots:
            key = (root, first["id"], "prerequisite_for")
            if key not in edge_keys:
                new_edges.append({
                    "from": root, "to": first["id"], "type": "prerequisite_for",
                    "validation": "proposed", "strength": "recommended", "source": SOURCE,
                    "rationale": "Suggested route from early communication and, when the ESCO label signals quantitative work, routine numeracy. This is a navigation suggestion, not a universal prerequisite.",
                })
                edge_keys.add(key)

    # Preserve the v0.25 IDs so saved learner completions survive, while making
    # their optional orientation-only role explicit beside the new required steps.
    warmups_updated = 0
    for activity in data["learning_units"]:
        if not activity.get("id", "").startswith("atlas:esco-entry-practice:"):
            continue
        skill = skills_by_id.get(activity.get("esco_skill_uri"))
        if not skill:
            continue
        label = skill.get("label", "this capability").strip().rstrip(".")
        activity["label"] = f"Optional warm-up: explore a first example of {label}"
        activity["label_nl"] = activity["label"]
        activity["definition"] = (
            f"Optional orientation only for ‘{label}’: use a short, low-risk or simulated example to understand "
            "the topic and note questions for a teacher or practitioner. This activity does not assess the skill, "
            "does not replace its required Atlas-proposed breakdown, and is excluded from required-step progress."
        )
        activity["source_version"] = VERSION
        activity["reusability"] = {
            "classification": "optional orientation scaffold",
            "hypothesis": "A short introductory example may help learners orient themselves; it is not a required learning outcome or evidence of competence.",
        }
        activity["evidence_basis"] = (
            "Atlas-authored optional orientation scaffold attached to an official ESCO skill. Not an ESCO learning outcome, "
            "assessment, prerequisite, or replacement for the required proposed skill breakdown."
        )
        warmups_updated += 1

    data["learning_units"].extend(new_units)
    data["decompositions"].extend(new_edges)
    data["metadata"]["title"] = "Broad ESCO occupation sample with proposed two-stage skill breakdowns"
    data["metadata"]["note"] += (
        " v0.26.0 adds two required Atlas-proposed learning steps to each imported ESCO skill that lacked a detailed breakdown. "
        "Activity patterns are tailored by ESCO skill/knowledge type and label families (communication, coordination, inspection, "
        "design/documentation, operation, quantitative work, rules/quality, and knowledge). Sensitive or regulated topics are limited "
        "to fictional cases, supplied current references, simulation, scope, and escalation boundaries. These draft steps still require "
        "occupation-specific practitioner review and do not turn the source ESCO relationships into official learning prerequisites."
    )
    data["metadata"]["decomposition"] += (
        f" Capability Atlas v0.26.0 adds {len(to_break)} two-stage draft breakdowns to previously undecomposed sample skills, "
        f"with {len(new_units)} proposed learning activities. Each new skill breaks into two required progress steps; one recommended "
        "edge sequences the context-setting exercise before a bounded application, and recommended links connect the first activity "
        "to the existing practical-reading foundation and selected quantitative skills to routine numeracy. Content is label/type-led, "
        "Atlas-authored, and unvalidated; military and other hazardous topics use governance or simulation boundaries rather than live "
        "operational instruction."
    )
    data["metadata"]["esco_v026_breakdown"] = {
        "source_basis": "ESCO v1.2.1 skill labels, skill types, and existing ESCO occupation-skill links",
        "breakdowns_added": len(to_break),
        "skills_skipped_with_existing_required_breakdown": len(already_broken),
        "optional_warmups_relabelled": warmups_updated,
        "learning_units_added": len(new_units),
        "required_decomposition_edges_added": sum(1 for edge in new_edges if edge["type"] == "decomposes_into"),
        "recommended_prerequisite_edges_added": sum(1 for edge in new_edges if edge["type"] == "prerequisite_for"),
        "quantitative_skills_with_numeracy_bridge": quantitative_count,
        "pattern_families": dict(sorted(family_counts.items())),
        "method": "Two stage Atlas draft generated using the ESCO label and knowledge/skill type, with family-specific task framing, assessment criteria, and safe simulation boundaries where indicated.",
        "validation": "proposed; not independently or occupationally validated",
    }
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "skills_considered": len(placeholder_skills), "breakdowns_added": len(to_break),
        "existing_breakdowns_preserved": len(already_broken), "learning_units_added": len(new_units),
        "new_relations": len(new_edges), "families": dict(sorted(family_counts.items())),
        "total_roles": len(data["roles"]), "total_capabilities": len(data["capabilities"]),
        "total_learning_units": len(data["learning_units"]), "total_decompositions_and_prerequisites": len(data["decompositions"]),
    }, indent=2))


if __name__ == "__main__":
    main()
