#!/usr/bin/env python3
"""Prepare explicitly declared PNG/TIFF samples for the existing MATERIALTRUTH desk.

This is a source adapter, not a photometric solver or calibration procedure.
The final staged stack must pass the actual JavaScript PGM/project admission.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

try:
    import numpy as np
    import PIL
    from PIL import Image
    import png
except ImportError as exc:
    raise SystemExit(
        "Capture preparation dependencies are missing. Run: "
        "python -m pip install -r tools/requirements-capture.txt"
    ) from exc

FORMAT = "materialtruth.capture-preparation/v1"
TRANSLATED_FORMAT = "materialtruth.capture-preparation/v2"
ADAPTER = "materialtruth-capture-preparation/1"
RECEIPT_FORMAT = "materialtruth.capture-preparation-receipt/v1"
MAX_CONFIG_BYTES = 128 * 1024
MAX_SOURCE_BYTES = 64 * 1024 * 1024
MAX_SOURCE_PIXELS = 16 * 1024 * 1024
MAX_SOURCE_EDGE = 8192
RESERVED_FILES = {"manifest.json", "preparation-config.json", "preparation-receipt.json"}
HASH = re.compile(r"^[0-9a-f]{64}$")
CAPTURE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$")


class PreparationError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(f"{code}: {message}")


def fail(code, message):
    raise PreparationError(code, message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=True, allow_nan=False, indent=2) + "\n").encode("utf-8")


def closed_record(value, fields, label):
    if type(value) is not dict or set(value) != set(fields):
        fail("PREPARE_FIELDS", f"{label} requires exactly: {', '.join(fields)}.")


def integer(value, lower, upper, label):
    if type(value) is not int or not lower <= value <= upper:
        fail("PREPARE_INTEGER", f"{label} must be an integer in [{lower}, {upper}].")
    return value


def read_bounded(path, limit, label):
    try:
        with path.open("rb") as stream:
            data = stream.read(limit + 1)
    except OSError as exc:
        fail("PREPARE_READ", f"Cannot read {label}: {exc.strerror}.")
    if len(data) > limit:
        fail("PREPARE_BYTES", f"{label} exceeds {limit} bytes.")
    return data


def parse_configuration(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                fail("PREPARE_DUPLICATE_FIELD", f"Duplicate JSON field {key!r}.")
            result[key] = value
        return result

    def constant(value):
        fail("PREPARE_JSON", f"Non-finite JSON constant {value} is unsupported.")

    def floating(value):
        number = float(value)
        if not np.isfinite(number):
            fail("PREPARE_JSON", "Overflowed or non-finite JSON numbers are unsupported.")
        return number

    try:
        config = json.loads(raw.decode("utf-8"), object_pairs_hook=pairs, parse_constant=constant, parse_float=floating)
    except (UnicodeDecodeError, ValueError, RecursionError) as exc:
        if isinstance(exc, PreparationError):
            raise
        fail("PREPARE_JSON", f"Configuration must be bounded valid UTF-8 JSON: {exc}.")
    closed_record(config, ("format", "manifest", "transfer", "channel", "spatial", "sources"), "configuration")
    if config["format"] not in (FORMAT, TRANSLATED_FORMAT):
        fail("PREPARE_FORMAT", f"format must be {FORMAT} or {TRANSLATED_FORMAT}.")
    if config["transfer"] not in ("linear-declared", "srgb-declared"):
        fail("PREPARE_TRANSFER", "Declare linear-declared or srgb-declared; unknown transfer is refused.")
    if config["channel"] not in ("gray", "red", "green", "blue"):
        fail("PREPARE_CHANNEL", "Choose gray, red, green, or blue; channels are never mixed implicitly.")
    spatial = config["spatial"]
    translated = config["format"] == TRANSLATED_FORMAT
    closed_record(spatial, ("crop", "stride", "referenceCaptureId") if translated else ("crop", "stride"), "spatial")
    integer(spatial["stride"], 1, 64, "spatial.stride")
    if spatial["crop"] is not None:
        closed_record(spatial["crop"], ("x", "y", "width", "height"), "spatial.crop")
        for field in ("x", "y", "width", "height"):
            integer(spatial["crop"][field], 0 if field in ("x", "y") else 1, MAX_SOURCE_EDGE, f"crop.{field}")
    manifest = config["manifest"]
    closed_record(manifest, ("format", "title", "origin", "sampleMeaning", "captures", "declarations", "rights", "processing", "notes", "settings"), "manifest")
    if manifest["format"] != "materialtruth.pgm-stack/v1" or manifest["sampleMeaning"] != "linear-declared":
        fail("PREPARE_MANIFEST", "Output requires materialtruth.pgm-stack/v1 and sampleMeaning linear-declared.")
    captures = manifest["captures"]
    if type(captures) is not list or not 4 <= len(captures) <= 12:
        fail("PREPARE_CAPTURES", "The desk requires 4..12 captures.")
    ids, filenames = set(), set()
    for capture in captures:
        closed_record(capture, ("id", "label", "file", "light", "role"), "manifest capture")
        cid, filename = capture["id"], capture["file"]
        if not isinstance(cid, str) or not CAPTURE_ID.fullmatch(cid) or cid in ids:
            fail("PREPARE_CAPTURE_ID", "Capture IDs must be unique valid desk IDs.")
        ids.add(cid)
        if (not isinstance(filename, str) or len(filename) > 255 or
                not filename.lower().endswith(".pgm") or any(c in filename for c in "\\/\0") or
                filename in filenames or filename in RESERVED_FILES):
            fail("PREPARE_OUTPUT_FILE", "Output filenames must be unique .pgm basenames.")
        filenames.add(filename)
    for field in ("processing", "notes"):
        if not isinstance(manifest[field], str):
            fail("PREPARE_MANIFEST", f"manifest.{field} must be text.")
    sources = config["sources"]
    if type(sources) is not list or len(sources) != len(captures):
        fail("PREPARE_BINDING", "Exactly one source must bind each manifest capture ID.")
    seen_ids, seen_files = set(), set()
    for source in sources:
        closed_record(source, ("captureId", "file", "sha256", "offset") if translated else ("captureId", "file", "sha256"), "source")
        if translated:
            closed_record(source["offset"], ("x", "y"), "source.offset")
            for axis in ("x", "y"):
                integer(source["offset"][axis], -MAX_SOURCE_EDGE, MAX_SOURCE_EDGE, "source.offset." + axis)
        cid, filename, digest = source["captureId"], source["file"], source["sha256"]
        if not isinstance(cid, str) or cid not in ids or cid in seen_ids:
            fail("PREPARE_BINDING", "Source capture IDs must bind the manifest exactly once.")
        seen_ids.add(cid)
        if (not isinstance(filename, str) or not filename or "\\" in filename or "\0" in filename or
                Path(filename).is_absolute() or ".." in Path(filename).parts or filename in seen_files):
            fail("PREPARE_SOURCE_PATH", "Source files must be unique relative paths beneath the configuration directory.")
        seen_files.add(filename)
        if not isinstance(digest, str) or not HASH.fullmatch(digest):
            fail("PREPARE_SOURCE_HASH", "Each source requires its lowercase raw-byte SHA-256.")
    if translated:
        reference = spatial["referenceCaptureId"]
        if not isinstance(reference, str) or reference not in ids:
            fail("PREPARE_REFERENCE", "referenceCaptureId must identify a manifest capture.")
        anchor = next(source for source in sources if source["captureId"] == reference)
        if anchor["offset"] != {"x": 0, "y": 0}:
            fail("PREPARE_REFERENCE", "The reference capture must have zero offset.")
    return config


def check_shape(width, height):
    if not (1 <= width <= MAX_SOURCE_EDGE and 1 <= height <= MAX_SOURCE_EDGE and width * height <= MAX_SOURCE_PIXELS):
        fail("PREPARE_SOURCE_DIMENSIONS", f"Source exceeds {MAX_SOURCE_EDGE} pixels per edge or {MAX_SOURCE_PIXELS} pixels.")


def png_chunks(raw):
    """Bound and check container metadata; PyPNG owns all actual raster decoding."""
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        fail("PREPARE_PNG", "The .png source does not have a PNG signature.")
    offset, index, found_end, tags = 8, 0, False, []
    while offset < len(raw):
        if len(raw) - offset < 12:
            fail("PREPARE_PNG", "Truncated PNG chunk.")
        size = struct.unpack_from(">I", raw, offset)[0]
        kind = raw[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(raw):
            fail("PREPARE_PNG", "PNG chunk extends beyond the source bytes.")
        payload = memoryview(raw)[offset + 8:offset + 8 + size]
        checksum = struct.unpack_from(">I", raw, offset + 8 + size)[0]
        if zlib.crc32(payload, zlib.crc32(kind)) & 0xffffffff != checksum:
            fail("PREPARE_PNG_CRC", "PNG checksum failure.")
        if (index == 0 and kind != b"IHDR") or (index > 0 and kind == b"IHDR"):
            fail("PREPARE_PNG", "PNG must contain one initial IHDR.")
        if kind == b"IHDR":
            if size != 13:
                fail("PREPARE_PNG", "Invalid IHDR size.")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            check_shape(width, height)
            if depth not in (8, 16) or color not in (0, 2):
                fail("PREPARE_PIXEL_TYPE", "PNG supports only unsigned 8/16-bit gray or RGB without alpha/palette.")
            if compression != 0 or filtering != 0 or interlace not in (0, 1):
                fail("PREPARE_PNG", "Unsupported PNG encoding.")
        if kind in (b"tRNS", b"acTL", b"fcTL", b"fdAT", b"eXIf", b"sBIT"):
            fail("PREPARE_PNG_METADATA", f"PNG {kind.decode('ascii')} is unsupported: no transparency, animation, orientation or sample-depth remapping.")
        if kind in (b"gAMA", b"sRGB", b"iCCP", b"cHRM", b"cICP"):
            tag = {"name": kind.decode("ascii"), "byteLength": size, "sha256": sha256(payload)}
            if kind == b"gAMA" and size == 4:
                tag["encodedGamma"] = struct.unpack(">I", payload)[0] / 100000
            if kind == b"sRGB" and size == 1:
                tag["renderingIntent"] = payload[0]
            tags.append(tag)
        offset = end
        index += 1
        if kind == b"IEND":
            if size != 0 or offset != len(raw):
                fail("PREPARE_PNG", "PNG must end exactly at its empty IEND chunk.")
            found_end = True
            break
    if not found_end:
        fail("PREPARE_PNG", "PNG IEND is missing.")
    return tags


def decode_png(raw):
    tags = png_chunks(raw)
    try:
        width, height, rows, info = png.Reader(bytes=raw).read()
        channels = info["planes"]
        # read(), deliberately not asDirect(): retain native integer samples.
        pixels = np.asarray([np.asarray(row, dtype=np.uint16) for row in rows], dtype=np.uint16)
        if pixels.shape != (height, width * channels):
            fail("PREPARE_PNG", "Decoded PNG raster shape does not match its header.")
        pixels = pixels.reshape(height, width, channels)
    except (png.Error, ValueError, TypeError, struct.error, zlib.error) as exc:
        if isinstance(exc, PreparationError):
            raise
        fail("PREPARE_DECODE", f"PNG decoding failed: {exc}.")
    return pixels, {"format": "PNG", "width": width, "height": height,
                    "bitDepth": info["bitdepth"], "channels": channels,
                    "orientation": "stored-row-major-top-left", "colorMetadata": tags}


def decode_tiff(raw):
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != "TIFF":
                fail("PREPARE_TIFF", "The TIFF source has another file format.")
            check_shape(*image.size)
            if getattr(image, "n_frames", 1) != 1:
                fail("PREPARE_FRAMES", "TIFF must contain exactly one image page.")
            tags = image.tag_v2
            if tags.get(274, 1) != 1:
                fail("PREPARE_ORIENTATION", "TIFF orientation must be absent or top-left (1); no silent rotation/flip.")
            bits = tuple(tags.get(258, (1,)))
            sample_format = tags.get(339, (1,))
            if isinstance(sample_format, int):
                sample_format = (sample_format,)
            photo = tags.get(262)
            if (not bits or len(set(bits)) != 1 or bits[0] not in (8, 16) or
                    any(value != 1 for value in sample_format) or photo not in (1, 2) or tags.get(338)):
                fail("PREPARE_PIXEL_TYPE", "TIFF requires unsigned 8/16-bit black-is-zero gray or RGB without alpha.")
            if tags.get(259, 1) not in (1, 5, 8, 32946, 32773):
                fail("PREPARE_TIFF_COMPRESSION", "Only uncompressed, LZW, Deflate or PackBits TIFF is supported.")
            channels = 1 if photo == 1 else 3
            if len(bits) != channels or tags.get(277, channels) != channels:
                fail("PREPARE_PIXEL_TYPE", "TIFF channel layout is unsupported.")
            if channels == 3 and bits[0] == 16:
                fail("PREPARE_PIXEL_TYPE", "RGB16 TIFF is refused because this decoder cannot preserve it; use RGB16 PNG.")
            if image.mode not in ("L", "I;16", "I;16L", "I;16B", "RGB"):
                fail("PREPARE_PIXEL_TYPE", f"TIFF mode {image.mode} is unsupported.")
            pixels = np.asarray(image)
            expected = (image.height, image.width) if channels == 1 else (image.height, image.width, channels)
            if pixels.shape != expected or pixels.dtype.kind != "u" or pixels.dtype.itemsize * 8 != bits[0]:
                fail("PREPARE_PIXEL_TYPE", "TIFF decoder changed sample type or shape.")
            pixels = pixels.reshape(image.height, image.width, channels).copy()
            color_tags = []
            for number, name in ((34675, "ICCProfile"), (301, "TransferFunction")):
                if number in tags:
                    value = tags[number]
                    data = value if isinstance(value, bytes) else json_bytes(list(value) if isinstance(value, tuple) else value)
                    color_tags.append({"name": name, "byteLength": len(data), "sha256": sha256(data)})
            return pixels, {"format": "TIFF", "width": image.width, "height": image.height,
                            "bitDepth": bits[0], "channels": channels,
                            "orientation": "stored-row-major-top-left", "colorMetadata": color_tags}
    except (OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        if isinstance(exc, PreparationError):
            raise
        fail("PREPARE_DECODE", f"TIFF decoding failed: {exc}.")


def translated_crop(metadata, config, capture_id):
    """Map each reference pixel to source pixel (x + dx, y + dy).

    The actual sampling convention is source pixel = reference pixel + offset;
    offsets are operator-supplied measurements, never estimated from intensity.
    """
    width, height = metadata["width"], metadata["height"]
    offsets = [source["offset"] for source in config["sources"]]
    x0, y0 = max(0, *(-o["x"] for o in offsets)), max(0, *(-o["y"] for o in offsets))
    x1, y1 = min(width, *(width-o["x"] for o in offsets)), min(height, *(height-o["y"] for o in offsets))
    if x1 <= x0 or y1 <= y0:
        fail("PREPARE_OVERLAP", "Measured offsets leave no common source-pixel intersection.")
    crop = config["spatial"]["crop"]
    if crop is None:
        crop = {"x": x0, "y": y0, "width": x1-x0, "height": y1-y0}
    if crop["x"] < x0 or crop["y"] < y0 or crop["x"]+crop["width"] > x1 or crop["y"]+crop["height"] > y1:
        fail("PREPARE_OVERLAP", "The explicit reference crop is outside the common valid intersection.")
    offset = next(source["offset"] for source in config["sources"] if source["captureId"] == capture_id)
    return {**crop, "x": crop["x"]+offset["x"], "y": crop["y"]+offset["y"]}, crop


def convert_samples(pixels, metadata, config, capture_id=None):
    channels = metadata["channels"]
    selected = config["channel"]
    if (selected == "gray") != (channels == 1):
        fail("PREPARE_CHANNEL", f"Selected {selected} is incompatible with {channels}-channel source.")
    channel_index = 0 if selected == "gray" else ("red", "green", "blue").index(selected)
    crop = config["spatial"]["crop"]
    reference_crop = None
    if config["format"] == TRANSLATED_FORMAT:
        crop, reference_crop = translated_crop(metadata, config, capture_id)
    x, y, width, height = (0, 0, metadata["width"], metadata["height"]) if crop is None else (
        crop["x"], crop["y"], crop["width"], crop["height"])
    if x + width > metadata["width"] or y + height > metadata["height"]:
        fail("PREPARE_CROP", "The common explicit crop extends outside a source image.")
    stride = config["spatial"]["stride"]
    out_width, out_height = (width + stride - 1) // stride, (height + stride - 1) // stride
    if not 1 <= out_width <= 256 or not 1 <= out_height <= 256:
        fail("PREPARE_OUTPUT_DIMENSIONS", "Explicit crop/stride must produce dimensions from 1 through 256.")
    native = pixels[y:y + height:stride, x:x + width:stride, channel_index]
    linear = native.astype(np.float64) / ((1 << metadata["bitDepth"]) - 1)
    if config["transfer"] == "srgb-declared":
        linear = np.where(linear <= 0.04045, linear / 12.92, ((linear + 0.055) / 1.055) ** 2.4)
    quantized = np.floor(linear * 65535 + 0.5).astype(">u2")
    pgm = f"P5\n{out_width} {out_height}\n65535\n".encode("ascii") + quantized.tobytes(order="C")
    error = float(np.max(np.abs(quantized.astype(np.float64) / 65535 - linear)))
    coordinates = {"sourceCoordinate": {"x0": x, "y0": y, "xStep": stride, "yStep": stride}}
    if reference_crop is not None:
        coordinates["referenceCoordinate"] = {"captureId": config["spatial"]["referenceCaptureId"], "x0": reference_crop["x"], "y0": reference_crop["y"], "xStep": stride, "yStep": stride}
    return pgm, {"width": out_width, "height": out_height, "maxValue": 65535,
                 "minimumIntegerSample": int(quantized.min()), "maximumIntegerSample": int(quantized.max()),
                 "maxAbsoluteQuantizationError": error,
                 **coordinates}


JS_ADMISSION = r"""
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [deskRoot, stackRoot] = process.argv.slice(1);
try {
  const { buildPgmProject } = await import(pathToFileURL(join(deskRoot, 'app/pgm.mjs')));
  const manifestText = await readFile(join(stackRoot, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  const files = await Promise.all(manifest.captures.map(async capture => ({
    name: capture.file, bytes: new Uint8Array(await readFile(join(stackRoot, capture.file)))
  })));
  const { project } = await buildPgmProject(manifestText, files);
  console.log(JSON.stringify({format: project.format, dimensions: project.dimensions, captures: project.captures.length}));
} catch(error) {
  console.error(`${error.code || 'ADMISSION'}: ${error.message}`);
  process.exitCode = 2;
}
"""


def admit_with_desk(desk_root, stage):
    try:
        result = subprocess.run(["node", "--input-type=module", "-e", JS_ADMISSION, str(desk_root), str(stage)],
                                text=True, capture_output=True, check=False, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as exc:
        fail("PREPARE_DESK_ADMISSION", f"Cannot run the actual Node.js desk admission: {exc}.")
    if result.returncode != 0:
        fail("PREPARE_DESK_ADMISSION", result.stderr.strip()[:2000] or "The existing desk refused this stack.")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        fail("PREPARE_DESK_ADMISSION", "The desk admission did not return its expected result.")


def prepare(config_path, output_path, desk_root=None):
    config_path, output_path = Path(config_path).resolve(), Path(output_path).absolute()
    desk_root = Path(desk_root).resolve() if desk_root else Path(__file__).resolve().parents[1]
    if output_path.exists() or output_path.is_symlink():
        fail("PREPARE_OUTPUT_EXISTS", "Output must be a new directory; existing output is never overwritten.")
    if not output_path.parent.is_dir():
        fail("PREPARE_OUTPUT_PARENT", "The output parent directory must already exist.")
    raw_config = read_bounded(config_path, MAX_CONFIG_BYTES, "configuration")
    config = parse_configuration(raw_config)
    sources = {source["captureId"]: source for source in config["sources"]}
    module_hashes = {}
    for name in ("app/pgm.mjs", "app/project.mjs"):
        module_hashes[name] = sha256(read_bounded(desk_root / name, 1024 * 1024, name))
    try:
        node_version = subprocess.run(["node", "--version"], text=True, capture_output=True, check=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError) as exc:
        fail("PREPARE_DESK_ADMISSION", f"Node.js is required for the existing desk admission: {exc}.")
    stage = Path(tempfile.mkdtemp(prefix=".capture-preparation-", dir=output_path.parent))
    try:
        receipt_sources, shape, resolved_sources = [], None, set()
        for capture in config["manifest"]["captures"]:
            source = sources[capture["id"]]
            path = (config_path.parent / source["file"]).resolve()
            if not path.is_relative_to(config_path.parent) or path in resolved_sources:
                fail("PREPARE_SOURCE_PATH", "Sources must resolve to distinct files beneath the configuration directory.")
            resolved_sources.add(path)
            raw = read_bounded(path, MAX_SOURCE_BYTES, source["file"])
            digest = sha256(raw)
            if digest != source["sha256"]:
                fail("PREPARE_SOURCE_HASH", f"Source bytes changed for capture {capture['id']}; SHA-256 does not match.")
            suffix = path.suffix.lower()
            if suffix == ".png":
                pixels, metadata = decode_png(raw)
            elif suffix in (".tif", ".tiff"):
                pixels, metadata = decode_tiff(raw)
            else:
                fail("PREPARE_SOURCE_FORMAT", "Sources must be explicit .png, .tif or .tiff files.")
            source_shape = (metadata["width"], metadata["height"], metadata["bitDepth"], metadata["channels"])
            if shape is not None and source_shape != shape:
                fail("PREPARE_SOURCE_MISMATCH", "All sources must have identical dimensions, bit depth and channel layout.")
            shape = source_shape
            pgm, output_metadata = convert_samples(pixels, metadata, config, capture["id"])
            (stage / capture["file"]).write_bytes(pgm)
            receipt_sources.append({"captureId": capture["id"], "file": source["file"],
                                    "rawByteLength": len(raw), "rawSha256": digest, "decoded": metadata,
                                    "output": {"file": capture["file"], "byteLength": len(pgm),
                                               "sha256": sha256(pgm), **output_metadata}})
        receipt = {
            "format": RECEIPT_FORMAT, "adapter": ADAPTER if config["format"] == FORMAT else "materialtruth-capture-preparation/2",
            "configRawSha256": sha256(raw_config), "configuration": config,
            "implementationSha256": sha256(Path(__file__).read_bytes()),
            "runtime": {"python": platform.python_version(), "numpy": np.__version__,
                        "pillow": PIL.__version__, "pypng": png.__version__, "node": node_version},
            "consumer": {"format": "materialtruth.pgm-stack/v1", "moduleSha256": module_hashes,
                         "admission": "actual-JavaScript-admission-required-before-publication"},
            "operations": {
                "channel": config["channel"], "transfer": config["transfer"], "spatial": config["spatial"],
                "normalization": "native unsigned integer / (2^nativeBitDepth - 1)",
                "linearization": "identity" if config["transfer"] == "linear-declared" else
                    "c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4",
                "colorMetadataPolicy": "recorded but not interpreted; the explicit transfer declaration governs",
                "sampling": "identical crop then origin-anchored equal-axis stride; no interpolation or averaging" if config["format"] == FORMAT else "measured integer offsets and common reference crop, then origin-anchored equal-axis stride; no interpolation or averaging",
                "quantization": "floor(linear*65535+0.5); P5 unsigned 16-bit big-endian",
                "lightVectors": "copied exactly from manifest; no normalization or calibration",
                "registration": "no estimated registration, rotation or flip" if config["format"] == FORMAT else "operator-declared integer translation only; source pixel = reference pixel + offset; no estimation, rotation, rescaling or verified registration",
            },
            "evidenceBoundary": "Locally observed byte identities and deterministic declared conversion only; acquisition, rights, response, registration and lights remain declarations. No physical calibration, metrology or defect qualification.",
            "sources": receipt_sources,
        }
        raw_receipt = json_bytes(receipt)
        receipt_hash = sha256(raw_receipt)
        manifest = copy.deepcopy(config["manifest"])
        crop = config["spatial"]["crop"]
        crop_text = "none" if crop is None else ",".join(str(crop[k]) for k in ("x", "y", "width", "height"))
        operation = (f"capture-preparation/{1 if config['format'] == FORMAT else 2}; {config['transfer']}; channel={config['channel']}; "
                     f"crop={crop_text}; stride={config['spatial']['stride']}; q16-half-up")
        if config["format"] == TRANSLATED_FORMAT:
            operation += "; integer-offsets-declared; common-valid-reference-crop; receipt-bound-source-coordinates"
        manifest["processing"] = (manifest["processing"] + "; " if manifest["processing"] else "") + operation
        manifest["notes"] = (manifest["notes"] + " " if manifest["notes"] else "") + (
            f"Preparation receipt SHA-256: {receipt_hash}. Preparation is not calibration.")
        (stage / "manifest.json").write_bytes(json_bytes(manifest))
        (stage / "preparation-config.json").write_bytes(raw_config)
        (stage / "preparation-receipt.json").write_bytes(raw_receipt)
        admission = admit_with_desk(desk_root, stage)
        if output_path.exists() or output_path.is_symlink():
            fail("PREPARE_OUTPUT_EXISTS", "Output appeared during preparation; existing output was preserved.")
        os.rename(stage, output_path)
        return {"output": str(output_path), "receiptSha256": receipt_hash,
                "manifestSha256": sha256((output_path / "manifest.json").read_bytes()), "admission": admission}
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path, help="Strict preparation JSON; source paths resolve beneath this file's directory.")
    parser.add_argument("--output", type=Path, required=True, help="A new output directory; never overwrite an existing directory.")
    parser.add_argument("--desk-root", type=Path, default=None, help="Desk checkout containing app/pgm.mjs (default: this script's repository).")
    args = parser.parse_args(argv)
    try:
        result = prepare(args.config, args.output, args.desk_root)
    except (PreparationError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
