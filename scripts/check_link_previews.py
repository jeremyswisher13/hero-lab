"""Validate static share metadata and local artwork in link-previews.json.

Run from any directory: python3 scripts/check_link_previews.py
The manifest is an array of {path, title, image, alt, width, height, type}.
Paths may be source files or routes; image paths may be local or site URLs.
"""

import argparse
import json
import re
import struct
from collections import defaultdict
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


ROOT = Path(__file__).resolve().parent.parent
MAIN_LIMIT = 1_000_000
RESOURCE_LIMIT = 10_000_000


class Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.meta = defaultdict(list)
        self.links = defaultdict(list)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'head':
            self.in_head = True
        elif self.in_head and tag == 'meta':
            key = attrs.get('property', attrs.get('name', '')).lower()
            self.meta[key].append(attrs.get('content', ''))
        elif self.in_head and tag == 'link':
            for rel in attrs.get('rel', '').lower().split():
                self.links[rel].append(attrs.get('href', ''))

    def handle_endtag(self, tag):
        if tag == 'head':
            self.in_head = False


def image_info(path):
    """Read PNG or JPEG dimensions without third-party packages."""
    data = path.read_bytes()
    if data.startswith(b'\x89PNG\r\n\x1a\n') and data[12:16] == b'IHDR':
        return (*struct.unpack('>II', data[16:24]), 'image/png')
    if data.startswith(b'\xff\xd8'):
        offset = 2
        while offset < len(data):
            if data[offset] != 0xFF:
                raise ValueError('invalid JPEG marker')
            while offset < len(data) and data[offset] == 0xFF:
                offset += 1
            marker = data[offset]
            offset += 1
            if marker in (0xD8, 0xD9, 0x01) or 0xD0 <= marker <= 0xD7:
                continue
            length = struct.unpack('>H', data[offset:offset + 2])[0]
            if length < 2:
                raise ValueError('invalid JPEG segment length')
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                          0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                height, width = struct.unpack('>HH', data[offset + 3:offset + 7])
                return width, height, 'image/jpeg'
            if marker == 0xDA:
                break
            offset += length
    raise ValueError('image is not a supported PNG or JPEG')


def has_em_dash(text):
    decoded = unescape(unquote(text))
    decoded = re.sub(r'\\u(?:2014|\{2014\})', chr(0x2014), decoded, flags=re.I)
    return chr(0x2014) in decoded


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'scripts/link-previews.json')
    args = parser.parse_args()
    try:
        manifest_text = args.manifest.read_text()
        entries = json.loads(manifest_text)
        if not isinstance(entries, list) or not entries:
            raise ValueError('manifest must be a nonempty array')
        base = 'https://' + (ROOT / 'CNAME').read_text().strip() + '/'
    except (OSError, ValueError) as error:
        raise SystemExit(f'Link preview check failed: {error}')

    errors = []
    seen_paths = set()
    if has_em_dash(manifest_text):
        errors.append('manifest contains an em dash or encoded em dash')

    def local_resource(url):
        parsed = urlsplit(urljoin(base, url))
        if parsed.scheme != 'https' or parsed.netloc != urlsplit(base).netloc:
            raise ValueError(f'preview resource must use the canonical HTTPS host: {url}')
        path = (ROOT / unquote(parsed.path).lstrip('/')).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            raise ValueError(f'preview resource is missing: {url}')
        return path

    for entry in entries:
        label = str(entry.get('path', '<missing path>')) if isinstance(entry, dict) else '<invalid entry>'
        try:
            if not isinstance(entry, dict):
                raise ValueError('entry must be an object')
            for key in ('path', 'title', 'image', 'alt', 'type'):
                if not isinstance(entry.get(key), str) or not entry[key].strip():
                    raise ValueError(f'{key} must be a nonempty string')
            for key in ('width', 'height'):
                if type(entry.get(key)) is not int or entry[key] <= 0:
                    raise ValueError(f'{key} must be a positive integer')
            relative = entry['path'].lstrip('/')
            if not relative or relative.endswith('/'):
                relative += 'index.html'
            path = (ROOT / relative).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():
                raise ValueError('HTML source file does not exist')
            relative = path.relative_to(ROOT).as_posix()
            if relative in seen_paths:
                raise ValueError('duplicate manifest page')
            seen_paths.add(relative)
            canonical = urljoin(base, relative.removesuffix('index.html') if relative.endswith('/index.html') or relative == 'index.html' else relative)
            source = path.read_text()
            if len(source.encode()) > MAIN_LIMIT:
                raise ValueError('HTML exceeds the 1 MB preview guideline')
            if has_em_dash(source):
                raise ValueError('source contains an em dash or encoded em dash')
            head = Head()
            head.feed(source)
            if head.links['canonical'] != [canonical]:
                raise ValueError(f'canonical must occur once and remain {canonical}')
            for key, values in head.meta.items():
                if key.startswith(('og:', 'twitter:')) and len(values) != 1:
                    raise ValueError(f'duplicate {key}')
            image_url = urljoin(base, entry['image'])
            expected = {
                'og:title': entry['title'], 'twitter:title': entry['title'],
                'og:url': canonical,
                'og:image': image_url, 'twitter:image': image_url,
                'og:image:alt': entry['alt'], 'twitter:image:alt': entry['alt'],
                'og:image:width': str(entry['width']), 'og:image:height': str(entry['height']),
                'og:image:type': entry['type'], 'twitter:card': 'summary_large_image',
            }
            for key, value in expected.items():
                if head.meta[key] != [value]:
                    raise ValueError(f'{key} must occur once with manifest value {value!r}')
            for key in ('og:description', 'og:site_name', 'og:type', 'twitter:description'):
                if len(head.meta[key]) != 1 or not head.meta[key][0].strip():
                    raise ValueError(f'{key} must occur once with nonempty content')
            if head.meta['og:description'] != head.meta['twitter:description']:
                raise ValueError('Open Graph and Twitter descriptions differ')
            if head.meta['og:image:secure_url'] and head.meta['og:image:secure_url'] != [image_url]:
                raise ValueError('og:image:secure_url differs from og:image')
            image_path = local_resource(image_url)
            actual = image_info(image_path)
            if actual != (entry['width'], entry['height'], entry['type']):
                raise ValueError(f'image dimensions/type are {actual}, different from manifest')
            if actual[0] < 900:
                raise ValueError('preview image is below Apple\'s 900 px width guideline')
            icons = [local_resource(url) for url in head.links['apple-touch-icon']]
            if not icons:
                raise ValueError('missing static apple-touch-icon fallback')
            if not any((info := image_info(icon))[0] == info[1] and info[0] >= 108 for icon in icons):
                raise ValueError('touch icon must be square and at least 108 px')
            resources = {image_path, *icons}
            resources.update(local_resource(url) for url in head.links['icon'])
            for key in ('og:video', 'og:video:secure_url', 'twitter:player:stream'):
                resources.update(local_resource(url) for url in head.meta[key])
            if sum(resource.stat().st_size for resource in resources) > RESOURCE_LIMIT:
                raise ValueError('preview resources exceed the combined 10 MB guideline')
        except (OSError, ValueError, KeyError, IndexError, struct.error) as error:
            errors.append(f'{label}: {error}')

    if errors:
        raise SystemExit('Link preview check failed:\n' + '\n'.join(f'  {error}' for error in errors))
    print(f'Link preview check passed: {len(entries)} pages, static metadata and artwork verified.')


if __name__ == '__main__':
    main()
