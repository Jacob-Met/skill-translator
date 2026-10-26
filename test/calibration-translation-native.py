"""Exercise actual pinned native computation and PNG custody, not a stub report."""
import base64, copy, hashlib, importlib.util, json, pathlib, struct, zlib
import cv2
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receiver',root/'tools/calibration-translation-native.py')
receiver=importlib.util.module_from_spec(spec);spec.loader.exec_module(receiver)
rng=np.random.default_rng(3242026)
original=rng.integers(0,256,(144,192,3),dtype=np.uint8)
target=cv2.warpAffine(original,np.float32([[1,0,7],[0,1,-5]]),(192,144),flags=cv2.INTER_NEAREST)
def source(pixels,name):
    ok,data=cv2.imencode('.png',pixels);assert ok
    data=data.tobytes()
    return {'name':name,'sha256':hashlib.sha256(data).hexdigest(),'widthPx':pixels.shape[1],'heightPx':pixels.shape[0],'mimeType':'image/png','pixelCoordinates':'browser-oriented'},base64.b64encode(data).decode()
reference,rb=source(original,'reference.png');image,tb=source(target,'target.png')
q={'reference':reference,'target':image,'referencePngBase64':rb,'targetPngBase64':tb,'rois':[[24,24,24,24],[132,96,24,24]]}
report=receiver.inspect(q)
assert report['registration']['frames'][1]['stage']==[7,-5]
assert report['kernel']['sha256']==hashlib.sha256((root/'vendor/microverse/fiducials.py').read_bytes()).hexdigest()
print('PASS actual opaque color originals, exact translation and pinned kernel')
def rejects(change):
    candidate=copy.deepcopy(q);change(candidate)
    try:receiver.inspect(candidate)
    except (ValueError,KeyError):return
    raise AssertionError('Expected native refusal')
rejects(lambda c:c['target'].update(sha256='0'*64))
rejects(lambda c:c['target'].update(widthPx=191))
rejects(lambda c:c.update(rois=[[24,24,24,24],[25,25,24,24]]))
print('PASS changed original bytes, dimensions, overlapping patches refuse')
alpha=cv2.cvtColor(target,cv2.COLOR_BGR2BGRA);alpha[0,0,3]=0
alphaImage,alphaBytes=source(alpha,'nonopaque.png')
rejects(lambda c:c.update(target=alphaImage,targetPngBase64=alphaBytes))
wideImage,wideBytes=source(target.astype(np.uint16)*256,'16bit.png')
rejects(lambda c:c.update(target=wideImage,targetPngBase64=wideBytes))
print('PASS full-source alpha outside patches and 16-bit samples refuse')
def extra_chunk(kind):
    data=base64.b64decode(tb);payload=b'\0'*8
    chunk=struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload))
    data=data[:33]+chunk+data[33:]
    return base64.b64encode(data).decode(),hashlib.sha256(data).hexdigest()
for kind in [b'eXIf',b'acTL']:
    encoded,digest=extra_chunk(kind)
    rejects(lambda c:(c.update(targetPngBase64=encoded),c['target'].update(sha256=digest)))
print('PASS EXIF and animation refuse before native/browser coordinate disagreement')
for name,pixels in [('out-of-search',cv2.warpAffine(original,np.float32([[1,0,25],[0,1,0]]),(192,144))),('rotation',cv2.warpAffine(original,cv2.getRotationMatrix2D((96,72),8,1),(192,144))),('occluded',target.copy())]:
    if name=='occluded':pixels[19:43,31:55]=rng.integers(0,256,(24,24,3),dtype=np.uint8)
    metadata,encoded=source(pixels,name+'.png');candidate={**q,'target':metadata,'targetPngBase64':encoded}
    result=receiver.inspect(candidate)['registration']['frames'][1]
    assert not result['accepted'] and result['stage'] is None
print('PASS search exhaustion, rotation and single-patch occlusion never fall back to zero')
flat,flatBytes=source(np.zeros_like(original),'flat.png')
rejects(lambda c:c.update(reference=flat,referencePngBase64=flatBytes))
print('PASS textureless reference refused')
fractional=cv2.warpAffine(original,np.float32([[1,0,.25],[0,1,0]]),(192,144))
metadata,encoded=source(fractional,'quarter-pixel.png')
record=receiver.inspect({**q,'target':metadata,'targetPngBase64':encoded})['registration']['frames'][1]
assert record['accepted'] and record['stage']==[0,0]
print('PASS known limit preserved: true quarter-pixel movement accepted as zero')
moving=original.copy()
for x,y,w,h in q['rois']:moving[y:y+h,x+7:x+7+w]=original[y:y+h,x:x+w]
metadata,encoded=source(moving,'moving-references.png')
record=receiver.inspect({**q,'target':metadata,'targetPngBase64':encoded})['registration']['frames'][1]
assert record['accepted'] and record['stage']==[7,0]
print('PASS known limit preserved: two moving patches accepted despite stationary background')
# Materialize only authored controls for the independent actual-browser course.
out=root/'test/calibration-fixtures';out.mkdir(exist_ok=True)
(out/'reference.png').write_bytes(base64.b64decode(rb));(out/'target.png').write_bytes(base64.b64decode(tb))
(out/'native-request.json').write_text(json.dumps(q))
(out/'native-report.json').write_text(json.dumps(report))
print('8 native groups passed')
