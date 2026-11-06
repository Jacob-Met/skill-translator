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
const report={course:'Direct new-tab Calibration handoff to frozen Challenge',evidence:'authored analytic geometry; no physical measurement or learning claim',startedAt:new Date().toISOString(),node:process.version,source,tests:[],inputs:[],dialogs:[],errors:[],requests:[],downloads:[],cleanupErrors:[]};
const save=(name,b)=>fs.writeFileSync(path.join(out,name),b,{flag:'wx'});
for(const name of ['web/app.mjs','web/index.html','web/index.css','src/evidence.mjs','server.mjs','web/calibration.mjs','web/calibration.html','src/calibration-evidence.mjs','web/challenge.mjs','web/challenge.html','src/calibration-challenge.mjs','src/demo.mjs']){
 const b=fs.readFileSync(path.join(source,name));report.inputs.push({path:name,bytes:b.length,sha256:sha(b)});
}
save('ADMISSION.json',JSON.stringify(report,null,2)+'\n');save('driver.mjs',fs.readFileSync(new URL(import.meta.url)));
const fields=['obsLabel','obsClass','obsWidth','obsHeight','obsX','obsY','obsUncertainty'];
const demo={"title":"Authored joined workbench session","provenance":"Authored software control; prospective declarations simulated. No physical measurement, independently verified chronology or learning evidence.","source":{"widthMm":100,"heightMm":80,"corners":[{"x":0,"y":0},{"x":100,"y":0},{"x":100,"y":80},{"x":0,"y":80}]},"landmarks":[{"id":"other","label":"Other mark","kind":"fraction","sourcePx":{"x":50,"y":40},"toleranceMm":2},{"id":"guide","label":"Guide","kind":"edge_offset_mm","edge":"left","sourcePx":{"x":20,"y":30},"toleranceMm":2}]};
save('source.json',"{\n  \"title\": \"Authored joined workbench session\",\n  \"provenance\": \"Authored software control; prospective declarations simulated. No physical measurement, independently verified chronology or learning evidence.\",\n  \"source\": {\n    \"widthMm\": 100,\n    \"heightMm\": 80,\n    \"corners\": [\n      {\n        \"x\": 0,\n        \"y\": 0\n      },\n      {\n        \"x\": 100,\n        \"y\": 0\n      },\n      {\n        \"x\": 100,\n        \"y\": 80\n      },\n      {\n        \"x\": 0,\n        \"y\": 80\n      }\n    ]\n  },\n  \"landmarks\": [\n    {\n      \"id\": \"other\",\n      \"label\": \"Other mark\",\n      \"kind\": \"fraction\",\n      \"sourcePx\": {\n        \"x\": 50,\n        \"y\": 40\n      },\n      \"toleranceMm\": 2\n    },\n    {\n      \"id\": \"guide\",\n      \"label\": \"Guide\",\n      \"kind\": \"edge_offset_mm\",\n      \"edge\": \"left\",\n      \"sourcePx\": {\n        \"x\": 20,\n        \"y\": 30\n      },\n      \"toleranceMm\": 2\n    }\n  ]\n}\n");
const evidence={"schema":"skill-translator-observations/v1","observations":[{"id":"prior-control","landmarkId":"guide","label":"Authored prior 200 by 160","evidenceClass":"authored-example","widthMm":200,"heightMm":160,"xMm":40,"yMm":60,"uncertaintyMm":0.5,"sourceReference":{"provenance":"Authored software control; prospective declarations simulated. No physical measurement, independently verified chronology or learning evidence.","source":{"widthMm":100,"heightMm":80,"corners":[{"x":0,"y":0},{"x":100,"y":0},{"x":100,"y":80},{"x":0,"y":80}]},"landmark":{"id":"guide","sourcePx":{"x":20,"y":30}}}},{"id":"other-control","landmarkId":"other","label":"Authored other-mark control","evidenceClass":"authored-example","widthMm":200,"heightMm":160,"xMm":100,"yMm":80,"uncertaintyMm":0.5,"sourceReference":{"provenance":"Authored software control; prospective declarations simulated. No physical measurement, independently verified chronology or learning evidence.","source":{"widthMm":100,"heightMm":80,"corners":[{"x":0,"y":0},{"x":100,"y":0},{"x":100,"y":80},{"x":0,"y":80}]},"landmark":{"id":"other","sourcePx":{"x":50,"y":40}}}}]};
save('observations.json',JSON.stringify(evidence,null,2)+'\n');
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
 const {demonstration:defaultDemo}=await import(pathToFileURL(path.join(source,'src/demo.mjs')));
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

 await cdp('Page.navigate',{url:origin+'/'});
 await wait("Boolean(document.querySelector('#markChoices button')&&document.getElementById('evidenceSummary')?.dataset.status)",'Task Space ready');
 await upload('demoFile',path.join(out,'source.json'));await wait("document.getElementById('demoLabel').textContent.includes('Authored joined workbench session')",'Authored source admitted');
 await click('#markChoices button:nth-child(2)');
 await upload('observationFile',path.join(out,'observations.json'));await wait("document.querySelectorAll('#observationRows tr').length===1",'Prior observation admitted');
 assert.deepEqual((await state()).rules,['fraction']);
 const originalSource=await download('downloadSource'),originalEvidence=await download('exportObservations');
 assert.deepEqual(originalSource.data,demo);assert.deepEqual(originalEvidence.data,evidence);
 note('Task Space retains selected second mark and exact source-bound prior evidence');

 const originalSession=sid;
 const targetList=await cdp('Target.getTargets',{},null);const beforeTargets=new Set(targetList.targetInfos.map(t=>t.targetId));
 await click('#editObservation-prior-control');await fill('obsX',41);
 await click('#calibrationStudy');await delay(150);
 assert.equal((await state()).cancelHidden,false);assert.equal((await state()).fields[4],'41');
 assert.equal((await cdp('Target.getTargets',{},null)).targetInfos.filter(t=>!beforeTargets.has(t.targetId)).length,0);
 assert(await evaluate("!document.getElementById('error').hidden&&document.getElementById('error').textContent.trim().length>0"));
 await click('#cancelObservationEdit');
 const addDraft={obsLabel:'Unsubmitted next observation',obsClass:'authored-example',obsWidth:'333.125',obsHeight:'222.75',obsX:'21.625',obsY:'41.75',obsUncertainty:'0.125'};
 await form(addDraft);const retainedAdd=(await state()).fields;
 await click('details:has(#authorForm)>summary');await fill('sourceX','12.25');await fill('sourceY','19.75');await fill('annotationLabel','Unsubmitted source annotation');
 const originalDraft=await evaluate("({sourceX:document.getElementById('sourceX').value,sourceY:document.getElementById('sourceY').value,label:document.getElementById('annotationLabel').value})");
 // Authored storage-state control: preserve an existing caller-owned key exactly.
 const oldKey='authored-preexisting-calibration-key';
 await evaluate("sessionStorage.setItem('skill-translator.calibration-input',"+JSON.stringify(oldKey)+")");
 // Authored controls below alter browser APIs only within their explicit cases.
 const noExtraTarget=async()=>assert.equal((await cdp('Target.getTargets',{},null)).targetInfos.filter(t=>!beforeTargets.has(t.targetId)).length,0);
 for(const control of ['blocked-popup','handoff-storage-set-failure']){
  await evaluate(control==='blocked-popup'?"(()=>{const old=window.open;window.__restoreHandoffControl=()=>{window.open=old};window.open=()=>null})()":"(()=>{const old=Storage.prototype.setItem;window.__restoreHandoffControl=()=>{Storage.prototype.setItem=old};Storage.prototype.setItem=function(k,v){if(k==='skill-translator.calibration-input')throw Error('Authored storage set refusal');return old.call(this,k,v)}})()");
  try{await click('#calibrationStudy');await noExtraTarget();assert(await evaluate("!document.getElementById('error').hidden"));assert.equal(await evaluate("sessionStorage.getItem('skill-translator.calibration-input')"),oldKey);assert.deepEqual((await state()).fields,retainedAdd);}
  finally{await evaluate("window.__restoreHandoffControl();delete window.__restoreHandoffControl");}
  note('Authored browser API control: '+control+' retains accepted work and drafts');
 }
 for(const [input,file]of [['demoFile','source.json'],['observationFile','observations.json']]){
  await evaluate("(()=>{const old=File.prototype.text;window.__releaseHeldRead=null;window.__restoreHandoffControl=()=>{File.prototype.text=old};File.prototype.text=function(){return new Promise((resolve,reject)=>{window.__releaseHeldRead=()=>reject(Error('Authored held-read cleanup'))})}})()");
  try{
   await upload(input,path.join(out,file));await wait("typeof window.__releaseHeldRead==='function'",'Authored file read held');
   await click('#calibrationStudy');await noExtraTarget();assert(await evaluate("!document.getElementById('error').hidden"));
   assert.deepEqual((await state()).fields,retainedAdd);assert.equal(await evaluate("sessionStorage.getItem('skill-translator.calibration-input')"),oldKey);
  }finally{
   await evaluate("window.__restoreHandoffControl();window.__releaseHeldRead?.();delete window.__restoreHandoffControl;delete window.__releaseHeldRead");
   await wait("document.getElementById("+JSON.stringify(input)+").value===''",'Held read settled and input cleared');
  }
  note('Authored pending '+input+' blocks handoff; held read rejected during cleanup, accepted work retained');
 }
 await evaluate("document.getElementById('calibrationStudy').scrollIntoView({block:'center'})");
 let actionPicture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save('desktop-handoff-action-help.png',Buffer.from(actionPicture.data,'base64'));
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await evaluate("document.getElementById('calibrationStudyStatus').scrollIntoView({block:'center'})");
 actionPicture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save('mobile-handoff-action-help.png',Buffer.from(actionPicture.data,'base64'));
 await cdp('Emulation.clearDeviceMetricsOverride');

 await click('#calibrationStudy');
 let newTarget;
 await until(async()=>{const targets=(await cdp('Target.getTargets',{},null)).targetInfos;newTarget=targets.find(t=>!beforeTargets.has(t.targetId)&&t.type==='page'&&t.url===origin+'/calibration');return Boolean(newTarget)},'Actual native-click Calibration tab');
 await cdp('Target.activateTarget',{targetId:t.targetId},null);
 assert.deepEqual((await state()).fields,retainedAdd);
 assert.deepEqual(await evaluate("({sourceX:document.getElementById('sourceX').value,sourceY:document.getElementById('sourceY').value,label:document.getElementById('annotationLabel').value})"),originalDraft);
 assert.equal(await evaluate("sessionStorage.getItem('skill-translator.calibration-input')"),oldKey);
 assert.deepEqual((await download('downloadSource')).data,originalSource.data);assert.deepEqual((await download('exportObservations')).data,originalEvidence.data);
 report.originalTabRetained={addDraft:retainedAdd,sourceDraft:originalDraft,oldKeyRestored:true,targetId:newTarget.targetId};
 sid=(await cdp('Target.attachToTarget',{targetId:newTarget.targetId,flatten:true},null)).sessionId;
 for(const domain of ['Page','DOM','Runtime','Network'])await cdp(domain+'.enable');
 await cdp('Target.activateTarget',{targetId:newTarget.targetId},null);
 await wait("document.getElementById('landmark')?.value==='guide'&&document.getElementById('summary')?.dataset.status==='single-compatible'",'New tab received selected second mark');
 assert.equal(await evaluate('window.opener===null'),true);
 assert.equal(await evaluate("sessionStorage.getItem('skill-translator.calibration-input')"),null);
 assert(await evaluate("!document.getElementById('handoffStatus').hidden"));
 report.popupEventCoverage='Runtime/network listeners attach after popup creation; early startup event coverage is partial. Export/source assertions qualify accepted state.';
 for(const [width,name]of [[1380,'desktop-receiver-notice.png'],[390,'mobile-receiver-notice.png']]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:false});await evaluate("document.getElementById('handoffStatus').scrollIntoView({block:'center'})");const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save(name,Buffer.from(r.data,'base64'));}await cdp('Emulation.clearDeviceMetricsOverride');
 assert(await evaluate("document.getElementById('handoffStatus').textContent.trim().length>0"));
 note('Active correction guard and actual new-tab handoff retain original drafts, all rows and prior storage key; opener detached');
 const investigation=await download('exportStudy');
 assert.deepEqual(investigation.data.source,demo);assert.deepEqual(investigation.data.observations,evidence.observations);assert.equal(investigation.data.landmarkId,'guide');assert.deepEqual(investigation.data.hypotheses,[]);
 assert.equal(investigation.data.observations.length,2);note('Destination export preserves exact source, second selected mark and all observation rows');
 await click('#challengeStudy');await wait("location.pathname==='/challenge'&&document.getElementById('sourceTitle')?.textContent=== "+JSON.stringify(demo.title),'Actual challenge handoff');
 for(const [id,value]of Object.entries({planLabel:'Authored unfamiliar-workpiece challenge',trialLabel:'Authored300by240',planWidth:300,planHeight:240,planRadius:.5}))await fill(id,value);
 await click('#trialForm button[type="submit"]');await click('#prospective');await click('#freeze');
 await wait("document.getElementById('planState').dataset.state==='frozen'",'Frozen plan');
 const frozen=await download('savePlan');assert.deepEqual(frozen.data.investigation,investigation.data);assert.equal(frozen.data.explanations.length,1);
 assert.equal(frozen.data.explanations[0].rule,'fraction');const prediction=frozen.data.explanations[0].predictions[0];assert.equal(prediction.xMm,60);assert.equal(prediction.yMm,90);
 assert.equal(await evaluate("document.getElementById('summary').dataset.status"),'awaiting-results');
 note('Actual calibration handoff preserves prior evidence and freezes prediction60,90 before outcome entry');
 for(const [id,value]of Object.entries({resultLabel:'Authored contradictory outcome',resultX:20,resultY:90,resultRadius:.5}))await fill(id,value);
 await click('#resultClass');await key('Home','Home',36);await key('ArrowDown','ArrowDown',40);await key('Tab','Tab',9);await click('#collectedAfter');await click('#resultForm button[type="submit"]');
 await wait("document.getElementById('summary').dataset.status==='none-compatible'",'Separate result contradicts frozen prediction');
 const unchanged=await download('savePlan'),study=await download('saveStudy');assert.deepEqual(unchanged.data,frozen.data);assert.deepEqual(study.data.plan,frozen.data);assert.equal(study.data.results.length,1);
 assert.equal(study.data.results[0].observation.xMm,20);assert.equal(study.data.results[0].observation.yMm,90);assert.equal(study.data.results[0].observation.evidenceClass,'authored-example');
 const residual=await evaluate("document.getElementById('predictionRows').textContent");assert.match(residual,/contradicted.*40/s);report.actualResidualText=residual;
 await evaluate("document.getElementById('summary').scrollIntoView({block:'center'})");let picture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save('desktop-frozen-contradiction.png',Buffer.from(picture.data,'base64'));
 note('Separately entered authored outcome contradicts prediction by40mm without changing training or plan');
 const n=navigation;await cdp('Page.reload',{ignoreCache:true});await until(()=>navigation>n,'Fresh challenge document');
 await wait("document.getElementById('planState')?.dataset.state==='unplanned'",'Fresh page has no retained in-memory plan');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await upload('challengeFile',study.file);await wait("document.getElementById('summary').dataset.status==='none-compatible'",'Downloaded study reopened');
 assert.deepEqual((await download('saveStudy')).data,study.data);assert.deepEqual((await download('savePlan')).data,frozen.data);
 await evaluate("document.getElementById('summary').scrollIntoView({block:'center'})");picture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});save('mobile-reopened-contradiction.png',Buffer.from(picture.data,'base64'));
 note('Fresh390px reopen recomputes contradiction from exact downloaded source, prediction and outcome');

 // Authored receiver-only setup cases, separate from the real native popup above.
 const completedSession=sid;
 for(const malformed of [true,false]){
  const target=await cdp('Target.createTarget',{url:'about:blank'},null);
  sid=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  let scriptId;
  try{
   for(const domain of ['Page','DOM','Runtime','Network'])await cdp(domain+'.enable');
   const stored=malformed?'{"authored":"not an investigation"}':JSON.stringify(investigation.data);
   const setup="sessionStorage.setItem('skill-translator.calibration-input',"+JSON.stringify(stored)+");"+(malformed?"":"(()=>{const old=Storage.prototype.removeItem;window.__restoreReceiverControl=()=>{Storage.prototype.removeItem=old};Storage.prototype.removeItem=function(k){if(k==='skill-translator.calibration-input')throw Error('Authored key removal refusal');return old.call(this,k)}})();");
   scriptId=(await cdp('Page.addScriptToEvaluateOnNewDocument',{source:setup})).identifier;
   await cdp('Page.navigate',{url:origin+'/calibration'});await cdp('Target.activateTarget',{targetId:target.targetId},null);
   await wait("document.getElementById('summary')?.dataset.status&&document.getElementById('error').textContent.trim().length>0",'Authored receiver setup settled');
   assert.equal(await evaluate("sessionStorage.getItem('skill-translator.calibration-input')"),stored);
   const received=(await download('exportStudy')).data;
   if(malformed){assert.deepEqual(received.source,defaultDemo);assert.deepEqual(received.observations,[]);assert(await evaluate("document.getElementById('handoffStatus').hidden"));}
   else{assert.deepEqual(received,investigation.data);assert(await evaluate("!document.getElementById('handoffStatus').hidden"));}
   note(malformed?'Authored malformed receiver bundle preserves default source and pending key':'Authored removeItem failure still accepts and exports complete investigation');
  }finally{
   if(scriptId)await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:scriptId});
   await evaluate("window.__restoreReceiverControl?.();delete window.__restoreReceiverControl;sessionStorage.removeItem('skill-translator.calibration-input')");
   await cdp('Target.closeTarget',{targetId:target.targetId},null);sid=completedSession;
  }
 }

 for(const f of report.inputs)assert.equal(sha(fs.readFileSync(path.join(source,f.path))),f.sha256);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.dialogs,[]);assert(report.requests.every(u=>u.startsWith(origin+'/')||u.startsWith('blob:'+origin+'/')));
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
