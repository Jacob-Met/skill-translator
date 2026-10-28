#!/usr/bin/env python3
"""Bounded source-bound patch suggestions; explicit acceptance feeds landmark estimation."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import prepare_capture_stack as adapter
import estimate_capture_offsets as estimator

FORMAT = 'materialtruth.alignment-suggestions/v1'
QUERY = 'materialtruth.alignment-query/v1'
MIN_SCORE = .8
MIN_MARGIN = .08


def require(condition, message):
    if not condition:
        raise ValueError(message)


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'Duplicate JSON field.')
            result[key] = value
        return result
    return json.loads(raw.decode('utf8'), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON value.')))


def features(image):
    require(image.ndim == 2 and min(image.shape) >= 3, 'A two-dimensional grayscale image is required.')
    values = image.astype(np.float64)
    gradient = np.zeros_like(values)
    gradient[1:-1, 1:-1] = np.hypot((values[1:-1, 2:] - values[1:-1, :-2])/2,
                                   (values[2:, 1:-1] - values[:-2, 1:-1])/2)
    return {'intensity': values, 'gradient': gradient}


def match_patch(reference, source, x, y, patch_radius, search_radius):
    """All shifts use an identical reference window; no wrapping or filled samples."""
    r, s = patch_radius, search_radius
    for array in (reference, source):
        require(x-r-s-1 >= 0 and y-r-s-1 >= 0 and x+r+s+1 < array.shape[1]
                and y+r+s+1 < array.shape[0], 'Landmark search reaches an image boundary.')
    patch = reference[y-r:y+r+1, x-r:x+r+1].ravel()
    centered = patch-patch.mean()
    norm = np.linalg.norm(centered)
    if norm <= 1e-10:
        return {'status': 'flat-reference', 'candidates': []}
    candidates = []
    for dy in range(-s, s+1):
        for dx in range(-s, s+1):
            other = source[y+dy-r:y+dy+r+1, x+dx-r:x+dx+r+1].ravel()
            other = other-other.mean()
            denominator = norm*np.linalg.norm(other)
            if denominator > 1e-10:
                score = float(np.clip(np.dot(centered, other)/denominator, -1, 1))
                candidates.append({'dx': dx, 'dy': dy, 'score': score})
    if len(candidates) < 2:
        return {'status': 'insufficient-texture', 'candidates': candidates}
    candidates.sort(key=lambda c: (-c['score'], c['dx'], c['dy']))
    best, runner = candidates[:2]
    margin = best['score']-runner['score']
    status = ('search-boundary' if max(abs(best['dx']), abs(best['dy'])) == s else
              'low-score' if best['score'] < MIN_SCORE else
              'ambiguous' if margin < MIN_MARGIN else 'suggested')
    return {'status': status, 'margin': margin, 'candidates': candidates[:3]}


def suggest(config_path, query):
    config_path = Path(config_path).resolve()
    raw = adapter.read_bounded(config_path, adapter.MAX_CONFIG_BYTES, 'configuration')
    config = adapter.parse_configuration(raw)
    require(config['format'] == adapter.FORMAT, 'Suggestions require an unregistered v1 configuration.')
    estimator.exact(query, ('format', 'configRawSha256', 'referenceCaptureId', 'referenceLandmarks',
                           'patchRadius', 'searchRadius', 'maximumErrorPx'), 'alignment query')
    require(query['format'] == QUERY and query['configRawSha256'] == hashlib.sha256(raw).hexdigest(),
            'Query must bind the exact v1 configuration bytes.')
    for key, low, high in [('patchRadius', 2, 8), ('searchRadius', 1, 6)]:
        require(type(query[key]) is int and low <= query[key] <= high, f'{key} outside bounded range.')
    points = query['referenceLandmarks']
    require(type(points) is list and 4 <= len(points) <= 16, 'Supply 4–16 predeclared landmarks.')
    require(2 <= len(config['sources']) <= 16, 'Support 2–16 source captures.')
    estimator.estimate_translation(points, [{k: p[k] for k in ('id', 'x', 'y')} for p in points], query['maximumErrorPx'])
    reach = query['patchRadius']+query['searchRadius']+1
    for i, point in enumerate(points):
        require(type(point['x']) is int and type(point['y']) is int, 'Reference points must be whole pixels.')
        for other in points[:i]:
            require(max(abs(point['x']-other['x']), abs(point['y']-other['y'])) > 2*reach,
                    'Landmark search supports must not overlap, including held-out supports.')
    images = {}
    hashes = {}
    for source in config['sources']:
        path = (config_path.parent/source['file']).resolve()
        require(path.is_relative_to(config_path.parent), 'Source escapes configuration directory.')
        data = adapter.read_bounded(path, adapter.MAX_SOURCE_BYTES, 'source image')
        require(hashlib.sha256(data).hexdigest() == source['sha256'], 'Source bytes no longer match configuration.')
        if path.suffix.lower() == '.png':
            pixels, meta = adapter.decode_png(data)
        elif path.suffix.lower() in ('.tif', '.tiff'):
            pixels, meta = adapter.decode_tiff(data)
        else:
            raise ValueError('Only PNG/TIFF sources are supported.')
        require(meta['channels'] == 1, 'Suggestions currently require native grayscale sources; no hidden RGB conversion.')
        require(meta['width']*meta['height'] <= 1_000_000, 'Suggestion sources are limited to one million pixels.')
        images[source['captureId']] = pixels[:, :, 0]
        hashes[source['captureId']] = source['sha256']
    reference_id = query['referenceCaptureId']
    require(type(reference_id) is str and reference_id in images, 'Unknown reference capture.')
    reference = features(images[reference_id])
    captures = []
    for cid, image in images.items():
        if cid == reference_id:
            continue
        source = features(image)
        matches = []
        for point in points:
            methods = {name: match_patch(reference[name], source[name], point['x'], point['y'],
                                         query['patchRadius'], query['searchRadius']) for name in reference}
            matches.append({'id': point['id'], 'role': point['role'], 'methods': methods})
        captures.append({'captureId': cid, 'matches': matches})
    return {'format': FORMAT, 'query': query, 'sourceSha256': hashes, 'captures': captures,
            'selection': 'gradient only; intensity is a diagnostic comparison, never a held-out-selected fallback',
            'thresholds': {'minimumScore': MIN_SCORE, 'minimumMargin': MIN_MARGIN},
            'boundary': 'Image similarity suggestions, not verified physical correspondences. Explicit operator acceptance required. Changed illumination, repeating texture and deformation may still mislead.'}


def accepted_evidence(report):
    query = report['query']
    points = {p['id']: p for p in query['referenceLandmarks']}
    captures = []
    for capture in report['captures']:
        landmarks = []
        for match in capture['matches']:
            result = match['methods']['gradient']
            require(result['status'] == 'suggested', 'Unresolved gradient match; collect or correct operator evidence instead.')
            p, offset = points[match['id']], result['candidates'][0]
            landmarks.append({'id': p['id'], 'x': p['x']+offset['dx'], 'y': p['y']+offset['dy']})
        # Maintained estimator chooses from fits alone, then challenges on held-outs.
        estimator.estimate_translation(query['referenceLandmarks'], landmarks, query['maximumErrorPx'])
        captures.append({'captureId': capture['captureId'], 'landmarks': landmarks})
    return {'format': estimator.FORMAT, 'configRawSha256': query['configRawSha256'],
            'referenceCaptureId': query['referenceCaptureId'], 'maximumErrorPx': query['maximumErrorPx'],
            'referenceLandmarks': query['referenceLandmarks'], 'captures': captures}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['suggest', 'accept'])
    parser.add_argument('config', type=Path)
    parser.add_argument('input', type=Path, help='Predeclared query, or suggestion report for acceptance.')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--accept-sha256', help='Explicit acceptance of the exact suggestion report bytes.')
    args = parser.parse_args(argv)
    try:
        raw = adapter.read_bounded(args.input, 1_000_000, 'alignment input')
        data = strict_json(raw)
        require(type(data) is dict, 'Alignment input must be a JSON object.')
        if args.action == 'suggest':
            require(args.accept_sha256 is None, 'Acceptance belongs to the accept action.')
            result = suggest(args.config, data)
        else:
            require(args.accept_sha256 == hashlib.sha256(raw).hexdigest(), 'Explicit exact report SHA-256 acceptance is required.')
            require(data.get('format') == FORMAT, 'Unsupported suggestion report.')
            recomputed = suggest(args.config, data['query'])
            require(data == recomputed, 'Suggestion report does not match current source recomputation.')
            result = accepted_evidence(recomputed)
        encoded = adapter.json_bytes(result)
        with args.output.open('xb') as stream:
            stream.write(encoded)
        print(json.dumps({'output': str(args.output), 'sha256': hashlib.sha256(encoded).hexdigest(),
                          'acceptedSuggestionSha256': args.accept_sha256}))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
