"""Stream ESCO's JSON-LD graph directly from a ZIP, without extracting paths."""
import io
import json
import re
from zipfile import ZipFile


def iter_archive_graph(archive):
    decoder = json.JSONDecoder()
    with ZipFile(archive) as zipped:
        members = [entry for entry in zipped.infolist() if not entry.is_dir() and entry.filename.endswith(('.json-ld', '.jsonld'))]
        if len(members) != 1:
            raise ValueError('Expected exactly one JSON-LD classification file in the ZIP')
        with io.TextIOWrapper(zipped.open(members[0]), encoding='utf-8-sig') as stream:
            buffer = ''
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    raise ValueError('JSON-LD graph was not found')
                buffer += chunk
                match = re.search(r'"@graph"\s*:\s*\[', buffer)
                if match:
                    buffer = buffer[match.end():]
                    break
                if len(buffer) > 1048576:
                    raise ValueError('Unexpectedly large JSON-LD context')
            position = 0
            after_record = False
            after_comma = False
            while True:
                while position < len(buffer) and buffer[position] in ' \t\r\n':
                    position += 1
                if position < len(buffer) and buffer[position] == ']':
                    if after_comma or (buffer[position + 1:] + stream.read()).strip() != '}':
                        raise ValueError('Invalid JSON-LD graph ending')
                    return
                if after_record and position < len(buffer):
                    if buffer[position] != ',':
                        raise ValueError('Missing separator between JSON-LD graph records')
                    position += 1
                    after_record = False
                    after_comma = True
                    continue
                try:
                    record, end = decoder.raw_decode(buffer, position)
                except json.JSONDecodeError:
                    chunk = stream.read(65536)
                    if not chunk:
                        raise ValueError('Truncated or invalid JSON-LD graph') from None
                    buffer = buffer[position:] + chunk
                    position = 0
                    continue
                if not isinstance(record, dict):
                    raise ValueError('Expected an object in the JSON-LD graph')
                yield record
                position = end
                after_record = True
                after_comma = False
                if position > 1048576:
                    buffer = buffer[position:]
                    position = 0
