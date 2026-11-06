// Real-browser observation corrections; authored analytic controls, not learning evidence.
// Receiving requires Node >=22 with built-in WebSocket and an existing Chrome binary.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const source=path.resolve(process.env.SKILL_SOURCE_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const out=path.resolve(process.env.QA_OUTPUT||path.join(os.tmpdir(),'skill-observation-corrections-'+Date.now()));
assert(process.env.CHROME_BINARY,'Set CHROME_BINARY to an existing browser executable');
assert(typeof WebSocket==='function','Receiving requires Node built-in WebSocket');
fs.mkdirSync(out);fs.mkdirSync(path.join(out,'downloads'));const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={course:'retained observation corrections',evidence:'authored analytic geometry; no physical measurement or learning claim',startedAt:new Date().toISOString(),node:process.version,source,tests:[],inputs:[],dialogs:[],errors:[],requests:[],downloads:[],cleanupErrors:[]};
const save=(name,b)=>fs.writeFileSync(path.join(out,name),b,{flag:'wx'});
for(const name of ['web/app.mjs','web/index.html','web/index.css','src/evidence.mjs','server.mjs']){
 const b=fs.readFileSync(path.join(source,name));report.inputs.push({path:name,bytes:b.length,sha256:sha(b)});
}
save('ADMISSION.json',JSON.stringify(report,null,2)+'\n');save('driver.mjs',fs.readFileSync(new URL(import.meta.url)));
const fields=['obsLabel','obsClass','obsWidth','obsHeight','obsX','obsY','obsUncertainty'];
const demo={title:'Authored correction control',provenance:'Owned analytic controls; no physical experiment',
 source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
 landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:2},{id:'other',label:'Other mark',kind:'fraction',sourcePx:{x:50,y:40},toleranceMm:2}]};
save('source.json',JSON.stringify(demo,null,2)+'\n');
let server,browser,socket,sid,sequence=0,stopping=false,deadline,navigation=0,browserExit=null,stderr='';
const pending=new Map(),downloads=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(method,params={},session=sid){return new Promise((resolve,reject)=>{
 if(stopping&&method!=='Browser.close')return reject(Error('Course stopped'));
 const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},7000);
 pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));
});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(predicate,label,ms=8000){const end=Date.now()+ms;while(!await predicate()){assert(!stopping,'Stopped');assert(Date.now()<end,label);await delay(40);}}
async function wait(expression,label){return until(()=>evaluate(expression),label);}
async function click(selector){const p=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!(r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&(hit===e||e.contains(hit))))throw Error('Control not rendered or hit-testable: '+e.id);return{x,y};})()");
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
async function key(key,code,number,modifiers=0){await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,modifiers,...(key==='Enter'&&modifiers===0?{text:'\r',unmodifiedText:'\r'}:{})});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number,modifiers});}
async function fill(id,value){await click('#'+id);await key('a','KeyA',65,2);await cdp('Input.insertText',{text:String(value)});}
async function form(values){for(const [id,value]of Object.entries(values))if(id==='obsClass'){await click('#obsClass');await key('Home','Home',36);if(value==='authored-example')await key('ArrowDown','ArrowDown',40);await key('Tab','Tab',9);}else await fill(id,value);}
async function upload(id,file){const doc=await cdp('DOM.getDocument'),r=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#'+id});await cdp('DOM.setFileInputFiles',{nodeId:r.nodeId,files:[file]});}
async function state(){return evaluate("(()=>({fields:"+JSON.stringify(fields)+".map(id=>document.getElementById(id).value),active:document.activeElement?.id,cancelHidden:document.getElementById('cancelObservationEdit').hidden,status:document.getElementById('observationEditStatus').textContent,error:document.getElementById('error').textContent,rows:document.querySelectorAll('#observationRows tr').length,rules:[...document.querySelectorAll('#candidateCards .compatible')].map(e=>e.dataset.rule),heading:document.getElementById('observationFormHeading').textContent}))()");}
async function download(button='exportObservations',keyboard=false){
 const before=downloads.length;if(keyboard){assert.equal(await evaluate('document.activeElement?.id'),button);await key('Enter','Enter',13);}else await click('#'+button);
 await until(()=>downloads.slice(before).some(e=>e.method==='Browser.downloadWillBegin'),'Real download begins');
 const begin=downloads.slice(before).find(e=>e.method==='Browser.downloadWillBegin');assert(begin);
 await until(()=>downloads.slice(before).some(e=>e.method==='Browser.downloadProgress'&&e.guid===begin.guid&&e.state==='completed'),'Matching real download completion');assert(/^[a-zA-Z0-9-]+$/.test(begin.guid));
 const file=path.join(out,'downloads',begin.guid);await until(()=>fs.existsSync(file),'Downloaded bytes absent');
 const bytes=fs.readFileSync(file);assert(bytes.length<=256*1024);const data=JSON.parse(bytes);
 report.downloads.push({path:'downloads/'+begin.guid,suggestedFilename:begin.suggestedFilename,bytes:bytes.length,sha256:sha(bytes)});return {file,data};
}
async function shot(name){await evaluate("document.getElementById('observationForm').scrollIntoView({block:'start'})");const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save(name,Buffer.from(r.data,'base64'));}
async function sourceControlsShot(name){
 const visible=await evaluate("(()=>{const e=document.getElementById('downloadSource');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),d=document.getElementById('authorForm').closest('details');return{annotationOpen:d.open,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},ancestorDetails:e.closest('details')?.open??null}})()");
 assert.equal(visible.annotationOpen,false);assert(visible.bounds.width>0&&visible.bounds.height>0);assert(visible.ancestorDetails!==false);
 const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save(name,Buffer.from(r.data,'base64'));return visible;
}
const note=(name,details={})=>report.tests.push({name,...details});
async function run(){
 const {createObservation,exportEvidence}=await import(pathToFileURL(path.join(source,'src/evidence.mjs')));
 let origin;
 if(process.env.SKILL_RECEIVE_BASE_URL!==undefined){
  const url=new URL(process.env.SKILL_RECEIVE_BASE_URL);
  assert(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash,'External receiving requires a plain HTTP 127.0.0.1 origin');
  origin=url.origin;report.serverMode='external maintained launcher; caller owns lifecycle';
 }else{
  const {createAppServer}=await import(pathToFileURL(path.join(source,'server.mjs')));
  server=createAppServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin='http://127.0.0.1:'+server.address().port;report.serverMode='owned maintained createAppServer';
 }
 report.origin=origin;
 const profile=path.join(out,'browser-profile');
 browser=spawn(process.env.CHROME_BINARY,['--headless=new','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--window-size=1380,1000','about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
 report.browserPid=browser.pid;if(browser.pid)save('BROWSER_STARTED.json',JSON.stringify({browserPid:browser.pid,executable:process.env.CHROME_BINARY,profile,startedAt:new Date().toISOString()},null,2)+'\n');browser.on('error',e=>{report.errors.push({browserSpawn:String(e)});});browser.on('exit',(code,signal)=>{browserExit={code,signal};});browser.stderr.on('data',b=>{stderr=(stderr+b).slice(-16000);});
 const endpoint=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(endpoint),'Chrome endpoint',12000);
 const [port,wsPath]=fs.readFileSync(endpoint,'utf8').trim().split(/\r?\n/);socket=new WebSocket('ws://127.0.0.1:'+port+wsPath);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}
 else if(r.method==='Runtime.exceptionThrown')report.errors.push(r.params.exceptionDetails);
 else if(r.method==='Network.requestWillBeSent')report.requests.push(r.params.request.url);
 else if(r.method==='Page.frameNavigated'&&!r.params.frame.parentId)navigation++;
 else if(r.method?.startsWith('Browser.download'))downloads.push({method:r.method,...r.params});
 else if(r.method==='Page.javascriptDialogOpening'){report.dialogs.push(r.params);cdp('Page.handleJavaScriptDialog',{accept:false}).catch(e=>report.cleanupErrors.push(String(e)));}});
 report.browserVersion=await cdp('Browser.getVersion',{},null);const t=await cdp('Target.createTarget',{url:'about:blank'},null);sid=(await cdp('Target.attachToTarget',{targetId:t.targetId,flatten:true},null)).sessionId;
 for(const domain of ['Page','DOM','Runtime','Network'])await cdp(domain+'.enable');
 await cdp('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:path.join(out,'downloads'),eventsEnabled:true},null);
 await cdp('Page.navigate',{url:origin+'/'});await wait("Boolean(document.querySelector('#markChoices button')&&document.querySelector('#candidateCards > *')&&document.getElementById('evidenceSummary')?.dataset.status)",'Application ready');
 await upload('demoFile',path.join(out,'source.json'));await wait("document.getElementById('demoLabel').textContent.includes('Authored correction control')",'Source admitted');
 await form({obsLabel:'Original precise trial',obsClass:'authored-example',obsWidth:200,obsHeight:160,obsX:'20.123456789',obsY:60,obsUncertainty:.5});await click('#submitObservation');
 await wait("document.querySelectorAll('#observationRows tr').length===1",'Initial observation');assert.deepEqual((await state()).rules,['left']);
 const original=(await download()).data;const row=original.observations[0];assert.equal(row.id,'observation-1');assert.equal(row.xMm,20.123456789);
 const draft={obsLabel:'Unsubmitted next trial',obsClass:'reported-measurement',obsWidth:'333.125',obsHeight:'222.75',obsX:'21.625',obsY:'41.75',obsUncertainty:'0.125'};await form(draft);const addDraft=(await state()).fields;
 await click('#editObservation-observation-1');let st=await state();assert.equal(st.active,'obsLabel');assert.equal(st.fields[4],'20.123456789');assert.equal(st.cancelHidden,false);assert(await evaluate("[...document.querySelectorAll('[id^=editObservation-]')].every(e=>e.disabled)"));
 await shot('desktop-edit-mode.png');await fill('obsLabel','Unapplied text');await click('#cancelObservationEdit');st=await state();assert.deepEqual(st.fields,addDraft);assert.equal(st.active,'editObservation-observation-1');assert.deepEqual((await download()).data,original);note('Cancel restores exact seven-string Add draft and retained evidence');
 await click('#editObservation-observation-1');await fill('obsX',201);await click('#submitObservation');st=await state();assert.equal(st.cancelHidden,false);assert.equal(st.fields[4],'201');assert.match(st.error,/refused/);assert.deepEqual((await download()).data,original);note('Invalid Apply preserves editor draft and original evidence');
 await fill('obsX',40);await key('Enter','Enter',13);await wait("document.getElementById('cancelObservationEdit').hidden",'Native Enter applies');
 st=await state();assert.deepEqual(st.fields,addDraft);assert.equal(st.active,'editObservation-observation-1');assert.deepEqual(st.rules,['fraction']);
 const corrected=(await download()).data;assert.deepEqual(corrected.observations,[{...row,xMm:40}]);note('Native Enter corrects retained ID/anchor in place and changes left-only to fraction-only');
 // Retain only a DOM control identity for the explicit stale-submit negative.
 await click('#editObservation-observation-1');await evaluate("window.__retiredObservationSubmit=document.getElementById('submitObservation')");await click('#cancelObservationEdit');
 await form({obsLabel:'Second trial',obsClass:'authored-example',obsWidth:200,obsHeight:160,obsX:40,obsY:60,obsUncertainty:.5});await evaluate("document.getElementById('observationForm').requestSubmit()");note('Legacy null-submitter Add compatibility uses unchanged requestSubmit()');
 await wait("document.querySelectorAll('#observationRows tr').length===2",'Second observation');await form(draft);
 const pair=(await download()).data;await click('#editObservation-observation-2');
 await evaluate("document.getElementById('observationForm').dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:window.__retiredObservationSubmit}))");
 assert.equal((await state()).cancelHidden,false);assert.deepEqual((await download()).data,pair);
 await evaluate("document.getElementById('observationForm').requestSubmit()");
 assert.equal((await state()).cancelHidden,false);assert.deepEqual((await download()).data,pair);await click('#cancelObservationEdit');
 note('Explicit DOM negatives: stale non-null submitter and null Edit submission retain evidence');
 const full=exportEvidence(demo,Array.from({length:60},(_,i)=>createObservation(demo,{id:'observation-'+(i+1),landmarkId:'guide',label:'Capacity '+(i+1),evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.5})));
 save('capacity.json',JSON.stringify(full,null,2)+'\n');
 await click('#editObservation-observation-1');await fill('obsLabel','Must not leak into imported same ID');
 await upload('observationFile',path.join(out,'capacity.json'));await wait("document.querySelectorAll('#observationRows tr').length===60",'Capacity import');
 st=await state();assert.equal(st.cancelHidden,true);assert.deepEqual(st.fields,addDraft);assert.deepEqual((await download()).data,full);note('Same-ID accepted import retires pinned editor and restores Add draft');
 await click('#editObservation-observation-1');await fill('obsLabel','Capacity corrected');await click('#submitObservation');assert.equal((await state()).rows,60);
 const atCapacity=(await download()).data;assert.deepEqual(atCapacity.observations[0],{...full.observations[0],label:'Capacity corrected'});assert.deepEqual(atCapacity.observations.slice(1),full.observations.slice(1));
 await click('#submitObservation');assert.match((await state()).error,/at most 60/);assert.deepEqual((await download()).data,atCapacity);note('Edit succeeds at60 while an additional observation remains refused');
 await click('#editObservation-observation-1');await fill('obsLabel','Stale mark draft');await click('#markChoices button:nth-child(2)');st=await state();assert.equal(st.cancelHidden,true);assert.deepEqual(st.fields,addDraft);
 await click('#markChoices button:first-child');assert.deepEqual((await download()).data,atCapacity);note('Changing selected source mark retires correction without rebinding');
 await shot('desktop-corrections.png');
 report.desktopSourceControls=await sourceControlsShot('desktop-source-controls.png');
 const desktopSource=await download('downloadSource');const keyboardSource=await download('downloadSource',true);assert.deepEqual(keyboardSource.data,desktopSource.data);assert.deepEqual(desktopSource.data,demo);note('Visible desktop source export with annotation disclosure closed; native Enter repeats exact download');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await click('#editObservation-observation-1');await fill('obsLabel','Mobile correction');await shot('mobile-edit-mode.png');await key('Enter','Enter',13);await wait("document.getElementById('cancelObservationEdit').hidden",'Mobile native Enter');
 const mobile=(await download()).data;assert.equal(mobile.observations[0].label,'Mobile correction');assert.equal(mobile.observations[0].id,'observation-1');assert.deepEqual(mobile.observations[0].sourceReference,row.sourceReference);
 const width=await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})');assert(width.page<=width.viewport+2);await shot('mobile-corrections.png');
 report.mobileSourceControls=await sourceControlsShot('mobile-source-controls.png');
 const savedSource=await download('downloadSource');assert.deepEqual(savedSource.data,desktopSource.data);assert.equal(await evaluate("document.getElementById('authorForm').closest('details').open"),false);const savedEvidence=await download();const n=navigation;await cdp('Page.reload',{ignoreCache:true});await until(()=>navigation>n,'Fresh document');
 await wait("Boolean(document.querySelector('#markChoices button')&&document.querySelector('#candidateCards > *')&&document.getElementById('evidenceSummary')?.dataset.status)",'Reloaded entry');await upload('demoFile',savedSource.file);await wait("document.getElementById('demoLabel').textContent.includes('Authored correction control')",'Reopened source');
 await upload('observationFile',savedEvidence.file);await wait("document.querySelectorAll('#observationRows tr').length===60",'Reopened evidence');
 assert.deepEqual((await download()).data,mobile);note('390px real downloaded source/evidence reopen with exact corrected records');
 // Ordinary removal retires an active editor; its former Apply must not become Add.
 await click('#editObservation-observation-60');await evaluate("window.__removedObservationSubmit=document.getElementById('submitObservation')");
 await click('button[aria-label="Remove Capacity 60"]');st=await state();assert.equal(st.rows,59);assert.equal(st.cancelHidden,true);
 const afterRemoval=(await download()).data;assert.deepEqual(afterRemoval.observations,mobile.observations.slice(0,59));
 await evaluate("document.getElementById('observationForm').dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:window.__removedObservationSubmit}))");
 assert.equal((await state()).rows,59);assert.deepEqual((await download()).data,afterRemoval);
 note('Removing active row retires editor; stale Apply cannot create an Add observation');
 for(const f of report.inputs)assert.equal(sha(fs.readFileSync(path.join(source,f.path))),f.sha256);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.dialogs,[]);assert(report.requests.every(u=>u.startsWith(origin+'/')||u.startsWith('blob:'+origin+'/')),'Unexpected page request');
 report.sourceUnchanged=true;report.accepted=true;
}
try{await Promise.race([run(),new Promise((_,reject)=>{deadline=setTimeout(()=>{stopping=true;reject(Error('120-second course bound'));},120000);})]);}
catch(error){report.failure=String(error.stack||error);}
finally{
 clearTimeout(deadline);stopping=true;
 if(socket?.readyState===WebSocket.OPEN){try{await cdp('Browser.close',{},null);}catch(e){report.cleanupErrors.push(String(e));}}
 socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Cleanup'));}pending.clear();
 if(browser?.pid){for(let i=0;i<80&&browserExit===null;i++)await delay(50);if(browserExit===null)report.cleanupErrors.push('Owned browser did not exit');else{report.browserExit=browserExit;try{fs.rmSync(path.join(out,'browser-profile'),{recursive:true,force:true});report.profileRemoved=true;}catch(e){report.cleanupErrors.push(String(e));}}}
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
 report.browserStderr=stderr;report.finishedAt=new Date().toISOString();report.pass=Boolean(report.accepted&&!report.failure&&!report.cleanupErrors.length&&browserExit?.code===0&&report.profileRemoved);
 try{save('RECEIVING.json',JSON.stringify(report,null,2)+'\n');}catch(e){report.pass=false;report.persistenceFailure=String(e);}
 console.log(JSON.stringify(report));process.exitCode=report.pass?0:1;
}
