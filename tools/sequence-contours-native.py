#!/usr/bin/env python3
"""Auxiliary native pixel walks; complete source edge evidence remains authoritative."""
import base64
import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np

MAX_PIXELS = 1048576
MAX_VERTICES = 131072
MAX_CHAINS = 4096


def trace_field(edge, offset=(0, 0), *, scope='roi'):
    if scope not in ('roi', 'whole-original-frame'):
        raise ValueError('Explicit supported contour scope required')
    if scope == 'whole-original-frame' and offset != (0, 0):
        raise ValueError('Whole original frame must start at original origin')
    capacity = MAX_PIXELS if scope == 'roi' else 2097152
    if not isinstance(edge, np.ndarray) or edge.dtype != np.uint8 or edge.ndim != 2:
        raise ValueError('A two-dimensional uint8 binary field is required')
    if not 0 < edge.size <= capacity or np.any((edge != 0) & (edge != 1)):
        raise ValueError('A complete bounded binary field is required')
    if len(offset) != 2 or any(type(v) is not int or v < 0 for v in offset):
        raise ValueError('Original nonnegative integer origin is required')
    contours, hierarchy = cv2.findContours(edge * 255, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    if len(contours) > MAX_CHAINS or sum(len(c) for c in contours) > MAX_VERTICES:
        raise ValueError('Complete contour walks exceed capacity; no partial result retained')
    visited = np.zeros(edge.shape, np.uint8)
    chains = []
    for i, contour in enumerate(contours):
        points = contour.reshape(-1, 2)
        if np.any(edge[points[:, 1], points[:, 0]] != 1):
            raise ValueError('Native contour vertex outside original edge field')
        visited[points[:, 1], points[:, 0]] = 1
        chains.append({'id': i, 'points': (points + np.array(offset)).tolist(),
                       'hierarchy': hierarchy.reshape(-1, 4)[i].tolist()})
    omitted = edge & (1 - visited)
    return {'chains': chains, 'coverage': {
        'edgePixels': int(edge.sum()), 'visitedEdgePixels': int(visited.sum()),
        'omittedEdgePixels': int(omitted.sum()),
        'omittedField': base64.b64encode(np.packbits(omitted.reshape(-1), bitorder='little')).decode()
    }}


def inspect(request, edge_inspect):
    # The maintained producer decodes and binds the original PNG. Its full report
    # is retained, including settings, ROI, source identities and straight lines.
    if request.get('representation') != 'complete-field':
        raise ValueError('Complete-field original PNG request required')
    data = base64.b64decode(request['pngBase64'], validate=True)
    if not 24 <= len(data) <= 16 * 1024 * 1024 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Bounded original PNG bytes required')
    at = 8
    while at < len(data):
        if at + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = int.from_bytes(data[at:at+4], 'big')
        kind = data[at+4:at+8]
        if at + 12 + length > len(data):
            raise ValueError('Truncated PNG chunk')
        if kind in (b'eXIf', b'acTL'):
            raise ValueError('EXIF-oriented or animated PNG needs an explicit source interpretation')
        at += 12 + length
        if kind == b'IEND':
            break
    report = edge_inspect(request)
    x, y, width, height = report['roi']
    bits = np.unpackbits(np.frombuffer(base64.b64decode(report['field']['data'], validate=True),
                                    np.uint8), bitorder='little')[:width * height].reshape(height, width)
    traced = trace_field(bits, (x, y))
    if traced['coverage']['edgePixels'] != report['field']['count']:
        raise ValueError('Complete field count mismatch')
    return {'format': 'skill-translator.sequence-contour-report/v1', 'edgeReport': report,
            'method': {'name': 'opencv-pixel-contours/v1', 'opencvVersion': cv2.__version__,
                       'retrieval': 'RETR_TREE', 'approximation': 'CHAIN_APPROX_NONE'},
            **traced,
            'boundary': 'Pixel walks may be nested, double-sided, disconnected or omit interior edge pixels. '
                        'The full original edge field is retained separately. Walks are not physical objects, '
                        'semantic curves, contact, persistent identity or task correctness.'}


if __name__ == '__main__':
    try:
        spec = importlib.util.spec_from_file_location('maintained_edge', Path(__file__).with_name('sequence-edge-native.py'))
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        raw = sys.stdin.buffer.read(producer.LIMIT + 1)
        if len(raw) > producer.LIMIT:
            raise ValueError('Native request too large')
        print(json.dumps(inspect(json.loads(raw), producer.inspect)))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
