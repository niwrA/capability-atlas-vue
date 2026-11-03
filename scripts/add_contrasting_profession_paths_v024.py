"""Add three draft occupational pathways to the Capability Atlas data model.

All new role-to-capability, decomposition, and prerequisite relations are
explicit Atlas proposals. The data makes no claim that these are complete
curricula, validated prerequisite sequences, or substitutes for credentials.
"""
from dataset_io import load_dataset, save_dataset
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.24.0"
PILOT = f"Capability Atlas contrasting profession pathways v{VERSION}"
FOUNDATION = f"Capability Atlas shared practical foundations v{VERSION}"

data = load_dataset()
existing_ids = {x["id"] for key in ("roles", "capabilities", "learning_units") for x in data[key]}
if any(role_id in existing_ids for role_id in (
    "atlas:role:primary-school-teacher",
    "atlas:role:cook",
    "atlas:role:motor-vehicle-mechanic",
)):
    raise SystemExit("v0.24.0 profession pilot already exists; refusing to duplicate it")

roles = []
capabilities = []
learning_units = []
assertions = []
decompositions = []
profile_unit_ids = {}

SOURCES = {
    "teacher": [
        {"title": "Dutch Education Inspectorate — Primary-teacher curricula", "url": "https://www.onderwijsinspectie.nl/onderwijssectoren/hoger-onderwijs/themaonderzoeken-hoger-onderwijs/lerarenopleidingen-en-de-leraar"},
        {"title": "Dutch Education Inspectorate — Authority to teach in primary education", "url": "https://www.onderwijsinspectie.nl/onderwijssectoren/primair-onderwijs/onbevoegde-leraren-voor-de-klas-po"},
    ],
    "cook": [
        {"title": "SBB — Qualification dossier Kok", "url": "https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=435813"},
        {"title": "NVWA — Food-safety plan and hygiene code", "url": "https://www.nvwa.nl/onderwerpen/voedselveiligheid/voedselveilig-werken-in-horeca-ambacht-en-retail/hygienecode"},
    ],
    "mechanic": [
        {"title": "SBB — Qualification dossier Autotechniek", "url": "https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=433325"},
        {"title": "SBB — Qualification dossier Autotechniek, qualification structure", "url": "https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=433322"},
    ],
    "foundation": [
        {"title": "ASHA — Early-intervention communication and AAC guidance", "url": "https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/"},
        {"title": "SLO — Primary curriculum goals", "url": "https://www.slo.nl/thema/meer/tule/"},
    ],
}


def add_unit(unit_id, label, definition, evidence_basis, source_key, assessment, hours=(1, 3)):
    if unit_id in existing_ids:
        raise ValueError(f"Duplicate node id: {unit_id}")
    existing_ids.add(unit_id)
    learning_units.append({
        "id": unit_id,
        "label": label,
        "kind": "learning_unit",
        "definition": definition,
        "source": "Capability Atlas shared profession foundations" if source_key == "foundation" else "Capability Atlas profession pathway pilot",
        "source_version": VERSION,
        "official": False,
        "status": "proposed",
        "estimated_active_learning_hours": {
            "min": hours[0], "max": hours[1],
            "basis": "Illustrative estimate for a learner with the stated prerequisite experiences; not a validated duration.",
        },
        "assessment": {"method": "scenario or supervised practice task", "criteria": assessment},
        "reusability": None,
        "evidence_basis": evidence_basis,
        "supporting_sources": SOURCES[source_key],
    })


def add_capability(cap_id, label, definition, source_key, units, optional=False):
    if cap_id in existing_ids:
        raise ValueError(f"Duplicate node id: {cap_id}")
    existing_ids.add(cap_id)
    capabilities.append({
        "id": cap_id,
        "label": label,
        "kind": "skill",
        "source": "Capability Atlas profession pathway pilot",
        "source_version": VERSION,
        "official": False,
        "status": "proposed",
        "definition": definition,
    })
    assertions.append({
        "from": current_role_id,
        "to": cap_id,
        "type": "atlas_optional" if optional else "atlas_required",
        "validation": "proposed",
        "source": PILOT,
    })
    unit_ids = []
    for index, unit in enumerate(units, 1):
        unit_id = f"{cap_id}:activity:{index}"
        add_unit(unit_id, unit[0], unit[1],
                 "Atlas-authored practice activity informed by the supplied official reference materials; it remains a draft and needs practitioner review.",
                 source_key, unit[2])
        unit_ids.append(unit_id)
        decompositions.append({
            "from": cap_id,
            "to": unit_id,
            "type": "decomposes_into",
            "validation": "proposed",
            "source": PILOT,
            "relation_id": f"atlas-v024-{cap_id.rsplit(':', 1)[-1]}-{index}",
            "completion_requirement": "optional" if optional else "required",
        })
    return unit_ids


def add_prerequisite(source_id, target_id, rationale, relation_id):
    decompositions.append({
        "from": source_id,
        "to": target_id,
        "type": "prerequisite_for",
        "validation": "proposed",
        "source": FOUNDATION if source_id.startswith("atlas:alu:profession-foundation:") else PILOT,
        "rationale": rationale,
        "relation_id": relation_id,
    })


# Shared bridges make the developmental roots useful for more than one goal.
foundation_units = [
    (
        "atlas:alu:profession-foundation:communication:explain-ideas-in-sequence",
        "Explain ideas and events in a clear sequence",
        "In familiar conversation, communicate an idea or a sequence of events so another person can follow it; use speech, sign, AAC, or other accessible communication as appropriate.",
        "A broad transition from early exchanges to later practical communication. This is a proposed capability bridge, not an age norm or a speech-language assessment.",
        ["communicates the central idea", "puts events or actions in an understandable order", "uses an accessible communication mode"],
    ),
    (
        "atlas:alu:profession-foundation:communication:read-and-produce-practical-texts",
        "Read and produce practical texts and records",
        "Use accessible written or symbolic information to follow a familiar task, then produce a short record another person can use.",
        "A broad literacy bridge for later learning and work. The activity is not a formal reading or writing benchmark.",
        ["finds the task-relevant information", "follows stated steps without inventing missing instructions", "records the result clearly"],
    ),
    (
        "atlas:alu:profession-foundation:numeracy:solve-routine-number-problems",
        "Solve routine whole-number problems",
        "Use objects, drawings, number words, or written notation to solve familiar addition, subtraction, grouping, and comparison problems and explain the chosen representation.",
        "Extends the existing small-quantity and first-addition strand into everyday number use. No grade level or fixed developmental timetable is implied.",
        ["chooses a representation that fits the problem", "calculates or counts accurately for the supplied example", "checks whether the result is plausible"],
    ),
    (
        "atlas:alu:profession-foundation:numeracy:use-measures-and-quantities",
        "Use common measures and quantities in practical tasks",
        "Interpret supplied quantities and units, estimate a practical amount, and compare a measured or counted result with stated criteria.",
        "A proposed bridge from early number sense to applied measurement. Fractions, decimals, and units are introduced only in contexts where the task requires them.",
        ["identifies the quantity and unit", "selects the supplied operation or comparison", "records a result with its unit"],
    ),
]
for unit_id, label, definition, evidence, criteria in foundation_units:
    add_unit(unit_id, label, definition, evidence, "foundation", criteria)

add_prerequisite(
    "atlas:alu:development:communication:expand-and-combine-messages",
    foundation_units[0][0],
    "The proposed bridge extends increasingly clear exchanges into explaining ideas and sequences; learners may use any accessible communication mode.",
    "atlas-v024-foundation-communication-sequence",
)
add_prerequisite(
    foundation_units[0][0], foundation_units[1][0],
    "Practical text use builds on communicating meaning, while remaining open to alternative accessible formats.",
    "atlas-v024-foundation-communication-to-text",
)
add_prerequisite(
    "atlas:alu:development:numeracy:represent-first-addition",
    foundation_units[2][0],
    "Routine whole-number problem solving is proposed as a bridge from represented first addition.",
    "atlas-v024-foundation-numeracy-routines",
)
add_prerequisite(
    foundation_units[2][0], foundation_units[3][0],
    "Practical measurement tasks use number operations and comparisons in an applied context.",
    "atlas-v024-foundation-numeracy-measurement",
)

profession_profiles = [
    {
        "slug": "teacher", "role_id": "atlas:role:primary-school-teacher",
        "label": "Primary school teacher · capability pilot",
        "note": "A selected-capability learning map, not a complete career or qualification route. In the Netherlands, independent primary-school teaching normally requires a recognized Pabo qualification; that formal qualification is not modeled here.",
        "source_key": "teacher",
        "capabilities": [
            ("plan-learning", "Plan and sequence learning", "Translate a stated learning goal into a coherent sequence of learning activities and checks.", [
                ("Turn a learning goal into observable steps", "Given a supplied curriculum goal, identify the intended learning, prior knowledge to check, and a small sequence of activities.", ["preserves the supplied goal", "orders the activities coherently", "identifies one relevant check"]),
                ("Select materials for a planned lesson", "Choose or adapt supplied examples and materials to support the planned learning goal and explain the choice.", ["materials align with the goal", "the choice is explained", "accessibility needs are considered"]),
            ]),
            ("explain-content", "Explain and model subject content", "Represent subject ideas clearly and respond to learner questions using accurate content and suitable examples.", [
                ("Explain a concept with a worked example", "Prepare and deliver a short explanation using a supplied concept and example; make the reasoning visible.", ["the explanation is accurate for the supplied concept", "the example illustrates the goal", "steps are made visible"]),
                ("Use examples to surface learner thinking", "Compare two learner examples and identify what each suggests about understanding, without inferring more than the evidence supports.", ["identifies relevant evidence", "distinguishes a correct result from reasoning", "states uncertainty where evidence is limited"]),
            ]),
            ("check-and-adapt", "Check understanding and adapt instruction", "Gather proportionate evidence of learning and select a suitable next instructional response.", [
                ("Choose a check for understanding", "Select a short check aligned with a supplied learning objective and identify what different responses would indicate.", ["the check matches the objective", "interpretations are tied to observable responses", "limits of the check are stated"]),
                ("Plan a next step from learner evidence", "Given fictional learner responses, choose a next explanation, practice, or support step and justify it from the evidence.", ["uses evidence from the responses", "proposes a relevant next step", "avoids unsupported diagnosis"]),
            ]),
            ("communicate-learning", "Communicate learning and collaborate", "Share relevant learning information respectfully with learners and, within role and school policy, colleagues or caregivers.", [
                ("Give specific feedback on a learning task", "Use a fictional work sample to give feedback tied to stated criteria and a possible next action.", ["refers to observable work", "uses clear and respectful language", "suggests an actionable next step"]),
                ("Summarize learning evidence for a colleague", "Prepare a concise, privacy-aware handover using only relevant fictional learner information.", ["distinguishes observation from interpretation", "includes relevant context", "omits unnecessary personal details"]),
            ]),
        ],
        "optional": ("subject-specialism", "Deepen a subject or age-group specialism", "Develop additional content or pedagogy for a particular subject, age group, or learning context.", [
            ("Study a subject-specific teaching resource", "Use an approved subject resource to extend content knowledge for a specified teaching context.", ["uses a relevant approved source", "identifies the specified scope", "records questions for qualified review"]),
            ("Adapt an example for a specialist context", "Adapt a supplied lesson example for a defined subject or age-group context and explain the adaptation.", ["preserves the learning goal", "makes the contextual adaptation explicit", "identifies what needs review"]),
        ]),
    },
    {
        "slug": "cook", "role_id": "atlas:role:cook",
        "label": "Cook · capability pilot",
        "note": "A selected-capability learning map informed by Dutch vocational qualification and food-safety materials. Food work must follow the current workplace hygiene code or food-safety plan and applicable supervision; this graph is not operational food-safety instruction.",
        "source_key": "cook",
        "capabilities": [
            ("plan-kitchen-work", "Plan and sequence kitchen work", "Organize a supplied preparation task around quantities, order, equipment, and timing.", [
                ("Read a recipe or production brief", "Extract ingredients, quantities, sequence, equipment, and stated constraints from a supplied recipe or production brief.", ["extracts the required information", "preserves stated quantities and constraints", "flags missing information"]),
                ("Sequence a preparation task", "Arrange supplied preparation steps against a simple service deadline, accounting for stated dependencies.", ["respects task dependencies", "identifies time-sensitive steps", "leaves time to check the result"]),
            ]),
            ("prepare-to-specification", "Prepare and present food to a supplied specification", "Practice a defined preparation task in a supervised or simulated setting and compare the result with supplied criteria.", [
                ("Practice a preparation technique under supervision", "Complete a supplied, low-risk preparation exercise using the local instructor-approved method.", ["follows the supplied method", "uses the stated equipment appropriately", "requests help when the task exceeds the exercise scope"]),
                ("Compare a prepared result with stated criteria", "Inspect a simulated or supervised result against a supplied quality brief and record a specific improvement.", ["uses the stated criteria", "records observable differences", "does not substitute personal preference for the brief"]),
            ]),
            ("food-safety-plan", "Work within food-safety procedures", "Recognize the workplace food-safety plan as the controlling procedure and practice documenting a fictional deviation and escalation.", [
                ("Find the applicable step in a supplied food-safety plan", "Locate the relevant instruction in an approved workplace plan or hygiene code for a fictional scenario; do not improvise a procedure.", ["uses the current supplied source", "identifies the applicable instruction", "asks a supervisor when the case is unclear"]),
                ("Record and report a fictional deviation", "Complete a simulated record and escalation using the supplied workplace process.", ["records the observed facts", "uses the stated reporting route", "does not invent corrective limits"]),
            ]),
            ("coordinate-kitchen-work", "Coordinate and communicate kitchen work", "Exchange clear, timely information with colleagues using the work brief and local procedures.", [
                ("Give a concise task handover", "Hand over the status of a fictional preparation task, outstanding steps, and relevant constraints.", ["states the status accurately", "names outstanding steps", "checks shared understanding"]),
                ("Communicate supplied ingredient and allergen information", "Use a supplied, verified menu or ingredient record to answer a simulated query; escalate missing or uncertain information.", ["uses only the supplied verified record", "does not guess about allergens", "escalates uncertainty through the stated route"]),
            ]),
        ],
        "optional": ("cuisine-specialism", "Develop a cuisine or service specialism", "Extend capability for a particular cuisine, service format, or production context.", [
            ("Compare two supplied cuisine briefs", "Identify how two supplied briefs differ in ingredients, methods, equipment, and service constraints.", ["uses the supplied briefs", "identifies material differences", "does not generalize beyond the examples"]),
            ("Adapt a practice plan to a supplied service format", "Plan a supervised or simulated practice task for a defined service format, following local procedures.", ["matches the supplied service brief", "accounts for stated constraints", "identifies items requiring instructor review"]),
        ]),
    },
    {
        "slug": "mechanic", "role_id": "atlas:role:motor-vehicle-mechanic",
        "label": "Motor vehicle mechanic · capability pilot",
        "note": "A selected-capability learning map informed by Dutch Autotechniek qualification dossiers. It does not authorize vehicle repair, establish qualification, or cover high-voltage work; real tasks require the correct training, tools, workplace procedures, and supervision.",
        "source_key": "mechanic",
        "capabilities": [
            ("inspect-and-diagnose", "Inspect systems and describe a fault", "Use a supplied work order and approved information to gather and record observations before proposing a next check.", [
                ("Interpret a fictional work order", "Identify the customer-reported concern, task scope, and constraints in a fictional work order.", ["separates reported concern from confirmed fault", "identifies task scope", "flags missing or ambiguous information"]),
                ("Record objective inspection observations", "In a simulator or supplied case, record observations and measurements without turning them into unsupported diagnoses.", ["records observable evidence", "includes units where supplied", "distinguishes observation from interpretation"]),
            ]),
            ("use-technical-information", "Use technical information and tools appropriately", "Select supplied technical information and tools for a bounded, supervised or simulated task.", [
                ("Locate information in a supplied service document", "Find the relevant section of a supplied manufacturer or workplace document for a fictional task.", ["uses the correct supplied document", "locates the applicable section", "checks model and scope details"]),
                ("Select a tool for a simulated task", "Choose from a supplied tool list for a trainer-based exercise and explain any safety or authorization limits.", ["matches tool to stated task", "checks stated limitations", "stops when authorization or information is missing"]),
            ]),
            ("perform-routine-maintenance", "Perform routine maintenance within scope", "Practice a bounded maintenance workflow in a simulator or supervised setting against the supplied service procedure.", [
                ("Sequence a maintenance workflow from instructions", "Order the steps in a fictional routine task using only the supplied service instructions.", ["respects stated sequence and dependencies", "identifies required checks", "flags steps requiring supervision"]),
                ("Verify a simulated task against supplied criteria", "Compare a trainer-based result with the supplied completion criteria and record unresolved issues.", ["uses stated criteria", "records unresolved issues", "does not release a real vehicle"]),
            ]),
            ("document-and-explain-work", "Document work and explain findings", "Create a clear service record and communicate findings, limitations, and next steps.", [
                ("Write a concise simulated service record", "Summarize a fictional task, observations, supplied measurements, and unresolved questions.", ["distinguishes work performed from work proposed", "records relevant evidence", "states uncertainty"]),
                ("Explain findings and next steps to a customer", "Use a fictional case to explain verified findings and the proposed next step in plain language.", ["uses only supported findings", "explains uncertainty", "seeks appropriate authorization before additional work"]),
            ]),
        ],
        "optional": ("electrified-vehicles", "Specialize in electrified vehicle systems", "Build additional knowledge for electrified vehicles within the applicable training, authorization, and workplace safety boundaries.", [
            ("Identify high-voltage boundaries in supplied documentation", "In a document-based scenario, identify warnings, restricted tasks, and required qualifications without performing hands-on work.", ["uses current supplied documentation", "identifies stated authorization boundaries", "does not attempt a hands-on task"]),
            ("Complete a manufacturer-approved simulator orientation", "Use a training simulator or approved learning resource to explain the defined safety and escalation boundaries for a fictional task.", ["uses the approved training resource", "states when qualified support is required", "does not treat simulation as work authorization"]),
        ]),
    },
]

for profile in profession_profiles:
    role_id = profile["role_id"]
    current_role_id = role_id
    roles.append({
        "id": role_id,
        "label": profile["label"],
        "kind": "role",
        "source": "Capability Atlas",
        "source_version": VERSION,
        "official": False,
        "role_family": "profession",
        "note": profile["note"],
        "supporting_sources": SOURCES[profile["source_key"]],
    })
    profile_unit_ids[profile["slug"]] = {}
    for cap_slug, cap_label, cap_definition, units in profile["capabilities"]:
        cap_id = f"atlas:cap:profession:{profile['slug']}:{cap_slug}"
        profile_unit_ids[profile["slug"]][cap_slug] = add_capability(cap_id, cap_label, cap_definition, profile["source_key"], units)
    cap_slug, cap_label, cap_definition, units = profile["optional"]
    cap_id = f"atlas:cap:profession:{profile['slug']}:{cap_slug}"
    profile_unit_ids[profile["slug"]][cap_slug] = add_capability(cap_id, cap_label, cap_definition, profile["source_key"], units, optional=True)

# Feed role-specific learning activities from two shared pathways. The links
# are navigation hypotheses; they do not impose a universal chronology.
comm_endpoint = foundation_units[1][0]
num_endpoint = foundation_units[3][0]
for profile in profession_profiles:
    role_slug = profile["slug"]
    capability_data = {cap_slug: units for cap_slug, _, _, units in profile["capabilities"]}
    for cap_slug, unit_ids in profile_unit_ids[role_slug].items():
      for activity_index, unit_id in enumerate(unit_ids):
        if cap_slug == profile["optional"][0]:
            continue
        unit = capability_data[cap_slug][activity_index]
        # Route generic text/communication foundations to the profession's
        # reading, explanation, planning, and documentation activities.
        label = unit[0].lower()
        if any(term in label for term in ("goal", "concept", "feedback", "record", "document", "work order", "service document", "handover", "recipe", "brief", "ingredient")):
            add_prerequisite(comm_endpoint, unit_id,
                             "Practical communication and text-use are plausible foundations for this activity; local context and learner support may alter the route.",
                             f"atlas-v024-{role_slug}-communication-{unit_id.replace(':', '-')}")
        if any(term in label for term in ("example", "check", "quantity", "sequence", "measure", "maintenance", "inspection", "simulated task", "service record")):
            add_prerequisite(num_endpoint, unit_id,
                             "Applied number sense and measurement are plausible foundations for this activity; the actual task determines the required mathematics.",
                             f"atlas-v024-{role_slug}-numeracy-{unit_id.replace(':', '-')}")

data["roles"].extend(roles)
data["capabilities"].extend(capabilities)
data["learning_units"].extend(learning_units)
data["role_capability_assertions"].extend(assertions)
data["decompositions"].extend(decompositions)
data["metadata"]["title"] = "ESCO occupations, Atlas life roles, and contrasting profession pathways"
data["metadata"]["note"] += " The v0.24.0 profession pilot adds three Atlas-authored draft profession profiles and shared communication/numeracy bridges. Profession mappings, learning-unit decompositions, and prerequisite links are proposals; the primary-teacher profile does not model the Pabo qualification, and none of the profiles is a validated curriculum or qualification route."
data["metadata"]["decomposition"] += " Capability Atlas v0.24.0 adds three contrasting profession pilots (primary school teacher, cook, motor vehicle mechanic), 15 proposed occupational capabilities, 34 proposed learning activities, four shared communication/numeracy bridge activities, required and optional role links, and proposed paths from existing early communication and first-addition units. Source materials inform topic selection but do not validate the route. The teacher profile explicitly leaves the Dutch Pabo qualification out of scope."

save_dataset(data)
print(f"Added {len(roles)} roles, {len(capabilities)} capabilities, {len(learning_units)} learning units, {len(assertions)} role links, and {len(decompositions)} relations")
