"""Explicit reconstructed temporal consumer of unchanged maintained local matcher."""
import argparse,base64,hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'vendor'))
PINS={'suggest_capture_alignment.py':'c9cc6a0d8016e37a83e92d0224cbdd3304f779b8','prepare_capture_stack.py':'69ce1b5e98e86553352ad0b21884c618912a36ad','estimate_capture_offsets.py':'f81eb5ea574ca7201e4de2196d2208eb03096cae'}
def identity():
 result={}
 for name,pin in PINS.items():
  b=(ROOT/'vendor'/name).read_bytes();actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
  if actual!=pin:raise ValueError('Maintained source differs: '+name)
  result[name]={'gitBlob':actual,'sha256':hashlib.sha256(b).hexdigest()}
 for name in ['produce.py','validate-input.mjs']:result[name]={'sha256':hashlib.sha256((ROOT/name).read_bytes()).hexdigest()}
 return result

def bounded(path):
 with path.open('rb')as stream:data=stream.read(48*1024*1024+1)
 if len(data)>48*1024*1024:raise ValueError('Input exceeds48MiB')
 return data

def produce(path):
 pins=identity()
 import png
 if png.__version__!='0.20220715.0':raise ImportError('Exact PyPNG0.20220715.0 required')
 import suggest_capture_alignment as owner
 import prepare_capture_stack as decoder
 original=bounded(path);raw=owner.strict_json(original)
 with tempfile.TemporaryDirectory(prefix='temporal-original-')as temp:
  captured=Path(temp)/'input.json';captured.write_bytes(original);subprocess.run(['node',str(ROOT/'validate-input.mjs'),str(captured)],capture_output=True,check=True,timeout=20)
 bundle=raw['sourceBundle'];moments={m['id']:m for m in bundle['sequence']['moments']};frames={f['momentId']:f['pngBase64']for f in bundle['frames']};anchor=raw['query']['anchor'];index=anchor['patchCenterIndex'];position=(index['x'],index['y']);rows=[];previous=None;shape=None
 def match(a,b,p):
  try:return owner.match_patch(a,b,*p,4,6)
  except ValueError as error:return {'status':'source-window-unavailable','candidates':[],'reason':str(error)}
 for i,id in enumerate(raw['query']['momentIds']):
  m=moments[id];pixels,meta=decoder.decode_png(base64.b64decode(frames[id],validate=True))
  if meta['bitDepth']!=8 or meta['channels']!=1:raise ValueError('Explicit grayscale profile requires original grayscale8 PNG')
  image=pixels[:,:,0]
  if image.shape!=(m['image']['heightPx'],m['image']['widthPx'])or(shape is not None and image.shape!=shape):raise ValueError('Original raster geometry differs')
  shape=image.shape;signal=owner.features(image)['gradient'];row={'momentId':id,'presentedSeconds':m['origin']['mediaTimeSeconds'],'image':m['image'],'origin':m['origin'],'sourcePx':None}
  if i==0:row.update(status='authored-anchor',sourcePx=anchor['sourcePx'],patchCenterIndex=index)
  elif position is None:row['status']='unresolved-predecessor'
  else:
   forward=match(previous,signal,position);row.update(status=forward['status'],forward=forward)
   if forward['status']=='suggested':
    f=forward['candidates'][0];q=(position[0]+f['dx'],position[1]+f['dy']);reverse=match(signal,previous,q);row['reverse']=reverse
    if reverse['status']=='suggested':
     r=reverse['candidates'][0];back=(q[0]+r['dx'],q[1]+r['dy']);row['cycleResidualPixels']=((back[0]-position[0])**2+(back[1]-position[1])**2)**.5
     if back==position:row.update(status='suggested',sourcePx={'x':anchor['sourcePx']['x']+(q[0]-index['x']),'y':anchor['sourcePx']['y']+(q[1]-index['y'])},patchCenterIndex={'x':q[0],'y':q[1]})
     else:row['status']='cycle-disagreement'
    else:row['status']='reverse-'+reverse['status']
  rows.append(row);previous=signal;position=None if row['sourcePx']is None else(row['patchCenterIndex']['x'],row['patchCenterIndex']['y'])
 report={'format':'skill-translator.temporal-point-proposals/v1','sourceBundle':bundle,'query':raw['query'],'inputSha256':hashlib.sha256(original).hexdigest(),'producer':pins,'settings':{'decodeProfile':'grayscale-probe','feature':'gradient','patchRadius':4,'searchRadius':6,'minScore':owner.MIN_SCORE,'minMargin':owner.MIN_MARGIN,'cycleResidualPixels':0},'rows':rows,'boundary':'Supplied local appearance only; repeated distractors can pass reverse cycling. Review every original. No identity, calibration, interpolation or physical motion guarantee.'}
 if pins!=identity()or bounded(path)!=original:raise ValueError('Original input or producer changed')
 result=(json.dumps(report,allow_nan=False,separators=(',',':'))+'\n').encode()
 if len(result)>48*1024*1024:raise ValueError('Report exceeds48MiB')
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('input',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--profile',choices=['grayscale-probe'],required=True);a=parser.parse_args()
 try:
  if a.output.exists()or a.output.is_symlink():raise ValueError('Fresh output required')
  result=produce(a.input);temporary=None
  try:
   with tempfile.NamedTemporaryFile(dir=a.output.parent,delete=False)as f:temporary=Path(f.name);f.write(result);f.flush();os.fsync(f.fileno())
   os.link(temporary,a.output)
  finally:
   if temporary is not None:temporary.unlink(missing_ok=True)
  print(json.dumps({'bytes':len(result)}))
 except (ValueError,OSError,ImportError,subprocess.SubprocessError)as error:print('Temporal proposal refused: '+str(error),file=sys.stderr);sys.exit(1)
