"""Reject em dashes in public text, including HTML, URL and JS encodings."""
from pathlib import Path
from html import unescape
from urllib.parse import unquote
import re

ROOT = Path(__file__).resolve().parent.parent
EXTENSIONS = {'.html', '.css', '.js', '.json', '.xml', '.txt', '.vtt', '.webmanifest', '.svg'}
errors = []
count = 0
for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or path.suffix not in EXTENSIONS or any(part.startswith('.') for part in path.relative_to(ROOT).parts):
        continue
    count += 1
    for number, line in enumerate(path.read_text().splitlines(), 1):
        decoded = unescape(unquote(line))
        decoded = re.sub(r'\\u(?:2014|\{2014\})', chr(0x2014), decoded, flags=re.I)
        if chr(0x2014) in decoded:
            errors.append(f'{path.relative_to(ROOT)}:{number}')
if errors:
    raise SystemExit('Em dashes found in: ' + ', '.join(errors))
print(f'Public copy check passed: {count} text files, no em dashes.')
