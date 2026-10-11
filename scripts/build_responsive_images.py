#!/usr/bin/env python3
"""Build responsive WebP copies without changing the original photographs.

Requires cwebp 1.6.0 on PATH (or --cwebp /path/to/cwebp). Python uses only
the standard library. Every size is encoded directly from its original.
The source/output manifest is saved beside this script, so --check works
in a fresh checkout. Use --manifest to select another path. --check verifies the saved
source and output hashes, dimensions, metadata, and size savings without
re-encoding images or requiring cwebp.
"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = ROOT / "scripts" / "responsive-images.json"
ENCODER_VERSION = "1.6.0"
ENCODER_SETTINGS = ["-q", "80", "-m", "6", "-metadata", "none"]
RESIZE_METHOD = "width, round(original_height * width / original_width)"
SOURCES = {
    "images/amssm-2026/mgt-poster-presentation-1.jpg": (360, 640, 960),
    "images/amssm-2026/mgt-poster-presentation-2.jpg": (360, 640, 960),
    "images/team-2026/kimberly-sideline.jpg": (360, 640, 960),
    "images/team-2026/chargers.webp": (360, 640, 960),
    "images/team-2026/brian-amssm-presentation.webp": (360, 640, 960),
    "images/team-2026/hero-team-group.webp": (360, 640, 720, 800, 960, 1280, 1800),
    "images/team-2026/kimberly-burbank.webp": (360, 480, 600),
    "images/team-2026/brian-donohoe.webp": (360, 480, 600),
}
FULL_WIDTH_SOURCES = frozenset(list(SOURCES)[:5])


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def webp_chunks(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Not a WebP image")
    if struct.unpack_from("<I", data, 4)[0] + 8 != len(data):
        raise ValueError("Invalid WebP file length")
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset:offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        payload = data[offset + 8:offset + 8 + size]
        if len(payload) != size:
            raise ValueError("Truncated WebP chunk")
        yield kind, payload
        offset += 8 + size + (size % 2)
    if offset != len(data):
        raise ValueError("Invalid WebP chunk padding")


def dimensions(path):
    data = path.read_bytes()
    if data[:2] == b"\xff\xd8":
        offset = 2
        # JPEG Start of Frame markers that contain the encoded dimensions.
        frames = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                  0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
        while offset < len(data):
            if data[offset] != 0xFF:
                raise ValueError(f"Invalid JPEG marker in {path}")
            while offset < len(data) and data[offset] == 0xFF:
                offset += 1
            marker = data[offset]
            offset += 1
            if marker in {0x01, 0xD8, 0xD9, *range(0xD0, 0xD8)}:
                continue
            size = struct.unpack_from(">H", data, offset)[0]
            if marker in frames:
                height, width = struct.unpack_from(">HH", data, offset + 3)
                return width, height
            if size < 2:
                raise ValueError(f"Invalid JPEG segment in {path}")
            offset += size
    else:
        for kind, payload in webp_chunks(data):
            if kind == b"VP8X":
                return (1 + int.from_bytes(payload[4:7], "little"),
                        1 + int.from_bytes(payload[7:10], "little"))
            if kind == b"VP8 " and payload[3:6] == b"\x9d\x01\x2a":
                width, height = struct.unpack_from("<HH", payload, 6)
                return width & 0x3FFF, height & 0x3FFF
            if kind == b"VP8L" and payload[0] == 0x2F:
                bits = int.from_bytes(payload[1:5], "little")
                return 1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)
    raise ValueError(f"Cannot read image dimensions: {path}")


def widths_for(source, original_width):
    requested = SOURCES[source]
    if source in FULL_WIDTH_SOURCES:
        requested = (*requested, original_width)
    return sorted({width for width in requested if width <= original_width})


def output_path(source, width):
    path = Path(source)
    return path.with_name(f"{path.stem}-{width}-optimized.webp")


def output_height(width, source_record):
    return round(source_record["height"] * width / source_record["width"])


def image_record(path):
    width, height = dimensions(path)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "width": width,
        "height": height,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def validate_output(path, width, source_record):
    if not path.is_file():
        raise ValueError(f"Missing output: {path.relative_to(ROOT)}")
    result = image_record(path)
    original_width = source_record["width"]
    original_height = source_record["height"]
    if result["width"] != width:
        raise ValueError(f"Incorrect output width: {result['path']}")
    if result["height"] != output_height(width, source_record):
        raise ValueError(f"Incorrect output height: {result['path']}")
    if width > original_width or result["height"] > original_height:
        raise ValueError(f"Upscaled output: {result['path']}")
    if abs(result["height"] - original_height * width / original_width) > 1:
        raise ValueError(f"Changed aspect ratio: {result['path']}")
    if not 0 < result["bytes"] < source_record["bytes"]:
        raise ValueError(f"Output must be smaller than its original: {result['path']}")
    if any(kind in {b"EXIF", b"XMP ", b"ICCP"}
           for kind, _ in webp_chunks(path.read_bytes())):
        raise ValueError(f"Unexpected metadata: {result['path']}")
    return result


def check(manifest_path):
    if not manifest_path.is_file():
        raise ValueError(f"Missing manifest: {manifest_path}. Run the builder first.")
    manifest = json.loads(manifest_path.read_text())
    if (manifest.get("format") != 1
            or manifest.get("encoder") != f"cwebp {ENCODER_VERSION}"
            or manifest.get("settings") != ENCODER_SETTINGS
            or manifest.get("resize") != RESIZE_METHOD):
        raise ValueError("Manifest encoder settings are stale. Run the builder.")
    records = manifest.get("sources", [])
    if [record["path"] for record in records] != list(SOURCES):
        raise ValueError("Manifest source list is stale. Run the builder.")
    count = 0
    for record in records:
        source = record["path"]
        current_source = image_record(ROOT / source)
        if current_source != {key: record[key] for key in current_source}:
            raise ValueError(f"Source has changed: {source}. Run the builder.")
        widths = widths_for(source, current_source["width"])
        expected = [output_path(source, width).as_posix() for width in widths]
        if [output["path"] for output in record["outputs"]] != expected:
            raise ValueError(f"Manifest output list is stale: {source}")
        for width, saved in zip(widths, record["outputs"]):
            current = validate_output(ROOT / saved["path"], width, current_source)
            if current != saved:
                raise ValueError(f"Output has changed: {saved['path']}. Run the builder.")
            count += 1
    print(f"Verified {count} responsive images against source/output SHA-256 hashes.")


def build(manifest_path, cwebp):
    executable = shutil.which(cwebp)
    if not executable:
        raise ValueError("cwebp not found. Install libwebp 1.6.0 or pass --cwebp.")
    version = subprocess.run(
        [executable, "-version"], check=True, capture_output=True, text=True
    ).stdout.splitlines()[0]
    if version != ENCODER_VERSION:
        raise ValueError(f"Expected cwebp {ENCODER_VERSION}, found {version}.")
    manifest = {
        "format": 1,
        "encoder": f"cwebp {version}",
        "settings": ENCODER_SETTINGS,
        "resize": RESIZE_METHOD,
        "sources": [],
    }
    count = 0
    for source in SOURCES:
        source_path = ROOT / source
        source_record = image_record(source_path)
        outputs = []
        for width in widths_for(source, source_record["width"]):
            target = ROOT / output_path(source, width)
            if target == source_path:
                raise ValueError(f"Refusing to overwrite original: {source}")
            # Write and validate a temporary file before replacing a generated copy.
            with tempfile.NamedTemporaryFile(
                prefix=f".{target.stem}-", suffix=".webp", dir=target.parent,
                delete=False
            ) as temporary:
                temporary_path = Path(temporary.name)
            try:
                subprocess.run(
                    [executable, *ENCODER_SETTINGS, "-resize", str(width),
                     str(output_height(width, source_record)),
                     str(source_path), "-o", str(temporary_path)],
                    check=True, capture_output=True, text=True
                )
                validate_output(temporary_path, width, source_record)
                temporary_path.chmod(0o644)
                temporary_path.replace(target)
            finally:
                temporary_path.unlink(missing_ok=True)
            outputs.append(image_record(target))
            count += 1
        if image_record(source_path) != source_record:
            raise ValueError(f"Original changed during encoding: {source}")
        manifest["sources"].append({**source_record, "outputs": outputs})
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {count} responsive images. Originals preserved.")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--cwebp", default="cwebp")
    args = parser.parse_args()
    try:
        if args.check:
            check(args.manifest)
        else:
            build(args.manifest, args.cwebp)
    except (ValueError, OSError, KeyError, IndexError, struct.error,
            subprocess.CalledProcessError) as error:
        parser.exit(1, f"Image build failed: {error}\n")
