"""Import a broad, stratified ESCO v1.2.1 occupation sample and proposed entry routes.

The occupation/skill assertions are read from the official ESCO web-service API.
The stratification and all learning activities/prerequisite links are Atlas proposals.
"""
from __future__ import annotations

import concurrent.futures
from dataset_io import load_dataset, save_dataset
import json
import math
import re
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "v1.2.1"
PAGE_SIZE = 100
SAMPLE_PER_ISCO_MAJOR_GROUP = 40
API = "https://ec.europa.eu/esco/api/search"
PARAMS = {
    "text": "", "language": "en", "type": "occupation", "limit": str(PAGE_SIZE),
    "full": "true", "viewObsolete": "false", "selectedVersion": VERSION,
}


def fetch_page(offset: int) -> dict:
    params = {**PARAMS, "offset": str(offset)}
    url = API + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"Accept": "application/json", "Accept-Encoding": "gzip"})
    import gzip
    with urllib.request.urlopen(request, timeout=90) as response:
        raw = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
    return json.loads(raw)


def relation_records(occupation: dict, relation_name: str) -> list[dict]:
    return occupation.get("_links", {}).get(relation_name, [])


def group_code(occupation: dict) -> str:
    code = str(occupation.get("code") or "")
    match = re.match(r"(\d)", code)
    return match.group(1) if match else "X"


def distribute_sample(records: list[dict]) -> tuple[list[dict], dict[str, int]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for rec in records:
        groups[group_code(rec)].append(rec)
    chosen = []
    counts = {}
    for group in sorted(groups):
        rows = sorted(groups[group], key=lambda rec: (str(rec.get("code") or ""), rec.get("title", ""), rec["uri"]))
        n = min(SAMPLE_PER_ISCO_MAJOR_GROUP, len(rows))
        # Systematically spread the sample over the ISCO code range in each group.
        indexes = [min(len(rows)-1, math.floor((i + 0.5) * len(rows) / n)) for i in range(n)] if n else []
        chosen.extend(rows[i] for i in indexes)
        counts[group] = len(indexes)
    return chosen, counts


def main() -> None:
    t0 = time.time()
    first = fetch_page(0)
    total = first["total"]
    # ESCO's API calls this query argument `offset`, but its `_links.next` uses
    # 0, 1, 2... page numbers (not record offsets). Follow that convention.
    offsets = list(range(1, math.ceil(total / PAGE_SIZE)))
    pages = [first]
    # Limit concurrency to stay considerate to the public service.
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_page, offset): offset for offset in offsets}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            pages.append(future.result())
            print(f"Fetched ESCO page {index + 1}/{len(offsets) + 1}", flush=True)
    all_occupations = [row for page in pages for row in page.get("_embedded", {}).get("results", [])]
    by_uri = {row["uri"]: row for row in all_occupations if row.get("uri")}
    if len(by_uri) < total * 0.9:
        raise RuntimeError(f"ESCO pagination returned only {len(by_uri)} of {total} occupations; refusing a partial/repeated import")
    sampled, sample_counts = distribute_sample(list(by_uri.values()))

    data = load_dataset()
    role_ids = {row["id"] for row in data["roles"]}
    capability_by_id = {row["id"]: row for row in data["capabilities"]}
    assertion_keys = {(e["from"], e["to"], e.get("type")) for e in data["role_capability_assertions"]}
    decomposition_keys = {(e["from"], e["to"], e.get("type")) for e in data["decompositions"]}
    learning_ids = {row["id"] for row in data["learning_units"]}
    imported_roles = []
    new_caps = 0
    new_assertions = 0
    source_relation_counts = Counter()
    sampled_skill_ids = set()
    selected_ids = {row["uri"] for row in sampled}

    for occupation in sampled:
        oid = occupation["uri"]
        preferred = occupation.get("preferredLabel", {})
        descriptions = occupation.get("description", {})
        if oid not in role_ids:
            imported_roles.append({
                "id": oid,
                "label": occupation.get("title") or preferred.get("en") or oid.rsplit("/", 1)[-1],
                "label_nl": preferred.get("nl"),
                "definition": (descriptions.get("en") or {}).get("literal", ""),
                "definition_nl": (descriptions.get("nl") or {}).get("literal", ""),
                "kind": "role", "source": "ESCO", "source_version": VERSION,
                "official": True, "notation": occupation.get("code"),
                "isco_major_group": group_code(occupation),
                "source_url": f"https://ec.europa.eu/esco/api/resource/occupation?uri={urllib.parse.quote(oid, safe=':/')}&language=en",
                "import_batch": "Capability Atlas broad ESCO catalogue sample v0.25.0",
            })
            role_ids.add(oid)
        for relation_type, relation_name in (("esco_essential", "hasEssentialSkill"), ("esco_optional", "hasOptionalSkill")):
            for link in relation_records(occupation, relation_name):
                sid = link.get("uri")
                if not sid:
                    continue
                sampled_skill_ids.add(sid)
                if sid not in capability_by_id:
                    capability = {
                        "id": sid,
                        "label": link.get("title") or sid.rsplit("/", 1)[-1],
                        "kind": "skill", "source": "ESCO", "source_version": VERSION,
                        "official": True,
                        "esco_skill_type": (link.get("skillType") or "").rsplit("/", 1)[-1],
                        "source_url": link.get("href"),
                        "import_batch": "Capability Atlas broad ESCO catalogue sample v0.25.0",
                    }
                    data["capabilities"].append(capability)
                    capability_by_id[sid] = capability
                    new_caps += 1
                edge_key = (oid, sid, relation_type)
                if edge_key not in assertion_keys:
                    data["role_capability_assertions"].append({
                        "from": oid, "to": sid, "type": relation_type,
                        "validation": "source_backed", "source": f"ESCO {VERSION} Web-service API",
                        "source_version": VERSION, "source_relationship": relation_name,
                        "source_occupation_uri": oid, "source_skill_uri": sid,
                        "source_relation_url": link.get("href"),
                    })
                    assertion_keys.add(edge_key)
                    new_assertions += 1
                    source_relation_counts[relation_type] += 1

    # Add one optional first-practice activity for each newly represented ESCO skill.
    # This makes a route discoverable while keeping the official capability itself as
    # the required progress step. Activities and bridges are explicitly Atlas proposals.
    practice_units = []
    for sid in sorted(sampled_skill_ids):
        skill = capability_by_id[sid]
        if skill.get("source") != "ESCO":
            continue
        uuid = sid.rsplit("/", 1)[-1]
        unit_id = f"atlas:esco-entry-practice:{uuid}"
        if unit_id in learning_ids:
            continue
        title = skill["label"]
        unit = {
            "id": unit_id,
            "label": f"Explore a first example of: {title}",
            "label_nl": f"Verken een eerste voorbeeld van: {title}",
            "kind": "learning_unit",
            "definition": f"Use a short, low-risk or simulated task supplied for ‘{title}’. Identify what the task asks, try one bounded example, explain the result, seek feedback, and revise once. A subject-matter expert still needs to define accurate task content, safe boundaries, and a role-appropriate assessment before this can prepare someone for the capability.",
            "source": "Capability Atlas", "source_version": "0.25.0", "official": False,
            "status": "proposed", "estimated_active_learning_hours": {"min": 1, "max": 3, "basis": "illustrative entry-exploration estimate; not calibrated"},
            "assessment": {"method": "guided first-example reflection", "criteria": ["identifies the stated task and its limits", "attempts one bounded example using supplied information", "checks the result and describes feedback or uncertainty"]},
            "reusability": {"classification": "generic navigation scaffold", "hypothesis": "The activity is a placeholder for designing a context-specific first practice, not evidence that the same instruction or assessment fits every occupation."},
            "evidence_basis": "Atlas-authored generic entry activity attached to an official ESCO skill. Not an ESCO learning outcome, prerequisite, or validated preparation activity.",
            "esco_skill_uri": sid,
        }
        practice_units.append(unit)
        learning_ids.add(unit_id)
        decomp_key = (sid, unit_id, "decomposes_into")
        if decomp_key not in decomposition_keys:
            data["decompositions"].append({
                "from": sid, "to": unit_id, "type": "decomposes_into",
                "validation": "proposed", "source": "Capability Atlas ESCO entry-practice scaffold v0.25.0",
                "completion_requirement": "optional", "rationale": "Optional entry-exploration scaffold; does not count as completing the ESCO capability.",
            })
            decomposition_keys.add(decomp_key)
    data["learning_units"].extend(practice_units)

    # Connect practice entries to already-reachable reading and practical numeracy
    # foundations. These are recommended learning routes, not universal occupational prerequisites.
    prereq_keys = {(e["from"], e["to"], e.get("type")) for e in data["decompositions"]}
    communication_root = "atlas:alu:profession-foundation:communication:read-and-produce-practical-texts"
    numeracy_root = "atlas:alu:profession-foundation:numeracy:solve-routine-number-problems"
    quantitative_terms = re.compile(r"\b(calculate|calculation|count|estimate|measure|measurement|numer|quantity|quantit|statistic|budget|price|rate|ratio|percent|dose|weigh|weight|length|volume|currency|cost|finance|tax)\b", re.I)
    route_edges = 0
    for unit in practice_units:
        roots = {communication_root}
        if quantitative_terms.search(unit["label"]):
            roots.add(numeracy_root)
        for root in roots:
            key = (root, unit["id"], "prerequisite_for")
            if key not in prereq_keys:
                data["decompositions"].append({
                    "from": root, "to": unit["id"], "type": "prerequisite_for",
                    "validation": "proposed", "strength": "recommended", "source": "Capability Atlas ESCO entry-practice scaffold v0.25.0",
                    "rationale": "A navigation suggestion for exploring this capability through task briefs and, where the label signals quantities, routine numeracy. It is not a universal prerequisite for occupational competence.",
                })
                prereq_keys.add(key)
                route_edges += 1

    data["roles"].extend(imported_roles)
    data["metadata"]["title"] = "Broad ESCO occupation catalogue sample and Atlas learning routes"
    data["metadata"]["source"] = "Official ESCO Web-service API v1.2.1, queried in English with Dutch preferred labels retained where supplied, plus Atlas-authored life roles, professions, frameworks, and proposed learning content."
    data["metadata"]["note"] = (
        "The ESCO occupation and skill concept IDs and Essential/Optional occupation-skill relationships in the broad import are source-backed from the official ESCO Web-service API. "
        "The included sample is systematically spread across the ten ISCO major groups, not the complete ESCO occupation catalogue. ESCO links are not prerequisites. "
        "Atlas entry-practice units and their recommended bridges to practical reading and selected numeracy are navigation scaffolds only; they are generic, proposed, unvalidated, and do not establish skill mastery, qualification readiness, or authorization to practise."
    )
    data["metadata"]["decomposition"] += (
        " Capability Atlas v0.25.0 imports a systematic 40-per-group sample from the official ESCO v1.2.1 Web-service API across the ten ISCO major groups. Each represented ESCO skill receives an optional, generic first-practice placeholder and a proposed recommended bridge from reachable practical-reading foundations; numeric-topic skills also receive a routine-numeracy bridge. These placeholders do not count as required role progress and are not validated learning outcomes. The API sample has not been independently reconciled against a separately downloaded ESCO package."
    )
    data["metadata"]["esco_v025_import"] = {
        "source": "https://ec.europa.eu/esco/api/search",
        "api_version": VERSION,
        "retrieved_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "catalogue_current_search_total": len(by_uri),
        "sample_method": f"Systematic selection of up to {SAMPLE_PER_ISCO_MAJOR_GROUP} occupations per ISCO major group, evenly distributed across occupation codes.",
        "occupations_by_isco_major_group": sample_counts,
        "occupation_count_added": len(imported_roles),
        "unique_skill_count_in_selected_occupations": len(sampled_skill_ids),
        "new_skill_nodes_added": new_caps,
        "occupation_skill_assertions_added": new_assertions,
        "essential_relationships_added": source_relation_counts["esco_essential"],
        "optional_relationships_added": source_relation_counts["esco_optional"],
        "optional_entry_practice_units_added": len(practice_units),
        "recommended_route_edges_added": route_edges,
    }
    save_dataset(data)
    print(json.dumps({
        "elapsed_seconds": round(time.time() - t0, 1), "catalogue_total": len(by_uri), "sample_by_group": sample_counts,
        "roles_added": len(imported_roles), "skills_in_roles": len(sampled_skill_ids), "new_skill_nodes": new_caps,
        "assertions_added": new_assertions, "relation_types_added": source_relation_counts,
        "entry_practice_units_added": len(practice_units), "route_edges_added": route_edges,
        "total_roles": len(data["roles"]), "total_capabilities": len(data["capabilities"]),
        "total_learning_units": len(data["learning_units"]), "total_decompositions": len(data["decompositions"]),
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
