#!/usr/bin/env python3
"""Fit declared integer translations from source-bound operator landmarks.

This estimates a coordinate operation, not automatic image correspondence or
physical registration accuracy. Its output is consumed by capture preparation v2.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import sys

FORMAT = 'materialtruth.registration-landmarks/v1'


def fail(message):
    raise ValueError(message)


def exact(value, keys, label):
    if type(value) is not dict or set(value) != set(keys):
        fail(f'{label} requires exactly: {", ".join(keys)}')


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def estimate_translation(reference, observed, tolerance):
    """Integer least-squares fit; hold-out pairs do not choose the offset."""
    if not finite(tolerance) or not 0 < tolerance <= 2:
        fail('Maximum landmark error must be in (0, 2] pixels.')
    if type(reference) is not list or not 4 <= len(reference) <= 64:
        fail('Supply 4..64 reference landmarks, including three fit and one held-out.')
    if type(observed) is not list or len(observed) != len(reference):
        fail('Every reference landmark needs one observed counterpart.')
    refs, points = {}, {}
    for p in reference:
        exact(p, ('id', 'x', 'y', 'role'), 'reference landmark')
        if type(p['id']) is not str or not 1 <= len(p['id']) <= 60 or p['id'] in refs:
            fail('Reference landmark IDs must be unique short strings.')
        if p['role'] not in ('fit', 'held-out') or not all(finite(p[k]) and 0 <= p[k] <= 8192 for k in ('x', 'y')):
            fail('Reference landmarks need finite coordinates and fit/held-out roles.')
        refs[p['id']] = p
    for p in observed:
        exact(p, ('id', 'x', 'y'), 'observed landmark')
        if type(p['id']) is not str or p['id'] not in refs or p['id'] in points or not all(finite(p[k]) and 0 <= p[k] <= 8192 for k in ('x', 'y')):
            fail('Observed landmarks must uniquely bind reference IDs with finite coordinates.')
        points[p['id']] = p
    fitting = [p for p in reference if p['role'] == 'fit']
    validation = [p for p in reference if p['role'] == 'held-out']
    if len(fitting) < 3 or not validation:
        fail('At least three fit landmarks and one held-out landmark are required.')
    # Challenge translation across a spatial region, not one line or one point.
    span = max(max(p[a] for p in fitting)-min(p[a] for p in fitting) for a in ('x','y'))
    area = max(abs((b['x']-a['x'])*(c['y']-a['y'])-(b['y']-a['y'])*(c['x']-a['x']))
               for a in fitting for b in fitting for c in fitting)
    if span < 1 or area <= span*span*1e-6:
        fail('Fit landmarks must span a non-collinear image region.')
    # The per-axis intersection bounds every feasible integer offset. With a
    # two-pixel tolerance there are at most 25 candidates; held-outs do not enter
    # either feasibility or the fit-only squared-error ranking.
    deltas = [(points[p['id']]['x']-p['x'], points[p['id']]['y']-p['y']) for p in fitting]
    bounds = [(math.ceil(max(d[a]-tolerance for d in deltas)),
               math.floor(min(d[a]+tolerance for d in deltas))) for a in (0,1)]
    candidates = []
    for dx in range(bounds[0][0], bounds[0][1]+1):
        for dy in range(bounds[1][0], bounds[1][1]+1):
            errors = [math.hypot(x-dx,y-dy) for x,y in deltas]
            if all(error <= tolerance for error in errors):
                candidates.append((sum(error*error for error in errors),dx,dy))
    if not candidates:
        fail('No integer translation satisfies the supplied fit-landmark error bound.')
    _,dx,dy = min(candidates)
    offset = {'x':dx,'y':dy}
    residuals = [{'id':p['id'], 'role':p['role'],
                  'errorPx':math.hypot(points[p['id']]['x']-p['x']-offset['x'],
                                       points[p['id']]['y']-p['y']-offset['y'])}
                 for p in reference]
    if any(r['errorPx'] > tolerance for r in residuals if r['role']=='held-out'):
        fail('The fit-selected integer translation exceeds the held-out landmark error bound.')
    stats = {}
    for role in ('fit','held-out'):
        errors = [r['errorPx'] for r in residuals if r['role']==role]
        stats[role] = {'points':len(errors), 'rmsErrorPx':math.hypot(*errors)/math.sqrt(len(errors)), 'maximumErrorPx':max(errors)}
    return {'offset':offset, 'selection':'minimum fit squared error among fit-feasible integer translations; ties by x then y', 'statistics':stats, 'residuals':residuals}


def build_configuration(config, evidence, dimensions):
    exact(evidence, ('format','configRawSha256','referenceCaptureId','maximumErrorPx','referenceLandmarks','captures'), 'landmark evidence')
    if evidence['format'] != FORMAT:
        fail('Unsupported landmark evidence format.')
    if config['format'] != 'materialtruth.capture-preparation/v1':
        fail('Start from a v1 preparation configuration; existing offsets are never silently refitted.')
    reference_id = evidence['referenceCaptureId']
    source_map = {s['captureId']:s for s in config['sources']}
    if type(reference_id) is not str or reference_id not in source_map:
        fail('The reference must identify a configured source.')
    if type(evidence['captures']) is not list or len(evidence['captures']) != len(source_map)-1:
        fail('Supply correspondences for every non-reference capture exactly once.')
    def bounded(points, capture_id):
        w,h = dimensions[capture_id]
        if type(points) is not list or not 4 <= len(points) <= 64:
            fail('Landmarks must be a bounded list.')
        for point in points:
            if type(point) is not dict:
                fail('Landmarks must be plain coordinate records.')
            if not all(finite(point.get(k)) for k in ('x','y')) or not 0 <= point['x'] < w or not 0 <= point['y'] < h:
                fail('Landmark coordinates must lie inside their exact decoded source images.')
    bounded(evidence['referenceLandmarks'], reference_id)
    results, seen = {}, set()
    for capture in evidence['captures']:
        exact(capture, ('captureId','landmarks'), 'capture landmarks')
        cid = capture['captureId']
        if type(cid) is not str or cid == reference_id or cid not in source_map or cid in seen:
            fail('Capture landmark IDs must uniquely bind non-reference sources.')
        seen.add(cid)
        bounded(capture['landmarks'], cid)
        results[cid] = estimate_translation(evidence['referenceLandmarks'],capture['landmarks'],evidence['maximumErrorPx'])
    out = copy.deepcopy(config)
    out['format'] = 'materialtruth.capture-preparation/v2'
    out['spatial']['referenceCaptureId'] = reference_id
    for source in out['sources']:
        source['offset'] = {'x':0,'y':0} if source['captureId']==reference_id else results[source['captureId']]['offset']
    return out, results


def main(argv=None):
    # Reuse strict JSON admission, byte custody, and native decoders from the
    # maintained adapter; no new image processing or solver is introduced.
    import prepare_capture_stack as adapter
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config',type=Path)
    parser.add_argument('landmarks',type=Path)
    parser.add_argument('--output',type=Path,required=True,help='New v2 config beside the original config; never overwrite.')
    args=parser.parse_args(argv)
    try:
        config_path=args.config.resolve();output=args.output.absolute()
        if output.parent.resolve()!=config_path.parent:
            fail('Output configuration must be beside the input so source-relative paths remain valid.')
        raw=adapter.read_bounded(config_path,adapter.MAX_CONFIG_BYTES,'configuration')
        config=adapter.parse_configuration(raw)
        raw_evidence=adapter.read_bounded(args.landmarks,128*1024,'landmarks')
        def pairs(items):
            result={}
            for k,v in items:
                if k in result:fail('Duplicate landmark JSON field.')
                result[k]=v
            return result
        evidence=json.loads(raw_evidence.decode('utf8'),object_pairs_hook=pairs,parse_constant=lambda _:fail('Nonfinite landmark number.'))
        if type(evidence) is not dict:fail('Landmark evidence must be a JSON object.')
        if evidence.get('configRawSha256')!=hashlib.sha256(raw).hexdigest():
            fail('Landmarks do not bind the exact input configuration bytes.')
        dimensions={}
        for source in config['sources']:
            path=(config_path.parent/source['file']).resolve()
            if not path.is_relative_to(config_path.parent):fail('Source path escapes configuration directory.')
            data=adapter.read_bounded(path,adapter.MAX_SOURCE_BYTES,'source image')
            if hashlib.sha256(data).hexdigest()!=source['sha256']:fail('Source image bytes no longer match configuration.')
            if path.suffix.lower()=='.png':_,meta=adapter.decode_png(data)
            elif path.suffix.lower() in ('.tif','.tiff'):_,meta=adapter.decode_tiff(data)
            else:fail('Only declared PNG/TIFF sources are supported.')
            dimensions[source['captureId']]=(meta['width'],meta['height'])
        out,results=build_configuration(config,evidence,dimensions)
        receipt={'format':'materialtruth.landmark-offset-estimate/v1','baseConfigSha256':hashlib.sha256(raw).hexdigest(),
                 'landmarksSha256':hashlib.sha256(raw_evidence).hexdigest(),'maximumErrorPx':evidence['maximumErrorPx'],
                 'referenceCaptureId':evidence['referenceCaptureId'],'captures':results,
                 'boundary':'Operator-supplied correspondences; fit/held-out labels do not prove independent measurement. No automatic correspondence, physical registration accuracy or defect claim.'}
        receipt_bytes=adapter.json_bytes(receipt)
        out['manifest']['notes'] += ' Landmark offset receipt SHA-256: '+hashlib.sha256(receipt_bytes).hexdigest()+'.'
        encoded=adapter.json_bytes(out)
        adapter.parse_configuration(encoded)
        with output.open('xb') as stream:stream.write(encoded)
        print(json.dumps({'output':str(output),'outputConfigSha256':hashlib.sha256(encoded).hexdigest(),'receiptSha256':hashlib.sha256(receipt_bytes).hexdigest(),'receipt':receipt},allow_nan=False))
        return 0
    except (ValueError,OSError,KeyError,TypeError) as error:
        print(str(error),file=sys.stderr);return 2

if __name__=='__main__':
    raise SystemExit(main())
