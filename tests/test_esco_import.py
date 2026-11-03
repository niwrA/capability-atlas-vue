"""Source import behavior using small, self-contained JSON-LD archives."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import dataset_io
from esco_archive import iter_archive_graph
from import_esco_full import normalize, reconcile, build_import, inventory_archive


def label(en, nl=None):
    return [{'literalForm': {language: text}} for language, text in [('en', en), ('nl', nl)] if text]


def fixture():
    return [
        {'uri': 'occupation:one', 'type': ['skos:Concept', 'esco:Occupation'], 'status': 'released',
         'preferredLabel': label('A role', 'Een beroep'), 'description': {'language': 'en', 'nodeLiteral': 'Role description'},
         'relatedEssentialSkill': 'skill:one', 'notation': '1234.5',
         'hasAssociation': {'isAssociationFor': 'occupation:one', 'target': 'skill:one', 'associationType': 'http://example/optional-skill'}},
        {'uri': 'skill:one', 'type': 'esco:Skill', 'status': 'released', 'preferredLabel': label('A skill', 'Een vaardigheid'),
         'isEssentialSkillFor': ['occupation:one'], 'skillType': 'http://example/skill'},
        {'uri': 'skill:unlinked', 'type': 'esco:Skill', 'status': 'released', 'preferredLabel': {'literalForm': {'en': 'Unlinked skill'}}},
        {'uri': 'skill:old', 'type': 'esco:Skill', 'status': 'obsolete', 'preferredLabel': label('Retired skill'), 'isReplacedBy': 'skill:one'},
        {'uri': 'group:one', 'type': 'skos:Concept', 'preferredLabel': label('A classification group')},
    ]


def existing():
    return {
        'roles': [{'id': 'occupation:one', 'source': 'ESCO', 'label': 'Old label'}, {'id': 'atlas:role', 'kind': 'role', 'label': 'Atlas life role'}],
        'capabilities': [{'id': 'skill:old', 'source': 'ESCO', 'label': 'Old skill'}, {'id': 'atlas:skill', 'kind': 'skill'}],
        'learning_units': [{'id': 'atlas:unit', 'kind': 'learning_unit', 'assessment': {'criteria': ['Existing criterion']}}],
        'role_capability_assertions': [{'from': 'occupation:one', 'to': 'skill:old', 'type': 'esco_essential'}, {'from': 'atlas:role', 'to': 'atlas:skill', 'type': 'atlas_required'}],
        'decompositions': [{'from': 'skill:old', 'to': 'atlas:unit', 'type': 'decomposes_into'}],
        'metadata': {},
    }


class ArchiveTests(unittest.TestCase):
    def test_absolute_member_name_is_streamed_without_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'v1.2.1.zip'
            with ZipFile(archive, 'w') as zipped:
                zipped.writestr('/esco-v1.2.1.json-ld', json.dumps({'@context': {}, '@graph': fixture()}))
            self.assertEqual(list(iter_archive_graph(archive)), fixture())
            self.assertEqual(len(list(Path(directory).iterdir())), 1)

    def test_truncated_graph_or_missing_separator_is_rejected(self):
        for text in ['{"@graph":[{"uri":"one"}', '{"@graph":[{"uri":"one"}{"uri":"two"}]}', '{"@graph":[{"uri":"one"},]}']:
            with self.subTest(text=text), tempfile.TemporaryDirectory() as directory:
                archive = Path(directory) / 'v1.2.1.zip'
                with ZipFile(archive, 'w') as zipped:
                    zipped.writestr('esco-v1.2.1.json-ld', text)
                with self.assertRaises(ValueError):
                    list(iter_archive_graph(archive))

    def test_checkpoint_resumes_after_an_interruption(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'v1.2.1.zip'
            rows = [{'uri': f'group:{i}', 'type': 'skos:Concept'} for i in range(1002)]
            with ZipFile(archive, 'w') as zipped:
                zipped.writestr('esco-v1.2.1.json-ld', json.dumps({'@graph': rows}))

            def interrupted(_):
                yield from rows[:1000]
                raise OSError('Interrupted read')

            with patch('import_esco_full.iter_archive_graph', interrupted):
                with self.assertRaisesRegex(OSError, 'Interrupted'):
                    inventory_archive(archive)
            _, records = inventory_archive(archive)
            self.assertEqual(len(records), len(rows))
            self.assertEqual(len({r['concept']['id'] for r in records}), len(rows))
            with patch('import_esco_full.iter_archive_graph', side_effect=AssertionError('Cache should be reused')):
                _, cached = inventory_archive(archive)
            self.assertEqual(cached, records)


class ImportTests(unittest.TestCase):
    def test_bilingual_singleton_and_array_labels_and_descriptions(self):
        record = fixture()[0]
        value = normalize(record)['concept']
        self.assertEqual(value['label_nl'], 'Een beroep')
        self.assertEqual(value['definition'], 'Role description')
        self.assertIsNone(value['definition_nl'])
        self.assertIn('definition_nl', value['missing_source_fields'])

    def test_incomplete_or_inconsistent_source_relationships_are_rejected(self):
        rows = fixture()
        rows[1]['isEssentialSkillFor'] = []
        with self.assertRaisesRegex(ValueError, 'disagree'):
            reconcile([normalize(r) for r in rows])
        rows = fixture()
        rows[0]['relatedEssentialSkill'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'missing or obsolete'):
            reconcile([normalize(r) for r in rows])

    def test_all_skills_are_imported_without_generating_learning_content(self):
        before = existing()
        after, report = build_import(copy.deepcopy(before), [normalize(r) for r in fixture()], 'digest', 'v1.2.1.zip')
        self.assertEqual(report['inventory']['skills_without_occupation_links'], 1)
        self.assertEqual(report['inventory']['occupation_skill_links'], 1)
        self.assertEqual(report['source_relationship_policy']['embedded_only_links'], 1)
        self.assertEqual(after['learning_units'], before['learning_units'])
        self.assertEqual(after['decompositions'], before['decompositions'])
        self.assertEqual(after['roles'][1], before['roles'][1])
        self.assertEqual(after['role_capability_assertions'][0]['type'], 'atlas_required')
        self.assertEqual(report['retained_obsolete_concepts'], ['skill:old'])
        retired = next(c for c in after['capabilities'] if c['id'] == 'skill:old')
        self.assertEqual(retired['source_status'], 'obsolete')
        self.assertEqual(retired['replaced_by'], 'skill:one')
        repeated, second_report = build_import(copy.deepcopy(after), [normalize(r) for r in fixture()], 'digest', 'v1.2.1.zip')
        self.assertEqual(repeated, after)
        self.assertEqual(second_report, report)

    def test_manifest_publication_is_atomic_and_reruns_do_not_create_more_files(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(dataset_io, 'DATA_DIRECTORY', Path(directory)):
            original = {'roles': [{'id': 'one'}], 'metadata': {'title': 'Original'}}
            dataset_io.save_dataset(original)
            manifest = (Path(directory) / 'manifest.json').read_bytes()
            changed = {'roles': [{'id': 'two'}], 'metadata': {'title': 'Updated'}}
            import os
            replace = os.replace

            def interrupt_manifest(source, target):
                if Path(target).name == 'manifest.json':
                    raise OSError('Interrupted before publication')
                return replace(source, target)

            with patch.object(dataset_io.os, 'replace', interrupt_manifest):
                with self.assertRaises(OSError):
                    dataset_io.save_dataset(changed)
            self.assertEqual((Path(directory) / 'manifest.json').read_bytes(), manifest)
            self.assertEqual(dataset_io.load_dataset(), original)
            dataset_io.save_dataset(changed)
            paths = sorted(str(p) for p in Path(directory).rglob('*'))
            dataset_io.save_dataset(changed)
            self.assertEqual(dataset_io.load_dataset(), changed)
            self.assertEqual(sorted(str(p) for p in Path(directory).rglob('*')), paths)


if __name__ == '__main__':
    unittest.main()
