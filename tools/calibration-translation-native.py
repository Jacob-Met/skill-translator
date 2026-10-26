#!/usr/bin/env python3
"""Original PNG custody and unchanged pinned stationary-translation kernel."""
import base64, hashlib, importlib.util, json, pathlib, struct, sys
import cv2
import numpy as np

KERNEL = {'repository':'Jacob-Met/microverse','commit':'b762d8c26db6b314c612cbb53a14e7cb165a7c3f','path':'calibration/fiducials.py','sha256':'b7c8728e5fefafb7e10ebe4e05e2c65dbce299b01d2f7234517e5e3f4f750743'}
path = pathlib.Path(__file__).resolve().parents[1] / 'vendor/microverse/fiducials.py'
if hashlib.sha256(path.read_bytes()).hexdigest() != KERNEL['sha256']:
    raise RuntimeError('Pinned stationary-reference kernel bytes changed')
spec = importlib.util.spec_from_file_location('pinned_fiducials', path)
kernel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kernel)
cv2.setNumThreads(1)

def decode(encoded, image):
    if not isinstance(encoded,str) or len(encoded)>17*1024*1024:raise ValueError('Original PNG exceeds transfer capacity')
    data=base64.b64decode(encoded,validate=True)
    if not 24<=len(data)<=12*1024*1024 or data[:8]!=b'\x89PNG\r\n\x1a\n' or data[12:16]!=b'IHDR':raise ValueError('Original PNG required')
    w,h=struct.unpack('>II',data[16:24])
    if image.get('mimeType')!='image/png' or image.get('pixelCoordinates')!='browser-oriented' or (w,h)!=(image['widthPx'],image['heightPx']) or min(w,h)<16 or max(w,h)>8192 or w*h>16000000:raise ValueError('Original PNG dimensions or orientation contract mismatch')
    if hashlib.sha256(data).hexdigest()!=image['sha256']:raise ValueError('Original PNG hash mismatch')
    # PNG EXIF can change browser orientation. Reject it before decoding rather
    # than compare browser-oriented corners against unrotated native samples.
    at=8
    while at<len(data):
        if at+12>len(data):raise ValueError('Truncated PNG chunk')
        length=struct.unpack('>I',data[at:at+4])[0]
        kind=data[at+4:at+8]
        if at+12+length>len(data):raise ValueError('Truncated PNG chunk')
        if kind in (b'eXIf',b'acTL'):raise ValueError('EXIF-oriented or animated PNG needs an explicit source interpretation')
        at+=12+length
        if kind==b'IEND':break
    pixels=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_UNCHANGED)
    if pixels is None or pixels.dtype!=np.uint8 or pixels.shape[:2]!=(h,w):raise ValueError('Original 8-bit PNG decode mismatch')
    if pixels.ndim==2:return pixels
    if pixels.ndim!=3 or pixels.shape[2] not in (3,4):raise ValueError('Unsupported PNG channels')
    if pixels.shape[2]==4 and np.any(pixels[:,:,3]!=255):raise ValueError('Nonopaque PNG requires explicit compositing; hidden RGB is not visible evidence')
    return cv2.cvtColor(pixels,cv2.COLOR_BGR2GRAY)

def inspect(q):
    reference=decode(q['referencePngBase64'],q['reference'])
    target=decode(q['targetPngBase64'],q['target'])
    registration=kernel.register([reference,target],q['rois'])
    return {'format':'skill-translator.calibration-translation/v1','kernel':KERNEL,
      'reference':q['reference'],'target':q['target'],'registration':registration,
      'decode':'Original full-size uint8 opaque PNG; grayscale unchanged or OpenCV BGR-to-gray; no resize, crop or orientation transform.'}

if __name__=='__main__':
    try:
        data=sys.stdin.buffer.read(35*1024*1024+1)
        if len(data)>35*1024*1024:raise ValueError('Native request exceeds capacity')
        print(json.dumps(inspect(json.loads(data)),allow_nan=False))
    except Exception as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
