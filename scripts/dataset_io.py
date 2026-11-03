"""Read/write the split authoring dataset without changing source records."""
import json
import hashlib
import os
from pathlib import Path

DATA_DIRECTORY = Path(__file__).resolve().parents[1] / 'data'


def load_dataset():
    manifest = json.loads((DATA_DIRECTORY / 'manifest.json').read_text(encoding='utf-8'))
    data = {}
    for section, files in manifest['sections'].items():
        parts = [json.loads((DATA_DIRECTORY / file).read_text(encoding='utf-8')) for file in files]
        data[section] = [record for part in parts for record in part] if section in manifest['arrays'] else parts[0]
    return data


def save_dataset(data):
    DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA_DIRECTORY / 'manifest.json'
    previous = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'sections': {}}
    manifest = {'format': 1, 'arrays': [], 'sections': {}}
    for section, value in data.items():
        is_array = isinstance(value, list)
        parts = [value[i:i + 500] for i in range(0, len(value), 500)] if is_array else [value]
        if is_array:
            manifest['arrays'].append(section)
        files = []
        for i, part in enumerate(parts):
            text = json.dumps(part, ensure_ascii=False, indent=2) + '\n'
            digest = hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]
            filename = f'{section}/{i:03d}-{digest}.json' if is_array else f'{section}-{digest}.json'
            path = DATA_DIRECTORY / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                temporary = path.with_suffix('.json.tmp')
                temporary.write_text(text, encoding='utf-8', newline='\n')
                os.replace(temporary, path)
            files.append(filename)
        manifest['sections'][section] = files
    # No files referenced by the previous manifest are overwritten. A crash
    # before this final atomic replace leaves the previous dataset readable.
    temporary = DATA_DIRECTORY / 'manifest.json.tmp'
    temporary.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
    os.replace(temporary, DATA_DIRECTORY / 'manifest.json')
    current_files = {filename for files in manifest['sections'].values() for filename in files}
    previous_files = {filename for files in previous['sections'].values() for filename in files}
    for filename in previous_files - current_files:
        path = (DATA_DIRECTORY / filename).resolve()
        if not path.is_relative_to(DATA_DIRECTORY.resolve()):
            raise ValueError('Source manifest contains a path outside the data directory')
        path.unlink(missing_ok=True)
