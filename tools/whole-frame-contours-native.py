#!/usr/bin/env python3
"""Explicit whole-original-frame Canny execution; never stitched ROI fields."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

import cv2
import numpy as np

spec = importlib.util.spec_from_file_location('pixel_walks', Path(__file__).with_name('sequence-contours-native.py'))
walks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(walks)
cv2.setNumThreads(1)
LIMIT = 24 * 1024 * 1024
MAX_PIXELS = 2097152


def inspect(request):
    if request.get('scope') != 'whole-original-frame' or 'roi' in request:
        raise ValueError('Declare whole-original-frame scope without an ROI')
    image = request['image']
    data = base64.b64decode(request['pngBase64'], validate=True)
    if not 24 <= len(data) <= 16 * 1024 * 1024 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Bounded original PNG required')
    width, height = struct.unpack('>II', data[16:24])
    if any(type(image[k]) is not int for k in ('widthPx', 'heightPx')):
        raise ValueError('Original integer raster dimensions required')
    if (width, height) != (image['widthPx'], image['heightPx']) or min(width, height) < 3 or max(width, height) > 8192 or width * height > MAX_PIXELS:
        raise ValueError('Whole original frame exceeds explicit 2097152-pixel capacity or source dimensions differ')
    if hashlib.sha256(data).hexdigest() != image['sha256']:
        raise ValueError('Original PNG hash mismatch')
    # Browser-oriented coordinates must refer to the unchanged native raster.
    # This follows the maintained calibration producer's explicit metadata refusal.
    at = 8
    while at < len(data):
        if at + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = struct.unpack('>I', data[at:at + 4])[0]
        kind = data[at + 4:at + 8]
        if at + 12 + length > len(data):
            raise ValueError('Truncated PNG chunk')
        if kind in (b'eXIf', b'acTL'):
            raise ValueError('EXIF-oriented or animated PNG needs an explicit source interpretation')
        at += 12 + length
        if kind == b'IEND':
            break
    decoded = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if decoded is None or decoded.shape[:2] != (height, width) or decoded.dtype != np.uint8:
        raise ValueError('Original 8-bit PNG decode mismatch')
    if decoded.ndim == 2:
        gray = decoded
    elif decoded.ndim == 3 and decoded.shape[2] in (3, 4):
        if decoded.shape[2] == 4 and np.any(decoded[:, :, 3] != 255):
            raise ValueError('Nonopaque PNG requires an explicit compositing account')
        gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
    else:
        raise ValueError('Unsupported original PNG channels')
    # One native invocation sees every original pixel and its global hysteresis.
    # No ROI, thumbnail, resampling, halo approximation or stitched field.
    edge = (cv2.Canny(gray, 50, 150, apertureSize=3, L2gradient=True) != 0).astype(np.uint8)
    traced = walks.trace_field(edge, scope='whole-original-frame')
    return {
        'format': 'skill-translator.whole-frame-contours/v1',
        'scope': 'whole-original-frame', 'momentId': request['momentId'],
        'image': image, 'origin': request['origin'],
        'method': {'name': 'opencv-whole-frame-canny-contours/v1',
                   'sourceDecode': 'unchanged-u8-opaque', 'cannyLow': 50, 'cannyHigh': 150,
                   'aperture': 3, 'l2Gradient': True, 'retrieval': 'RETR_TREE',
                   'approximation': 'CHAIN_APPROX_NONE', 'opencvVersion': cv2.__version__,
                   'numpyVersion': np.__version__, 'maximumPixels': MAX_PIXELS},
        'field': {'encoding': 'roi-row-major-lsb0/v1',
                  'data': base64.b64encode(np.packbits(edge.reshape(-1), bitorder='little')).decode(),
                  'count': int(edge.sum())},
        **traced,
        'boundary': 'One complete original raster is processed with fixed native settings. '
                    'This removes artificial tile seams, not camera, detector or physical uncertainty. '
                    'Native contour walks can omit edge pixels; complete and omitted fields are retained. '
                    'No physical boundary, identity, contact or task correctness is inferred.'
    }


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(LIMIT + 1)
        if len(raw) > LIMIT:
            raise ValueError('Native request exceeds capacity')
        print(json.dumps(inspect(json.loads(raw))))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
