import base64,copy,hashlib,io,json,math,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sequence=json.loads((ROOT/'test/fixtures/point-choice-sequence.json').read_text());rng=np.random.default_rng(20261027);w=sequence['moments'][0]['image']['widthPx'];h=sequence['moments'][0]['image']['heightPx'];background=rng.integers(20,65,(h,w),dtype=np.uint8);patch=rng.integers(30,230,(19,19),dtype=np.uint8);points=[(100,100),(103,98),(106,101),(109,104)]
def encode(raster):
 out=io.BytesIO();Image.fromarray(raster).save(out,format='PNG');return out.getvalue()
def image_at(x,y):
 raster=background.copy();raster[y-9:y+10,x-9:x+10]=patch;return encode(raster)
def bind(v,i,raw):
 digest=hashlib.sha256(raw).hexdigest();m=v['sourceBundle']['sequence']['moments'][i];m['image']['sha256']=digest;m['origin']['frameSha256']=digest;m['calibratedTask']['source']['image']['sha256']=digest;m['calibratedTask']['source']['origin']['frameSha256']=digest;v['sourceBundle']['frames'][i]['pngBase64']=base64.b64encode(raw).decode()
request={'format':'skill-translator.temporal-point-input/v1','sourceBundle':{'format':'skill-translator.sequence-bundle/v1','sequence':sequence,'frames':[{'momentId':m['id'],'pngBase64':''}for m in sequence['moments']]},'query':{'momentIds':[m['id']for m in sequence['moments']],'anchor':{'momentId':sequence['moments'][0]['id'],'sourcePx':{'x':100.25,'y':100.75},'patchCenterIndex':{'x':100,'y':100}}}}
for i,p in enumerate(points):bind(request,i,image_at(*p))
results=[]
with tempfile.TemporaryDirectory(prefix='temporal-cli-')as temp:
 folder=Path(temp)
 def run(name,value):
  src=folder/(name+'.json');out=folder/(name+'.out.json');data=json.dumps(value,separators=(',',':')).encode();src.write_bytes(data);r=subprocess.run([sys.executable,str(ROOT/'tools/temporal-points/produce.py'),str(src),str(out),'--profile','grayscale-probe'],capture_output=True,text=True,timeout=60);assert src.read_bytes()==data;return r,out,src
 r,out,src=run('translated',request);assert r.returncode==0,r.stderr;report=json.loads(out.read_text());assert report['sourceBundle']==request['sourceBundle'];assert [r['sourcePx']for r in report['rows']]==[{'x':x+.25,'y':y+.75}for x,y in points];results.append('original-four-point-translations');(ROOT/'test/fixtures/temporal-original-input.json').write_bytes(src.read_bytes());(ROOT/'test/fixtures/temporal-native-report.json').write_bytes(out.read_bytes())
 r=subprocess.run(['node','--input-type=module','-e',"import fs from 'node:fs';import {receiveTemporalProposal} from './src/temporal-point-proposals.mjs';receiveTemporalProposal(JSON.parse(fs.readFileSync('test/fixtures/temporal-native-report.json')));"],cwd=ROOT,capture_output=True,text=True);assert r.returncode==0,r.stderr;results.append('actual-native-report-consumer-admission')
 for name,edit in [('missing-png',lambda v:v['sourceBundle']['frames'].pop()),('changed-original',lambda v:v['sourceBundle']['frames'][0].update(pngBase64=v['sourceBundle']['frames'][1]['pngBase64'])),('wrong-containing-pixel',lambda v:v['query']['anchor']['patchCenterIndex'].update(x=99)),('reverse-time',lambda v:v['query']['momentIds'].reverse())]:
  v=copy.deepcopy(request);edit(v);r,out,_=run(name,v);assert r.returncode!=0 and not out.exists();results.append(name)
 v=copy.deepcopy(request);p=math.nextafter(100.,101.);v['query']['anchor']['sourcePx']={'x':p,'y':p}
 for i in range(4):bind(v,i,image_at(100,100))
 r,out,_=run('stationary',v);assert r.returncode==0,r.stderr;assert all(r['sourcePx']=={'x':p,'y':p}for r in json.loads(out.read_text())['rows']);results.append('nextafter-zero-displacement-exact')
 v=copy.deepcopy(request);v['query']['momentIds']=v['query']['momentIds'][:2];a=background.copy();a[91:110,111:130]=patch;a[91:110,93:112]=patch;bind(v,1,encode(a));r,out,_=run('distractor',v);assert r.returncode==0,r.stderr;row=json.loads(out.read_text())['rows'][1];assert row['sourcePx']=={'x':102.25,'y':100.75} and row['cycleResidualPixels']==0;results.append('wrong-identical-distractor-retained-not-identity')
 v=copy.deepcopy(request)
 for i in range(4):bind(v,i,encode(np.full((h,w),100,dtype=np.uint8)))
 r,out,src=run('flat',v);assert r.returncode==0,r.stderr;rows=json.loads(out.read_text())['rows'];assert rows[1]['status']=='flat-reference' and all(r['status']=='unresolved-predecessor' for r in rows[2:]);results.append('unresolved-chain-stops');old=out.read_bytes();r=subprocess.run([sys.executable,str(ROOT/'tools/temporal-points/produce.py'),str(src),str(out),'--profile','grayscale-probe'],capture_output=True);assert r.returncode!=0 and out.read_bytes()==old;results.append('existing-output-preserved')
receipt={'passed':True,'groups':len(results),'coverage':results,'scope':'Restored candidate actual original grayscale PNG course; authored raster translation only, not physical identity or real-video qualification'};(ROOT/'temporal-cli-receiving.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
