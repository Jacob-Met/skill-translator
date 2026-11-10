// Actual Sequence workspace course. Uses the maintained app and native Chrome CDP.
// Source is an authored analytic clip; this is not physical-skill or learning evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
const out=path.resolve(process.env.RECEIPT_DIR||'/tmp/sequence-workspace-'+Date.now());
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'downloads'),{recursive:true});
const report={result:'FAIL',source:'authored four-frame alignment clip',tests:[],errors:[],dialogs:[],requests:[]};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let browser,server,ws,sid,serial=0,origin,acceptDialog=false;
const pending=new Map(),downloads=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(method,params={},session=sid){return new Promise((resolve,reject)=>{
 const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},12000);
 pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));
});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(f,label,ms=15000){const end=Date.now()+ms;while(!await f()){if(Date.now()>end)throw Error(label);await delay(45);}}
const wait=(expr,label)=>until(()=>evaluate(expr),label);
async function click(selector){
 const p=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing '+ "+JSON.stringify(selector)+");e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===e||e.contains(h)))throw Error('Not hit-testable '+e.id);return{x,y};})()");
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
 await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
}
async function fill(id,text){await click('#'+id);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await cdp('Input.insertText',{text:String(text)});}
async function upload(id,file){const d=await cdp('DOM.getDocument'),n=await cdp('DOM.querySelector',{nodeId:d.root.nodeId,selector:'#'+id});await cdp('DOM.setFileInputFiles',{nodeId:n.nodeId,files:[file]});}
async function newPage(url){
 const target=await cdp('Target.createTarget',{url:'about:blank'},null);
 sid=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 for(const domain of ['Page','Runtime','DOM','Network'])await cdp(domain+'.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url});await wait("Boolean(document.querySelector('#step-source-preview')&&document.querySelector('#save-state'))",'Sequence ready');
 return sid;
}
async function shot(name){
 await evaluate("window.scrollTo({top:0,behavior:'instant'})");
 const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));
}
async function download(selector){
 const count=downloads.length;await click(selector);
 await until(()=>downloads.slice(count).some(e=>e.method==='Browser.downloadWillBegin'),'Download begins');
 const start=downloads.slice(count).find(e=>e.method==='Browser.downloadWillBegin');
 await until(()=>downloads.slice(count).some(e=>e.method==='Browser.downloadProgress'&&e.guid===start.guid&&e.state==='completed'),'Download completes');
 const file=path.join(out,'downloads',start.guid);assert(fs.existsSync(file));return {file,bytes:fs.readFileSync(file),name:start.suggestedFilename};
}
async function retain(seconds,label){
 await fill('moment-time',seconds);await fill('moment-label',label);await fill('moment-state','Authored visible state: '+label);
 await click('#capture-moment');await wait("document.querySelector('#status').textContent.includes("+JSON.stringify('Retained '+label)+")",'Moment retained');
}
const record=name=>report.tests.push(name);
try{
 server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const profile=path.join(out,'chrome-profile');
 browser=spawn(process.env.CHROME_BINARY||'/usr/local/bin/google-chrome',['--headless=new','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--window-size=1440,1000','about:blank'],{stdio:['ignore','ignore','pipe']});
 let chromeLog='';browser.stderr.on('data',data=>{chromeLog=(chromeLog+data).slice(-12000);});
 await until(()=>fs.existsSync(path.join(profile,'DevToolsActivePort')),'Chrome opens: '+chromeLog);
 const [port,route]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);
 ws=new WebSocket('ws://127.0.0.1:'+port+route);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('message',event=>{
  const m=JSON.parse(event.data);
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
  else if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);
  else if(m.method==='Network.requestWillBeSent')report.requests.push(m.params.request.url);
  else if(m.method?.startsWith('Browser.download'))downloads.push({method:m.method,...m.params});
  else if(m.method==='Page.javascriptDialogOpening'){
   report.dialogs.push({type:m.params.type,message:m.params.message,accepted:acceptDialog});
   cdp('Page.handleJavaScriptDialog',{accept:acceptDialog},m.sessionId).catch(e=>report.errors.push(String(e)));
  }
 });
 report.browser=await cdp('Browser.getVersion',{},null);
 await cdp('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:path.join(out,'downloads'),eventsEnabled:true},null);
 const original=await newPage(origin+'/sequence');
 assert(await evaluate("document.querySelector('#video-host').getBoundingClientRect().top<450"));
 await shot('empty-desktop.png');
 const frames=await evaluate("Array.from({length:4},(_,i)=>{const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.fillStyle='#e9e3ce';x.fillRect(0,0,640,360);x.fillStyle='#24372c';x.font='22px sans-serif';x.fillText('AUTHORED ALIGNMENT / '+i,100,80);x.fillStyle=i<2?'#db2727':'#2448db';x.fillRect(i<2?100:400,160,40,40);return c.toDataURL('image/png').split(',')[1]})");
 for(let i=0;i<frames.length;i++)fs.writeFileSync(path.join(out,'frame-'+i+'.png'),Buffer.from(frames[i],'base64'));
 const clip=path.join(out,'authored-alignment.webm');
 const ff=spawnSync('/usr/bin/ffmpeg',['-y','-loglevel','error','-framerate','2','-i',path.join(out,'frame-%d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p','-r','2',clip],{encoding:'utf8',timeout:30000});assert.equal(ff.status,0,ff.stderr);
 await upload('clip-file',clip);await wait("document.querySelector('#status').textContent.includes('Original clip ready')",'Clip opens');
 await retain(.25,'Before alignment');
 assert.equal(await evaluate("document.querySelector('#print-lesson').disabled"),true);
 const partial=await download('#export-sequence'),part=JSON.parse(partial.bytes);
 assert.equal(part.sequence.moments.length,1);assert.equal(part.sequence.steps.length,0);
 assert.equal(sha(Buffer.from(part.frames[0].pngBase64,'base64')),part.sequence.moments[0].image.sha256);
 record('One captured frame saves as a real editable sequence before a step exists; lesson remains unavailable');
 await retain(1.25,'After alignment');
 await fill('sequence-title','Align the registration guide');
 await fill('step-title','Set the guide');await fill('step-intent','Move the marker onto its guide');await fill('step-change','Marker moves right and becomes blue');
 assert.equal(await evaluate("document.querySelectorAll('#step-source-preview img').length"),2);
 const preview=await evaluate("Promise.all([...document.querySelectorAll('#step-source-preview img')].map(async i=>{await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);return [...x.getImageData(i.alt.startsWith('Before')?115:415,175,1,1).data]}))");
 assert(preview[0][0]>140&&preview[1][2]>140);
 await shot('authoring-desktop.png');
 await click('#save-step');await wait("document.querySelector('#status').textContent.includes('Authored step saved')",'Step saves');
 const full=await download('#export-sequence'),saved=JSON.parse(full.bytes);
 assert.equal(saved.sequence.steps.length,1);assert.equal(saved.sequence.moments.length,2);
 assert.equal(await evaluate("document.querySelector('#save-state').dataset.dirty"),'false');
 record('Selected original before/after pixels stay beside authored account; saved sequence includes both originals');
 await fill('moment-label','Not yet retained');
 await download('#export-sequence');
 assert.equal(await evaluate("document.querySelector('#save-state').dataset.dirty"),'true');
 await fill('moment-label','');
 assert.equal(await evaluate("document.querySelector('#save-state').dataset.dirty"),'false');
 record('Exporting accepted work does not falsely mark an unretained moment draft as saved');
 await upload('sequence-file',full.file);await wait("document.querySelector('#status').textContent.includes('Reopened 2 verified')",'Same sequence reopens');
 assert.equal(await evaluate("Promise.all([...document.querySelectorAll('#step-source-preview img')].map(i=>i.decode().then(()=>i.naturalWidth))).then(v=>v.join(','))"),'640,640');
 record('Reopening the same sequence refreshes evidence image URLs after old assets are released');
 assert(await evaluate("[...document.querySelectorAll('.topbar a')].every(a=>a.target==='_blank'&&a.rel.includes('noopener'))"));
 const before=await cdp('Target.getTargets',{},null);
 await click('#practice-decisions');
 await until(async()=>{const after=await cdp('Target.getTargets',{},null);return after.targetInfos.some(t=>t.url===origin+'/decision-practice'&&!before.targetInfos.some(b=>b.targetId===t.targetId));},'Task-specific practice opens');
 record('Existing task-specific learner handoff opens a separate decision-practice tab; other tools also preserve author tab');
 await fill('sequence-title','Unsaved guide revision');
 const dialogCount=report.dialogs.length;
 await cdp('Page.navigate',{url:origin+'/practice'});
 await until(()=>report.dialogs.length>dialogCount,'Departure warns');
 assert.equal(report.dialogs.at(-1).type,'beforeunload');
 assert.equal(await evaluate('location.pathname'),'/sequence');
 assert.equal(await evaluate("document.querySelector('#sequence-title').value"),'Unsaved guide revision');
 record('A real same-tab navigation warns; cancel keeps unsaved title and original account');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await shot('authoring-phone.png');
 assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"));
 assert(await evaluate("document.querySelector('#video-host').getBoundingClientRect().top<650"));
 record('Actual 390px layout keeps source in first viewport without horizontal overflow');
 await click('#clear-sequence');
 assert.equal(await evaluate("document.querySelectorAll('.moment-card').length"),2);
 acceptDialog=true;await click('#clear-sequence');acceptDialog=false;
 await wait("document.querySelectorAll('.moment-card').length===0",'Explicit new-sequence discard');
 record('Cancel new demonstration retains source; explicit discard resets it');
 await upload('sequence-file',partial.file);await wait("document.querySelector('#status').textContent.includes('Reopened 1 verified')",'Partial reopens');
 assert.equal(await evaluate("document.querySelectorAll('.moment-card').length"),1);
 assert.equal(await evaluate("document.querySelector('#practice-decisions').disabled"),true);
 assert.equal(await evaluate("document.querySelector('#video-host .retained-source img').decode().then(()=>document.querySelector('#video-host img').naturalWidth)"),640);
 record('Actual one-frame export reopens before any authored step and does not enable unsupported learner handoff');
 report.offsite=report.requests.filter(u=>/^https?:/.test(u)&&!u.startsWith(origin+'/'));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);
 report.result='PASS';
}catch(error){report.failure=error.stack;try{await shot('failure.png');}catch{}throw error;}
finally{
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,tests:report.tests,errors:report.errors,failure:report.failure,out},null,2));
 try{if(ws?.readyState===1)await cdp('Browser.close',{},null);}catch{}
 try{ws?.close();}catch{}if(browser?.exitCode===null)browser.kill('SIGTERM');
 if(server)await new Promise(r=>server.close(r));
}
