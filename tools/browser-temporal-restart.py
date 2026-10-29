"""Standard-library CDP receiving; separate nonroot Chrome, no sandbox bypass."""
import os,json,socket,base64,struct,hashlib,urllib.request,urllib.parse,threading,http.server,time,pathlib,sys
ROOT=pathlib.Path(os.environ['APP_ROOT']);OUT=pathlib.Path(os.environ['QA_DIR']);OUT.mkdir(parents=True,exist_ok=True)
class CDP:
 def __init__(self,url):
  u=urllib.parse.urlsplit(url);self.s=socket.create_connection((u.hostname,u.port),10);self.s.settimeout(20);key=base64.b64encode(os.urandom(16)).decode();self.s.sendall(f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode());header=b''
  while not header.endswith(b'\r\n\r\n'):header+=self.s.recv(1)
  assert header.split(b'\r\n')[0].split()[1]==b'101',header;assert base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()) in header
  self.id=0;self.exceptions=[]
 def read(self,n):
  b=b''
  while len(b)<n:
   x=self.s.recv(n-len(b))
   if not x:raise EOFError()
   b+=x
  return b
 def call(self,method,params=None):
  self.id+=1;b=json.dumps({'id':self.id,'method':method,'params':params or {}}).encode();n=len(b);mask=os.urandom(4);head=bytes([0x81,0x80|(n if n<126 else 126 if n<65536 else 127)])
  if n>=126:head+=struct.pack('!H' if n<65536 else '!Q',n)
  self.s.sendall(head+mask+bytes(v^mask[i%4] for i,v in enumerate(b)));chunks=b''
  while True:
   a,z=self.read(2);n=z&127
   if n==126:n=struct.unpack('!H',self.read(2))[0]
   elif n==127:n=struct.unpack('!Q',self.read(8))[0]
   assert not z&128
   data=self.read(n)
   if a&15==8:raise EOFError()
   if a&15 in (0,1):chunks+=data
   if not a&128:continue
   if a&15 not in (0,1):continue
   r=json.loads(chunks);chunks=b''
   if r.get('method')=='Runtime.exceptionThrown':self.exceptions.append(r['params'])
   if r.get('id')==self.id:
    if 'error'in r:raise RuntimeError(r['error'])
    return r['result']
 def evaluate(self,expr):
  r=self.call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':True});assert 'exceptionDetails'not in r,r;return r['result'].get('value')
def wait(fn):
 end=time.time()+20
 while time.time()<end:
  if fn():return
  time.sleep(.05)
 raise TimeoutError()
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path=='/sampled-path':self.path='/web/sampled-path.html'
  return super().do_GET()
 def guess_type(self,path):return 'text/javascript' if path.endswith('.mjs') else super().guess_type(path)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();targets=json.load(urllib.request.urlopen('http://127.0.0.1:9227/json/list'));c=CDP(next(t['webSocketDebuggerUrl']for t in targets if t['type']=='page'));checks=[]
try:
 c.call('Page.enable');c.call('Runtime.enable');c.call('DOM.enable');c.call('Page.navigate',{'url':'chrome://sandbox'});wait(lambda:'adequately sandboxed'in(c.evaluate('document.body?.innerText')or''));sandbox=c.evaluate('document.body.innerText');assert 'You are adequately sandboxed.'in sandbox and 'NOT adequately sandboxed'not in sandbox
 for label in ['PID namespaces','Network namespaces','Seccomp-BPF sandbox']:assert any(line.startswith(label+'\t')and line.endswith('Yes')for line in sandbox.splitlines()),sandbox
 checks.append('strict sandbox');c.call('Page.addScriptToEvaluateOnNewDocument',{'source':"window.receivedDownloads=[];window.originalBlobs=new Map();const make=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{const u=make(b);originalBlobs.set(u,b);return u};HTMLAnchorElement.prototype.click=function(){const b=originalBlobs.get(this.href);if(b)b.text().then(text=>receivedDownloads.push({name:this.download,text}));};"})
 c.call('Page.navigate',{'url':f'http://127.0.0.1:{server.server_port}/sampled-path'});wait(lambda:c.evaluate("!!document.getElementById('temporal-input')"))
 def upload():
  root=c.call('DOM.getDocument')['root']['nodeId'];node=c.call('DOM.querySelector',{'nodeId':root,'selector':'#temporal-input'})['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(ROOT/'test/fixtures/temporal-native-report.json')]});wait(lambda:c.evaluate("document.querySelectorAll('[data-temporal-moment]').length===4"))
 def setvalue(selector,value):c.evaluate(f"(()=>{{const e=document.querySelector({json.dumps(selector)});e.value={json.dumps(value)};e.dispatchEvent(new Event('input',{{bubbles:true}}));}})()")
 def clicktext(text):c.evaluate(f"[...document.querySelectorAll('button')].find(e=>e.textContent==={json.dumps(text)}).click()")

 def uploadfile(path,count):
  root=c.call('DOM.getDocument')['root']['nodeId'];node=c.call('DOM.querySelector',{'nodeId':root,'selector':'#temporal-input'})['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(path)]});wait(lambda:c.evaluate(f"document.querySelectorAll('[data-temporal-moment]').length==={count}"))
 uploadfile(ROOT/'test/fixtures/restart-parent-report.json',4)
 setvalue('#reference-label','Independent plane');setvalue('#reference-basis','Original common corners explicitly reviewed');c.evaluate("document.querySelector('#reference-confirm').checked=true")
 setvalue('[data-temporal-moment]:nth-child(3) input[type=number]','106.25');c.evaluate("document.querySelectorAll('[data-temporal-moment]')[2].querySelectorAll('input')[1].value='101.75';document.querySelectorAll('[data-temporal-moment]')[2].querySelectorAll('input')[2].value='Explicit independent restart on original';document.querySelectorAll('[data-temporal-moment]')[2].querySelector('button').click()")
 setvalue('#temporal-declarations input[type=text]','Original reviewed point');setvalue('#temporal-declarations input[type=number]','1');c.evaluate("document.querySelector('#temporal-declarations input[type=checkbox]').checked=true");clicktext('Accept reviewed original points');wait(lambda:c.evaluate("!!document.querySelector('#temporal-restart-anchor')"));checks.append('accepted correction exposes explicit restart without reentering coordinates')
 c.evaluate("document.querySelector('#temporal-restart-anchor').parentElement.nextElementSibling.querySelector('input').value='Point manually located after flat original'");clicktext('Export explicit restart request');wait(lambda:c.evaluate("receivedDownloads.some(x=>x.name==='temporal-restart-request.json')"));request=json.loads(c.evaluate("receivedDownloads.find(x=>x.name==='temporal-restart-request.json').text"));assert request['acceptedParent']['samples'][1]['markId']is None;assert request['choices'][2]['sourcePx']=={'x':106.25,'y':101.75};(OUT/'request.json').write_text(json.dumps(request));checks.append('export retains accepted prefix explicit gap and continuous anchor')
 setvalue('#reference-basis','Changed after acceptance');assert not c.evaluate("!!document.querySelector('#temporal-restart-anchor')");checks.append('edited accepted frame retires restart controls')
 import subprocess
 (OUT/'report.json').unlink(missing_ok=True)
 run=subprocess.run(['node',str(ROOT/'tools/temporal-points/restart.mjs'),str(OUT/'request.json'),str(OUT/'report.json')],cwd=ROOT,text=True,capture_output=True);assert run.returncode==0,run.stderr
 uploadfile(OUT/'report.json',2);checks.append('actual unchanged native suffix opens editable originals')
 assert c.evaluate("(()=>{const a=document.querySelector('[data-fixed-restart-anchor]');return a&&[...a.querySelectorAll('input')].every(x=>x.readOnly)&&[...a.querySelectorAll('button')].every(x=>x.disabled)&&a.textContent.includes('new restart request')})()");checks.append('fixed anchor explicitly read-only with correction and missing controls disabled')
 original=c.evaluate("document.querySelector('[data-fixed-restart-anchor] circle').getAttribute('cx')");c.evaluate("document.querySelector('[data-fixed-restart-anchor] button').onclick()");assert c.evaluate("document.querySelector('[data-fixed-restart-anchor] circle').getAttribute('cx')")==original;assert c.evaluate("document.querySelector('#temporal-points>p:last-of-type').textContent.includes('anchor is fixed')");checks.append('even direct fixed-anchor correction handler refuses without losing accepted anchor')

 setvalue('#temporal-declarations input[type=text]','Tail point');setvalue('#temporal-declarations input[type=number]','1');clicktext('Accept reviewed original points');assert c.evaluate("document.querySelectorAll('[data-temporal-moment]').length===2");checks.append('new suffix review mandatory')
 c.evaluate("document.querySelector('#temporal-declarations input[type=checkbox]').checked=true");setvalue('#reference-basis','Changed returned frame');clicktext('Accept reviewed original points');assert c.evaluate("document.querySelectorAll('[data-temporal-moment]').length===2");checks.append('changed common frame refuses resumed acceptance');setvalue('#reference-basis',request['acceptedParent']['reference']['basis']);clicktext('Accept reviewed original points');wait(lambda:c.evaluate("document.querySelectorAll('[data-temporal-moment]').length===0"));c.evaluate("document.querySelector('#save').click()");wait(lambda:c.evaluate("receivedDownloads.some(x=>x.name==='sampled-path.json')"));saved=json.loads(c.evaluate("receivedDownloads.find(x=>x.name==='sampled-path.json').text"));assert saved['path']['samples'][:3]==request['acceptedParent']['samples'][:3];assert saved['sourceBundle']['sequence']['moments'][:3]==request['acceptedParent']['sequence']['moments'][:3];assert saved['sourceBundle']['frames']==request['parentReport']['sourceBundle']['frames'];assert saved['path']['samples'][1]['markId']is None;(OUT/'saved.json').write_text(json.dumps(saved));checks.append('accepted restart reaches ordinary saved path')
 c.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True});assert c.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append('narrow layout');assert c.exceptions==[]
 (OUT/'browser.json').write_text(json.dumps({'passed':True,'checks':checks,'sandbox':sandbox,'exceptions':c.exceptions,'scope':'Restored source, original authored raster translations; static receiving host, not native server receiving'},indent=2));(OUT/'temporal.png').write_bytes(base64.b64decode(c.call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True})['data']));print(json.dumps({'passed':True,'checks':checks}))
except Exception as e:
 (OUT/'failure.json').write_text(json.dumps({'error':str(e),'checks':checks,'exceptions':c.exceptions,'url':c.evaluate('location.href'),'body':c.evaluate('document.body?.innerText')},indent=2));raise
finally:server.shutdown();c.s.close()
