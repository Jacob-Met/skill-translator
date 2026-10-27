import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createAppServer} from '../server.mjs';
import {validateSequence} from '../src/demonstration-sequence.mjs';
import {createDecisionPractice} from '../src/decision-practice.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';

const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH??'puppeteer');
const executablePath=process.env.CHROME_BINARY??'/usr/bin/google-chrome-stable';
const mode=process.argv[2];
assert(['baseline','candidate'].includes(mode),'Usage: node tools/browser-decision-focus.mjs baseline|candidate');
const root=process.cwd(),out=path.resolve(process.env.RECEIPT_DIR??('docs/receipts/decision-focus-'+mode+'-'+Date.now()));
await fs.mkdir(out,{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const copy=value=>structuredClone(value);
const report={mode,startedAt:new Date().toISOString(),checks:[],sourceHashes:{},downloads:[],pageErrors:[],consoleErrors:[],offsiteRequests:[]};
function pass(name,detail){report.checks.push({name,passed:true,...(detail===undefined?{}:{detail})});}
let server,browser,page,client,origin,downloadNumber=0,bundle,A,B,C,D,fixture,reversedPath,invalidPath;

async function guardFile(filename){const absolute=path.resolve(filename);report.sourceHashes[absolute]=sha(await fs.readFile(absolute));}
async function prepare(){
  const originalPath='docs/receipts/decision-practice-20261024/source.json';
  bundle=JSON.parse(await fs.readFile(originalPath,'utf8'));
  const first=bundle.sequence.steps[0],last=bundle.sequence.steps.at(-1);
  A={...copy(first),id:'focus-a',title:'Authored A'};
  B={...copy(first),id:'focus-b',title:'Authored B',afterMomentId:last.afterMomentId,sensoryCue:'Authored B sensory account'};
  C={...copy(first),id:'focus-c',title:'Authored C',afterMomentId:last.afterMomentId,sensoryCue:'Authored C sensory account'};
  D={...copy(last),id:'focus-d',title:'Authored D'};
  bundle.sequence.steps=[A,B,C,D];bundle.sequence=validateSequence(bundle.sequence);[A,B,C,D]=bundle.sequence.steps;delete bundle.findings;
  fixture=path.join(out,'authored-source.json');reversedPath=path.join(out,'reversed-session.json');invalidPath=path.join(out,'invalid-session.json');
  await fs.writeFile(fixture,JSON.stringify(bundle,null,2));
  await fs.writeFile(reversedPath,JSON.stringify(createDecisionPractice(bundle.sequence,[D.id,B.id],'seen-before'),null,2));
  await fs.writeFile(invalidPath,'{"format":"invalid-receiving-fixture"}');
  for(const filename of [originalPath,fixture,reversedPath,invalidPath,'web/decision-practice.html','web/decision-practice.mjs','src/decision-practice.mjs','src/demonstration-sequence.mjs','server.mjs','tools/browser-decision-focus.mjs','tools/support/chromium-sandbox.mjs'])await guardFile(filename);
  const htmlPath=path.resolve('web/decision-practice.html'),html=await fs.readFile(htmlPath,'utf8');
  for(const tag of html.matchAll(/<link\b[^>]*>/gi)){
    const rel=tag[0].match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1],href=tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if(!rel?.split(/\s+/).includes('stylesheet')||!href)continue;
    assert(!/^(?:[a-z]+:)?\/\//i.test(href),'Unexpected external stylesheet');
    const clean=href.split(/[?#]/)[0],filename=clean.startsWith('/')?path.resolve(root,clean.slice(1)):path.resolve(path.dirname(htmlPath),clean);
    await guardFile(filename);
  }
  report.fixtureScope='Four authored software-control steps using unchanged original retained PNG bytes; no physical demonstration or performance claim';
}
async function upload(selector,filename){const input=await page.$(selector);assert(input,'Missing '+selector);await input.evaluate(node=>{node.value='';});await input.uploadFile(filename);}
async function waitText(text){await page.waitForFunction(value=>document.body.innerText.includes(value),{timeout:10000},text);}
async function titleIs(title){await page.waitForFunction(value=>document.querySelector('#stepTitle')?.textContent===value,{timeout:10000},title);}
async function fill(selector,value){await page.$eval(selector,(node,next)=>{node.value=next;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function openSelection(){const panel=await page.$('#selectionPanel');assert(panel,'Missing selectionPanel');if(!(await panel.evaluate(node=>node.open)))await page.click('#selectionPanel summary');}
async function chosen(){return page.$$eval('#practiceStepChoices input:checked',nodes=>nodes.map(node=>node.value));}
async function choose(ids){
  const wanted=new Set(ids),inputs=await page.$$('#practiceStepChoices input[type="checkbox"]');assert.equal(inputs.length,4);
  for(const input of inputs){const observed=await input.evaluate(node=>({value:node.value,checked:node.checked}));if(observed.checked!==wanted.has(observed.value))await input.click();}
}
async function state(){
  return page.evaluate(()=>{
    const fields={};
    for(const id of ['expectedChange','decisionCue','recovery','uncertain','comparison','reflection','revisedJudgment','remainingQuestion']){
      const node=document.getElementById(id);if(node)fields[id]={value:node.value,checked:node.checked,start:node.selectionStart,end:node.selectionEnd};
    }
    return {fields,title:document.querySelector('#stepTitle')?.textContent,number:document.querySelector('#stepNumber')?.textContent,progress:document.querySelector('#progress')?.textContent,before:document.querySelector('#beforeImage')?.getAttribute('src'),after:document.querySelector('#afterImage')?.getAttribute('src'),revealDisabled:document.querySelector('#reveal')?.disabled,evidence:[...document.querySelectorAll('#evidenceChoices input')].map(node=>({value:node.value,checked:node.checked}))};
  });
}
async function download(selector,label){
  const directory=path.join(out,'download-'+(++downloadNumber)+'-'+label);await fs.mkdir(directory);
  await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
  assert.equal(await page.$eval(selector,node=>node.disabled),false,selector+' unexpectedly disabled');await page.click(selector);
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    const names=(await fs.readdir(directory)).filter(name=>!name.endsWith('.crdownload'));
    if(names.length===1){const filename=path.join(directory,names[0]);try{const bytes=await fs.readFile(filename),data=JSON.parse(bytes.toString('utf8'));report.downloads.push({label,filename,sha256:sha(bytes)});return {filename,data,sha256:sha(bytes)};}catch{}}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('No completed JSON download: '+label);
}
async function expectedFrameHashes(){
  return page.evaluate(async frames=>{
    const result={};
    for(const frame of frames){
      const binary=atob(frame.pngBase64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
      try{
        const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const context=canvas.getContext('2d');context.drawImage(image,0,0);const rgba=context.getImageData(0,0,canvas.width,canvas.height).data,digest=new Uint8Array(await crypto.subtle.digest('SHA-256',rgba));
        result[frame.momentId]={width:canvas.width,height:canvas.height,sha256:[...digest].map(n=>n.toString(16).padStart(2,'0')).join('')};
      }finally{URL.revokeObjectURL(url);}
    }
    return result;
  },bundle.frames);
}
async function imageHashes(selector='#beforeImage, #afterImage'){
  await page.waitForFunction(sel=>{const images=[...document.querySelectorAll(sel)];return images.length===2&&images.every(image=>image.complete&&image.naturalWidth>0);},{timeout:10000},selector);
  return page.$$eval(selector,async images=>{
    const result=[];
    for(const image of images){
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);
      const rgba=context.getImageData(0,0,canvas.width,canvas.height).data,digest=new Uint8Array(await crypto.subtle.digest('SHA-256',rgba));
      result.push({width:canvas.width,height:canvas.height,sha256:[...digest].map(n=>n.toString(16).padStart(2,'0')).join('')});
    }
    return result;
  });
}
function expectedPair(step,hashes){const pair=[hashes[step.beforeMomentId],hashes[step.afterMomentId]];assert(pair.every(Boolean),'Missing reference PNG for '+step.id);return pair;}
async function completeStep(label,step,hashes){
  await titleIs(step.title);await fill('#expectedChange','Expected '+label);await fill('#decisionCue','Cue '+label);await fill('#recovery','Recovery '+label);
  await page.click('#submitPrediction');await page.click('#reveal');assert.deepEqual(await imageHashes(),expectedPair(step,hashes),label+' exact original frame pair');
  await fill('#comparison','unsure');await fill('#reflection','Reflection '+label);await fill('#revisedJudgment','Revised '+label);await fill('#remainingQuestion','Question '+label);
  const evidence=await page.$('#evidenceChoices input[value="before"]');assert(evidence);if(!(await evidence.evaluate(node=>node.checked)))await evidence.click();
  if(label==='B'){
    await page.$eval('#reflection',node=>{node.focus();node.setSelectionRange(2,7);});const draft=await state();
    await choose([A.id,D.id]);assert.deepEqual(await state(),draft);await choose([B.id,D.id]);assert.deepEqual(await state(),draft);
    pass('Pending choices preserve a live reflection, caret, and selected evidence');
  }
  await page.click('#saveReflection');
}
async function reviewPrior(step,hashes,target){
  const historical=await page.$$('#history details.history-evidence');assert.equal(historical.length,1);
  const detail=historical[0];if(!(await detail.evaluate(node=>node.open))){const summary=await detail.$('summary');await summary.click();}
  assert.deepEqual(await imageHashes('#history details.history-evidence img'),expectedPair(step,hashes));
  const link=await detail.$('a.history-return');assert(link);assert.equal(await link.evaluate(n=>n.getAttribute('href')),'#'+target);
  const before=await state();await link.click();await page.waitForFunction(id=>document.activeElement?.id===id,{},target);assert.deepEqual(await state(),before);
}
async function installFileReadProbe(delay){
  await page.evaluate(delayed=>{
    window.__focusReadDone=false;window.__focusReadStarted=false;const original=File.prototype.text;
    window.__restoreFocusFileText=()=>{File.prototype.text=original;};
    File.prototype.text=async function(...args){const value=await original.apply(this,args);window.__focusReadStarted=true;if(delayed)await new Promise(resolve=>{window.__releaseFocusRead=resolve;});window.__focusReadDone=true;return value;};
  },delay);
}
async function finishFileReadProbe(){
  await page.waitForFunction(()=>window.__focusReadDone===true,{timeout:10000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>window.__restoreFocusFileText());
}
async function run(){
  await prepare();server=createAppServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  browser=await puppeteer.launch({executablePath,headless:true});page=await browser.newPage();client=await page.createCDPSession();
  report.sandbox=await requireChromiumSandbox({send:(method,params)=>client.send(method,params)});pass('Sandbox verified before product navigation');
  page.on('pageerror',error=>report.pageErrors.push(String(error)));page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==origin)report.offsiteRequests.push(url);});
  page.on('dialog',dialog=>{report.unexpectedDialog=true;dialog.dismiss();});
  await page.setViewport({width:1280,height:900});await page.goto(origin+'/decision-practice',{waitUntil:'networkidle0'});await upload('#sourceFile',fixture);await waitText('Retained source frames verified');await titleIs(A.title);
  const initial=await download('#saveSession','initial-all');assert.deepEqual(initial.data.stepIds,[A.id,B.id,C.id,D.id]);
  if(mode==='baseline'){
    assert.equal(await page.$('#selectionPanel'),null);assert.equal(await page.$('#startSelected'),null);
    pass('Baseline: four active steps without selected-practice controls');await page.screenshot({path:path.join(out,'baseline.png'),fullPage:true});return;
  }
  const hashes=await expectedFrameHashes();report.originalRGBA=hashes;
  await openSelection();await choose([B.id,D.id]);const pending=await download('#saveSession','pending-selection');
  assert.deepEqual(pending.data,initial.data);assert.equal(pending.sha256,initial.sha256);
  await page.select('#familiarity','seen-before');const pendingFamiliarity=await download('#saveSession','pending-familiarity');
  assert.deepEqual(pendingFamiliarity.data,initial.data);assert.equal(pendingFamiliarity.sha256,initial.sha256);
  pass('Pending choices and familiarity do not mutate the actual exported practice');
  await fill('#expectedChange','UNSAVED A expected change');await fill('#decisionCue','UNSAVED A cue');await fill('#recovery','UNSAVED A recovery');
  const uncertain=await page.$('#uncertain');assert(uncertain);if(!(await uncertain.evaluate(node=>node.checked)))await uncertain.click();
  await page.$eval('#expectedChange',node=>{node.focus();node.setSelectionRange(2,10);});
  const draft=await state();await choose([]);assert.equal(await page.$eval('#startSelected',node=>node.disabled),true);assert.deepEqual(await state(),draft);
  await choose([B.id,D.id]);assert.deepEqual(await state(),draft);pass('Checkbox edits preserve prediction draft/caret; empty selection cannot start');
  await page.click('#reveal');assert.deepEqual(await chosen(),[B.id,D.id]);const revealed=await state();
  for(const id of ['expectedChange','decisionCue','recovery','uncertain']){assert.equal(revealed.fields[id].value,draft.fields[id].value);assert.equal(revealed.fields[id].checked,draft.fields[id].checked);}
  assert.equal(revealed.title,draft.title);pass('Pending choices and draft text survive ordinary reveal render');
  await page.setViewport({width:390,height:844});await openSelection();await choose([]);
  for(const id of [D.id,B.id]){const input=await page.$('#practiceStepChoices input[value="'+id+'"]');assert(input);await input.focus();await page.keyboard.press('Space');}
  assert.deepEqual(await chosen(),[B.id,D.id]);const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(overflow.scroll<=overflow.width+1);
  await page.$eval('#selectionPanel',node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(out,'mobile-pending.png'),fullPage:false});
  await page.click('#startSelected');await titleIs(B.title);const selected=await download('#saveSession','selected-b-d');
  assert.deepEqual(selected.data.stepIds,[B.id,D.id]);assert.deepEqual(selected.data.events,[]);assert.equal(selected.data.priorFamiliarity,'seen-before');
  pass('390px keyboard choices D then B start an empty source-ordered B/D exercise with declared familiarity',overflow);
  await page.setViewport({width:1280,height:900});await completeStep('B',B,hashes);await page.click('#advance');await titleIs(D.title);await reviewPrior(B,hashes,'predictionHeading');
  await completeStep('D',D,hashes);
  const completedSession=await download('#saveSession','completed-session-before-reopen'),complete=await download('#saveComplete','completed-b-d');
  await upload('#completeFile',complete.filename);await waitText('Complete practice reopened');await openSelection();assert.deepEqual(await chosen(),[B.id,D.id]);
  const reopened=await download('#saveSession','reopened-b-d');assert.deepEqual(reopened.data,completedSession.data);assert.equal(reopened.sha256,completedSession.sha256);
  await titleIs(D.title);assert.deepEqual(await imageHashes(),expectedPair(D,hashes));await reviewPrior(B,hashes,'stepTitle');
  const historyText=await page.$eval('#history',node=>node.innerText);for(const text of ['Expected B','Reflection B','Expected D','Reflection D'])assert(historyText.includes(text),'Missing reopened '+text);
  pass('Complete reopen preserves exact session, original B/D frames, and current-step return');
  await upload('#sessionFile',reversedPath);await waitText('Practice reopened');await titleIs(D.title);await openSelection();assert.deepEqual(await chosen(),[B.id,D.id]);
  await completeStep('reversed D',D,hashes);await page.click('#advance');await titleIs(B.title);await reviewPrior(D,hashes,'predictionHeading');
  const reversed=await download('#saveSession','imported-d-b');assert.deepEqual(reversed.data.stepIds,[D.id,B.id]);assert.equal(reversed.data.priorFamiliarity,'seen-before');
  assert(reversed.data.events.length>0);await page.click('#startSelected');await titleIs(B.title);const reordered=await download('#saveSession','new-b-d');
  assert.deepEqual(reordered.data.stepIds,[B.id,D.id]);assert.deepEqual(reordered.data.events,[]);assert.equal(reordered.data.priorFamiliarity,'seen-before');
  pass('Imported D/B order and evidence remain intact until explicit fresh B/D start');
  await openSelection();await choose([C.id]);const beforeFailure=await state();await installFileReadProbe(false);await upload('#sessionFile',invalidPath);await finishFileReadProbe();
  assert.deepEqual(await chosen(),[C.id]);assert.deepEqual(await state(),beforeFailure);pass('Failed session read preserves pending choices and active practice');
  const beforeRace=await state();await installFileReadProbe(true);await upload('#sessionFile',reversedPath);await page.waitForFunction(()=>window.__focusReadStarted===true,{timeout:10000});
  await choose([A.id,C.id]);await page.evaluate(()=>window.__releaseFocusRead());await finishFileReadProbe();assert.deepEqual(await chosen(),[A.id,C.id]);assert.deepEqual(await state(),beforeRace);
  const afterRace=await download('#saveSession','after-stale-read');assert.deepEqual(afterRace.data,reordered.data);assert.equal(afterRace.sha256,reordered.sha256);
  assert.equal(await page.$eval('#startSelected',node=>node.disabled),false);assert.equal(await page.$eval('#sessionFile',node=>node.disabled),false);
  pass('New choice rejects an older valid delayed import, clears busy state, and preserves exported work');
  await upload('#sessionFile',reversedPath);await waitText('Practice reopened');await titleIs(D.title);await openSelection();assert.deepEqual(await chosen(),[B.id,D.id]);pass('Successful session replacement resets pending choices');
  await choose([C.id]);await upload('#sourceFile',fixture);await waitText('Retained source frames verified');await titleIs(A.title);await openSelection();assert.deepEqual(await chosen(),[A.id,B.id,C.id,D.id]);
  const acceptedRaw=await download('#saveSession','raw-source-reset-all');assert.deepEqual(acceptedRaw.data.stepIds,[A.id,B.id,C.id,D.id]);pass('Successful raw-source replacement resets selection to all');
  await choose([B.id,D.id]);await page.click('#startSelected');await titleIs(B.title);await page.click('#restart');await titleIs(A.title);
  const restarted=await download('#saveSession','restart-all');assert.deepEqual(restarted.data.stepIds,[A.id,B.id,C.id,D.id]);assert.deepEqual(restarted.data.events,[]);assert.equal(restarted.data.priorFamiliarity,'seen-before');
  pass('Existing restart-all restores every source decision with explicit familiarity');
  await page.screenshot({path:path.join(out,'candidate-final.png'),fullPage:true});
}
try{await run();assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.offsiteRequests,[]);assert(!report.unexpectedDialog);report.passed=true;}
catch(error){report.passed=false;report.error=error.stack??String(error);process.exitCode=1;if(error.receipt)report.sandbox=error.receipt;if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
finally{
  report.hashGuardFailures=[];
  for(const [filename,expected]of Object.entries(report.sourceHashes)){try{const actual=sha(await fs.readFile(filename));if(actual!==expected)report.hashGuardFailures.push({filename,expected,actual});}catch(error){report.hashGuardFailures.push({filename,error:String(error)});}}
  if(report.hashGuardFailures.length){report.passed=false;process.exitCode=1;}
  if(browser)await browser.close().catch(error=>{report.browserCloseError=String(error);report.passed=false;process.exitCode=1;});
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,report:path.join(out,'report.json'),error:report.error,hashGuardFailures:report.hashGuardFailures}));
}
