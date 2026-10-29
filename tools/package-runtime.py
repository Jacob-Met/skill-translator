#!/usr/bin/env python3
"""Prepare a private runnable distribution from an exact Git commit (stdlib only)."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
import zlib
from pathlib import Path, PurePosixPath


def git(repo, *args):
    return subprocess.run(['git', '--no-replace-objects', '-C', str(repo), *args], check=True,
                          stdout=subprocess.PIPE).stdout


def build(repo, commit, output):
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Supply an explicit full lowercase commit SHA.')
    actual = git(repo, 'rev-parse', '--verify', commit + '^{commit}').decode().strip()
    if actual != commit:
        raise ValueError('Source must identify a commit, not an annotated tag.')
    # Read exact committed blobs; archive export-ignore/export-subst must not alter them.
    objects = {}
    seen = {}
    for record in git(repo, 'ls-tree', '-rz', '--full-tree', commit).split(b'\0'):
        if not record:
            continue
        metadata, raw_path = record.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        name = raw_path.decode('utf-8')
        path = PurePosixPath(name)
        if (path.is_absolute() or any(p in ('.', '..') or p.endswith((' ', '.'))
                or re.search(r'[<>:"\\|?*\x00-\x1f]', p)
                or re.fullmatch(r'(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?', p)
                for p in path.parts)):
            raise ValueError('Nonportable committed path: ' + name)
        for i in range(1, len(path.parts) + 1):
            part = '/'.join(path.parts[:i])
            key = part.casefold()
            if key in seen and seen[key] != part:
                raise ValueError('Case-insensitive path collision: ' + name)
            seen[key] = part
        if kind != 'blob' or mode not in ('100644', '100755'):
            raise ValueError('Distribution refuses links/submodules: ' + name)
        objects[name] = oid
    generated = {'launch.mjs', 'start.sh', 'start.cmd', 'START_HERE.txt', 'MANIFEST.json'}
    collisions = {p for p in generated if p.casefold() in seen}
    if collisions:
        raise ValueError('Generated paths collide with source: ' + ', '.join(sorted(collisions)))
    required = {'server.mjs', 'package.json', 'README.md',
                'native/audio-intake.mjs', 'native/calibration-translation.mjs',
                'native/sequence-edge.mjs', 'native/loopback-origin.mjs',
                'requirements-native-edge.txt',
                'tools/audio-input-profile.mjs', 'tools/prepare-audio-activity.mjs',
                'tools/calibration-translation-native.py', 'tools/sequence-edge-native.py',
                'vendor/microverse/fiducials.py',
                'requirements-temporal.txt',
                'tools/temporal-points/restart.mjs',
                'tools/temporal-points/produce.py',
                'tools/temporal-points/validate-input.mjs',
                'tools/temporal-points/vendor/suggest_capture_alignment.py',
                'tools/temporal-points/vendor/prepare_capture_stack.py',
                'tools/temporal-points/vendor/estimate_capture_offsets.py'}
    missing = required - objects.keys()
    if missing:
        raise ValueError('Missing runtime inputs: ' + ', '.join(sorted(missing)))
    # Keep complete runtime/vendor roots and explicit native workflow tools.
    # Their pinned producer dependencies retain the same relative paths.
    # Unselected tools, fixtures, receipt archives and local workspace data are not copied.
    paths = sorted(p for p in objects
                if p in required or p.startswith(('src/', 'web/', 'native/', 'vendor/'))
                or ('/' not in p and p.endswith('.md'))
                or (p.startswith('docs/') and p.count('/') == 1 and p.endswith('.md'))
                or re.fullmatch(r'(?:LICENSE|NOTICE|COPYING)(?:\.[^/]+)?', p, re.I))
    batch = subprocess.run(['git', '--no-replace-objects', '-C', str(repo),
                            'cat-file', '--batch'],
                           input=('\n'.join(objects[p] for p in paths) + '\n').encode(),
                           check=True, stdout=subprocess.PIPE).stdout
    selected = {}
    cursor = 0
    for p in paths:
        end = batch.index(b'\n', cursor)
        oid, kind, size = batch[cursor:end].decode().split()
        if oid != objects[p] or kind != 'blob':
            raise ValueError('Unexpected Git blob response: ' + p)
        cursor = end + 1
        size = int(size)
        selected[p] = batch[cursor:cursor + size]
        cursor += size
        if len(selected[p]) != size or batch[cursor:cursor + 1] != b'\n':
            raise ValueError('Incomplete Git blob response: ' + p)
        cursor += 1
    if cursor != len(batch):
        raise ValueError('Unexpected trailing Git response.')
    server = selected['server.mjs'].decode('utf-8')
    assets = re.findall(r'''["']/[^"']*["']\s*:\s*\[\s*["']([^"']+)["']''', server)
    if not assets:
        raise ValueError('No maintained browser route assets found; review changed server format.')
    if set(assets) - selected.keys():
        raise ValueError('Missing served assets: ' + ', '.join(sorted(set(assets) - selected.keys())))
    selected['launch.mjs'] = b'''import {createAppServer} from './server.mjs';
const major=Number(process.versions.node.split('.')[0]);
if(major<20)throw Error('Node.js 20 or later is required.');
const port=Number(process.env.PORT||8787);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const server=createAppServer();
server.on('error',error=>{console.error('Cannot start Task Space Lab:',error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('Task Space Lab: http://127.0.0.1:'+port+' (Ctrl+C to stop)'));
'''
    selected['start.sh'] = b'#!/bin/sh\ncd -- "$(dirname -- "$0")" || exit 1\nexec node launch.mjs\n'
    selected['start.cmd'] = b'@echo off\r\ncd /d "%~dp0"\r\nnode launch.mjs\r\nif errorlevel 1 pause\r\n'
    selected['START_HERE.txt'] = (f'''SKILL TRANSLATOR — prepared local application
Source commit: {commit}

Extract the entire archive before starting. Install Node.js 20 or later.
Windows: run start.cmd. macOS/Linux: run sh start.sh from a terminal.
All platforms: node launch.mjs from this directory. No npm install is needed.
Open http://127.0.0.1:8787 in a modern browser. Ctrl+C stops the server.
If the port is busy, close the other instance or set PORT to an unused port.

First try the included synthetic bookbinding example: select a mark, change the
target sheet dimensions, place the mark by click or arrow keys, then choose
Evaluate placement. Export its local geometry/attempt receipt for inspection.
That receipt is distinct from saved source annotations; do not import it as source.
The example is authored geometry, not evidence of skill extraction or learning.

The geometry and browser workbenches run locally. Export your work explicitly:
browser session state is not a saved project. Retain original media separately.
Native audio processing additionally needs ffmpeg and ffprobe on PATH.
Native sequence-edge and stationary calibration translation additionally need
Python 3 with the pinned OpenCV/NumPy dependencies in requirements-native-edge.txt.
Use a separate Python environment and set SKILL_EDGE_PYTHON and
SKILL_CALIBRATION_PYTHON to its interpreter path (default: python3 on PATH).
To generate temporal point proposals or run explicit restarts offline, use Python
3.12 with NumPy, Pillow and exactly PyPNG 0.20220715.0. Create a separate Python environment
and install requirements-temporal.txt; these dependencies are not bundled.
Set TEMPORAL_PYTHON to that environment's single Python executable path when
running tools/temporal-points/restart.mjs. The original-query producer is included
at tools/temporal-points/produce.py. See TEMPORAL_POINTS.md and TEMPORAL_RESTART.md
for input preparation, invocation and the original-frame review required afterward.
These optional helpers process supplied inputs locally. Their presence in this
archive does not establish a tested native runtime on your platform.
Node.js and optional native executables are not bundled.
This is a private experimental application, not proof of physical skill or learning.
See README.md for workflows and limits; vendor/ retains upstream notices.
README development/test commands require a source checkout; tests are not bundled.
The release notes identify platforms actually verified for this exact archive.
Supplied Windows/macOS/Linux launch scripts alone do not establish platform testing.
''').encode('utf-8')
    manifest = {'format': 'skill-translator.runtime-package/v1', 'source_commit': commit,
                'builder_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'builder_python': sys.version,
                'builder_zlib': zlib.ZLIB_RUNTIME_VERSION,
                'runtime': 'Node.js >=20 (not bundled)',
                'files': [{'path': p, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
                          for p, b in sorted(selected.items())]}
    selected['MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    output = Path(output)
    if output.exists():
        raise ValueError('Output already exists; choose a new destination.')
    prefix = 'skill-translator-' + commit[:12] + '/'
    with output.open('xb') as stream:
        with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
            for p, body in sorted(selected.items()):
                info = zipfile.ZipInfo(prefix + p, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (0o100755 if p == 'start.sh' else 0o100644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                bundle.writestr(info, body)
    with zipfile.ZipFile(output) as check:
        if check.testzip() is not None or set(check.namelist()) != {prefix + p for p in selected}:
            raise ValueError('Archive verification failed.')
        for p, body in selected.items():
            if check.read(prefix + p) != body:
                raise ValueError('Archive content mismatch: ' + p)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return {'archive': str(output), 'sha256': digest, 'source_commit': commit,
            'file_count': len(selected), 'browser_asset_count': len(set(assets))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.repo, args.commit, args.output), indent=2))
