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
 report=json.loads((ROOT/'test/fixtures/temporal-native-report.json').read_text());upload();checks.append('actual full native report imports')
 proof=c.evaluate("Promise.all([...document.querySelectorAll('[data-temporal-moment]')].map(async e=>({hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await originalBlobs.get(e.querySelector('image').getAttribute('href')).arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join(''),x:Number(e.querySelector('circle').getAttribute('cx'))})))")
 assert [p['hash']for p in proof]==[r['image']['sha256']for r in report['rows']];assert [p['x']for p in proof]==[r['sourcePx']['x']for r in report['rows']];checks.append('original byte hashes and continuous overlays')
 setvalue('#reference-label','Independent plane');setvalue('#reference-basis','Fixed original corner meanings separately reviewed');c.evaluate("document.querySelector('#reference-confirm').checked=true");setvalue('#temporal-declarations input[type=text]','Reviewed point');setvalue('#temporal-declarations input[type=number]','1');clicktext('Accept reviewed original points');assert c.evaluate("document.querySelector('#result').hidden");checks.append('explicit all-original semantic review required')
 c.evaluate("document.querySelector('#temporal-declarations input[type=checkbox]').checked=true");clicktext('Accept reviewed original points');wait(lambda:c.evaluate("!document.querySelector('#result').hidden"));checks.append('ordinary annotation and path acceptance');c.evaluate("document.querySelector('#save').click()");wait(lambda:c.evaluate("receivedDownloads.some(x=>x.name==='sampled-path.json')"));saved=json.loads(c.evaluate("receivedDownloads.find(x=>x.name==='sampled-path.json').text"));assert saved['sourceBundle']['frames']==report['sourceBundle']['frames'];checks.append('ordinary save preserves original PNGs')
 upload();setvalue('[data-temporal-moment]:nth-child(2) input[type=number]','104.5');setvalue('[data-temporal-moment]:nth-child(4) input[type=number]','112.5');clicktext('Accept reviewed original points');assert c.evaluate("document.querySelector('#temporal-points>p:last-of-type').textContent.includes('Apply each')");checks.append('unapplied typed correction cannot silently accept older point');c.evaluate("document.querySelectorAll('[data-temporal-moment]')[1].querySelector('button').click()");assert c.evaluate("document.querySelectorAll('[data-temporal-moment]')[3].querySelector('input').value")=='112.5';clicktext('Accept reviewed original points');assert c.evaluate("document.querySelector('#temporal-points>p:last-of-type').textContent.includes('Apply each')");checks.append('other unapplied row survives correction redraw');assert c.evaluate("document.querySelectorAll('[data-temporal-moment] circle').length")==2;checks.append('correction retires inherited successors')
 c.evaluate("document.querySelectorAll('#samples .include').forEach(e=>e.checked=true)");setvalue('#temporal-points>label input[type=number]','100.25');c.evaluate("document.querySelectorAll('#temporal-points>label input[type=number]')[1].value='100.75'");clicktext('Export original temporal query');wait(lambda:c.evaluate("receivedDownloads.some(x=>x.name==='temporal-original-query.json')"));query=json.loads(c.evaluate("receivedDownloads.find(x=>x.name==='temporal-original-query.json').text"));assert query['query']==report['query'];assert query['sourceBundle']['frames']==report['sourceBundle']['frames'];checks.append('original query export')
 c.evaluate("(()=>{const old=Element.prototype.append;Element.prototype.append=function(...args){if(this.matches?.('[data-temporal-moment]')){Element.prototype.append=old;throw Error('injected post-transfer rendering failure')}return old.apply(this,args)}})()")
 root=c.call('DOM.getDocument')['root']['nodeId'];node=c.call('DOM.querySelector',{'nodeId':root,'selector':'#temporal-input'})['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(ROOT/'test/fixtures/temporal-native-report.json')]});wait(lambda:c.evaluate("document.querySelector('#temporal-points>p:last-of-type').textContent.includes('injected post-transfer')"));assert c.evaluate("Promise.all([...document.querySelectorAll('#samples image')].map(async e=>{try{return(await fetch(e.getAttribute('href'))).ok}catch{return false}})).then(a=>a.length===4&&a.every(Boolean))");checks.append('render failure preserves media ownership transferred to source')
 c.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True});assert c.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append('narrow layout');assert c.exceptions==[]
 (OUT/'browser.json').write_text(json.dumps({'passed':True,'checks':checks,'sandbox':sandbox,'exceptions':c.exceptions,'scope':'Restored source, original authored raster translations; static receiving host, not native server receiving'},indent=2));(OUT/'temporal.png').write_bytes(base64.b64decode(c.call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True})['data']));print(json.dumps({'passed':True,'checks':checks}))
except Exception as e:
 (OUT/'failure.json').write_text(json.dumps({'error':str(e),'checks':checks,'exceptions':c.exceptions,'url':c.evaluate('location.href'),'body':c.evaluate('document.body?.innerText')},indent=2));raise
finally:server.shutdown();c.s.close()
