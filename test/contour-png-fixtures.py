"""Authored metadata-admission controls; not a physical demonstration report."""
import base64,copy,hashlib,importlib.util,json,os,pathlib,struct,zlib
root=pathlib.Path(__file__).parents[1]
spec=importlib.util.spec_from_file_location('contours',root/'tools/sequence-contours-native.py');native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)
spec=importlib.util.spec_from_file_location('edge',root/'tools/sequence-edge-native.py');edge=importlib.util.module_from_spec(spec);spec.loader.exec_module(edge)
out=pathlib.Path(os.environ['ROI_COORDINATE_TEST_OUTPUT']);out.mkdir(parents=True,exist_ok=False)
source=json.loads((root/'test/fixtures/repeated-cue-study.json').read_text())['comparison']['sources'][0]
moment=source['sequence']['moments'][0];frame=source['frames'][0]
request={'representation':'complete-field','roi':[0,0,moment['image']['widthPx'],moment['image']['heightPx']],'momentId':moment['id'],'image':moment['image'],'origin':moment['origin'],'pngBase64':frame['pngBase64']}
report=native.inspect(request,edge.inspect)
for name,value in [('plain-source',source),('plain-report',report)]: (out/(name+'.json')).write_text(json.dumps(value))
data=base64.b64decode(frame['pngBase64']);payload=b'II'+struct.pack('<HIH',42,8,1)+struct.pack('<HHI',0x112,3,1)+struct.pack('<H',3)+b'\0\0'+struct.pack('<I',0);kind=b'eXIf';chunk=struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff);changed=data[:33]+chunk+data[33:]
oriented=copy.deepcopy(source);m=oriented['sequence']['moments'][0];m['image']['sha256']=hashlib.sha256(changed).hexdigest();m['origin']['frameSha256']=m['image']['sha256'];oriented['frames'][0]['pngBase64']=base64.b64encode(changed).decode()
try: native.inspect({**request,'image':m['image'],'origin':m['origin'],'pngBase64':oriented['frames'][0]['pngBase64']},edge.inspect)
except ValueError as error: assert 'explicit source interpretation'in str(error)
else: raise AssertionError('metadata must refuse natively')
# Deliberately constructed old-style input tests consumer refusal; not native output.
legacy=copy.deepcopy(report);legacy['edgeReport'].update(image=m['image'],origin=m['origin'])
own={'format':'skill-translator.sequence-contour-study/v1','source':oriented,'report':legacy}
for name,value in [('oriented-source',oriented),('oriented-report-control',legacy),('oriented-own-control',own)]: (out/(name+'.json')).write_text(json.dumps(value))
(out/'FIXTURE_RECEIPT.json').write_text(json.dumps({'scope':'Authored metadata refusal controls; oriented report is deliberately constructed, not native output','plainNativeVersion':native.cv2.__version__,'originalPNG':moment['image']['sha256'],'orientedPNG':m['image']['sha256']},indent=2))
