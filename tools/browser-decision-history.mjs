import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,readdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createAppServer} from '../server.mjs';
import {validateSequence} from '../src/demonstration-sequence.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const mode=process.argv[2]||'candidate';assert.ok(['baseline','nav-baseline','candidate','maintained'].includes(mode));
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/decision-history-'+mode);
await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile(new URL('../docs/receipts/decision-practice-20261024/source.json',import.meta.url),'utf8'));
const [first,last]=source.sequence.steps;
source.sequence.title='Historical evidence receiving — authored software control';
source.sequence.context='Synthetic receiving course reusing three original retained PNGs; no measured expert performance or learning result.';
source.sequence.steps=[{...first,title:'First authored decision',intent:'Inspect the blue marker after the red state'},{...first,id:'step-history-longer-span',afterMomentId:last.afterMomentId,title:'Second authored decision across the longer interval',intent:'Inspect the green result across the longer interval',visibleChange:'The authored frame changes from red to green',sensoryCue:'An authored visual cue for the longer interval',recoveryCue:'Pause and inspect the original green frame'},{...last,title:'Current third authored decision'}];
source.sequence=validateSequence(source.sequence);delete source.findings;
const sourcePath=resolve(out,'source.json');await writeFile(sourcePath,JSON.stringify(source));
const replacement=structuredClone(source);replacement.sequence.title='Different accepted authored account';replacement.sequence.steps[0].intent='A distinct replacement interpretation';replacement.sequence=validateSequence(replacement.sequence);
const replacementPath=resolve(out,'replacement-source.json');await writeFile(replacementPath,JSON.stringify(replacement));
const digest=x=>createHash('sha256').update(x).digest('hex');
const report={mode,startedAt:new Date().toISOString(),qualification:'Authored software receiving with original PNG assets; no measured expert, physical skill or learning claim.',checks:[],errors:[],offsite:[],downloads:[],sourceSha256:digest(await readFile(sourcePath)),replacementScope:'Distinct title/account; original PNG assets unchanged',sourceHashes:{}};
const sourcePaths=['server.mjs','web/decision-practice.mjs','web/decision-practice.html','web/decision-practice.css','web/styles.css','web/sequence-input.mjs','web/image-input.mjs','web/decision-practice-input.mjs','web/decision-handoff.mjs','src/decision-practice.mjs','src/demonstration-sequence.mjs','src/frame-origin.mjs','tools/support/chromium-sandbox.mjs','tools/browser-decision-history.mjs'];
for(const name of sourcePaths)report.sourceHashes[name]=digest(await readFile(new URL('../'+name,import.meta.url)));
let server,browser,page,origin,downloadNumber=0;
const originals=[];let documentRequests=0;
const record=(name,data={})=>{report.checks.push({name,...data});console.log(name);};
const fill=(selector,value)=>page.$eval(selector,(e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
const status=part=>page.waitForFunction(part=>document.getElementById('status').textContent.includes(part),{timeout:10000},part);
const upload=async(selector,name)=>{const e=await page.$(selector);assert.ok(e,selector);await e.uploadFile(name);};
const state=()=>page.evaluate(()=>{
 const fields={};for(const id of ['expectedChange','decisionCue','recovery','uncertain','comparison','reflection','revisedJudgment','remainingQuestion']){const e=document.getElementById(id);fields[id]={value:e.value,checked:e.checked,selectionStart:e.selectionStart,selectionEnd:e.selectionEnd,disabled:e.disabled};}
 return {fields,step:document.getElementById('stepNumber').textContent,title:document.getElementById('stepTitle').textContent,progress:document.getElementById('progress').textContent,before:document.getElementById('beforeImage').getAttribute('src'),after:document.getElementById('afterImage').getAttribute('src'),afterHidden:document.getElementById('afterFigure').hidden,accountHidden:document.getElementById('account').hidden,revealDisabled:document.getElementById('reveal').disabled,evidence:[...document.querySelectorAll('#evidenceChoices input')].map(e=>({value:e.value,checked:e.checked}))};
});
async function download(selector,label){
 assert.equal(await page.$eval(selector,e=>e.disabled),false,'Export checkpoint must have no draft');
 const folder=await mkdtemp(resolve(out,'download-'+(++downloadNumber)+'-')),cdp=await page.createCDPSession();
 try{await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder});await page.click(selector);
 const deadline=Date.now()+15000;while(Date.now()<deadline){const files=await readdir(folder),done=files.filter(n=>!n.endsWith('.crdownload')&&!n.endsWith('.tmp'));
 if(done.length===1&&!files.some(n=>n.endsWith('.crdownload'))){const bytes=await readFile(resolve(folder,done[0]));let data;try{data=JSON.parse(bytes);}catch{await new Promise(r=>setTimeout(r,50));continue;}
 const filename=resolve(out,label+'.json');await writeFile(filename,bytes);report.downloads.push({label,filename,bytes:bytes.length,sha256:digest(bytes)});return {filename,data};}
 await new Promise(r=>setTimeout(r,50));}throw Error('Download timed out: '+selector);
 }finally{await cdp.detach();}
}
async function imageHashes(selector){
 await page.waitForFunction(sel=>{const imgs=[...document.querySelectorAll(sel)];return imgs.length===2&&imgs.every(i=>i.complete&&i.naturalWidth>0);},{timeout:10000},selector);
 return page.$$eval(selector,async imgs=>{const out=[];for(const img of imgs){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);const rgba=x.getImageData(0,0,c.width,c.height).data,h=await crypto.subtle.digest('SHA-256',rgba);out.push({width:c.width,height:c.height,rgbaSha256:[...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join('')});}return out;});
}
async function retainStep(suffix){
 await fill('#expectedChange','Recorded expected change '+suffix);await fill('#decisionCue','Recorded cue '+suffix);await fill('#recovery','Recorded recovery '+suffix);
 await page.click('#submitPrediction');await page.click('#reveal');await fill('#comparison','unsure');await fill('#reflection','Recorded reflection '+suffix);
 await page.click('#evidenceChoices input[value="before"]');await fill('#revisedJudgment','Recorded revised judgment '+suffix);await fill('#remainingQuestion','Recorded remaining question '+suffix);await page.click('#saveReflection');
}
async function inspect(index,suffix){
 const sections=await page.$$('#history details.history-evidence'),section=sections[index];assert.ok(section,'Missing history '+index);const summary=await section.$('summary');
 await summary.focus();if(await section.evaluate(e=>e.open))await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await page.$$eval('#history details.history-evidence',els=>els.forEach(e=>e.removeAttribute('data-receiving-selected')));
 await section.evaluate(e=>e.setAttribute('data-receiving-selected','true'));
 const hashes=await imageHashes('#history details[data-receiving-selected] img');assert.deepEqual(hashes,originals[index]);
 const observed=await section.evaluate(e=>({account:e.querySelector('dl').innerText,captions:[...e.querySelectorAll('figcaption')].map(n=>n.textContent),article:e.closest('article').innerText}));
 const step=source.sequence.steps[index];assert.ok(observed.account.includes(step.intent));assert.ok(observed.account.includes(step.recoveryCue));
 if(!step.sensoryCue)assert.match(observed.account,/Not supplied by the author/);
 for(const [j,id]of [step.beforeMomentId,step.afterMomentId].entries()){const moment=source.sequence.moments.find(m=>m.id===id);assert.ok(observed.captions[j].includes(moment.label));assert.ok(observed.captions[j].includes(moment.origin.mediaTimeSeconds.toFixed(3)+' s'));}
 assert.ok(observed.article.includes('Recorded expected change '+suffix));assert.ok(observed.article.includes('Recorded reflection '+suffix));
 await summary.focus();await page.keyboard.press('Enter');assert.equal(await section.evaluate(e=>e.open),false);
 return {index,hashes,account:observed.account,captions:observed.captions};
}
async function reviewBoth(){assert.equal(await page.$$eval('#history details.history-evidence',e=>e.length),2);const a=await inspect(0,'first'),b=await inspect(1,'span');await inspect(0,'first');assert.notDeepEqual(originals[0],originals[1]);assert.notEqual(a.account,b.account);return [a,b];}
async function openFirst(){const e=await page.$('#history details.history-evidence summary');await e.focus();const open=await e.evaluate(n=>n.parentElement.open);if(!open)await page.keyboard.press('Enter');}

async function returnToCurrent(kind,activation,{history=false}={}){
 const before=await state();await openFirst();
 const section=await page.$('#history details.history-evidence[open]'),link=await section.$('a.history-return');assert.ok(link,'Missing return route');
 const links=await page.$$eval('#history details.history-evidence',items=>items.map(e=>[...e.querySelectorAll('a.history-return')].map(a=>({href:a.getAttribute('href'),download:a.hasAttribute('download'),label:a.textContent}))));
 assert.equal(links.length,2);for(const group of links){assert.equal(group.length,1);assert.equal(group[0].download,false);assert.ok(group[0].href.startsWith('#'));}
 const href=await link.evaluate(a=>a.getAttribute('href')),id=decodeURIComponent(href.slice(1));
 const expected=await page.$eval(kind==='prediction'?'#predictionForm h3':kind==='reflection'?'#reflectionForm h3':'#stepTitle',e=>e.id);assert.equal(id,expected);
 assert.match(await link.evaluate(a=>a.textContent),new RegExp('Return to your current '+kind));
 const requests=documentRequests;await page.evaluate(()=>{window.historyReceivingToken='kept-through-native-fragments';});
 if(activation==='keyboard'){await link.focus();await page.keyboard.press('Enter');}else await link.click();
 await page.waitForFunction(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return location.hash==='#'+id&&document.activeElement===e&&r.top>=-1&&r.bottom<=innerHeight+1;},{timeout:5000},id);
 assert.deepEqual(await state(),before);assert.equal(await section.evaluate(e=>e.open),true);
 if(kind!=='step'){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),kind==='prediction'?'expectedChange':'comparison');assert.deepEqual(await state(),before);}
 if(history){await page.goBack({waitUntil:'domcontentloaded',timeout:5000});assert.deepEqual(await state(),before);await page.goForward({waitUntil:'domcontentloaded',timeout:5000});assert.equal(await page.evaluate(()=>location.hash),'#'+id);assert.deepEqual(await state(),before);assert.equal(await page.evaluate(()=>window.historyReceivingToken),'kept-through-native-fragments');}
 assert.equal(documentRequests,requests,'Fragment navigation must not request a new document');record('Native '+kind+' return preserves draft, focus destination and same-document state',{activation,historyChecked:history,target:id});
}

try{
 server=createAppServer();await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});origin='http://127.0.0.1:'+server.address().port;
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome-stable',headless:true,timeout:20000});page=await browser.newPage();
 const cdp=await page.createCDPSession();report.sandbox=await requireChromiumSandbox({send:(m,p)=>cdp.send(m,p)});await cdp.detach();record('Owned Chromium sandbox admitted before product navigation');
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documentRequests++;const u=new URL(r.url());if(['http:','https:','ws:','wss:'].includes(u.protocol)&&u.origin!==origin)report.offsite.push(r.url());});
 await page.setViewport({width:1280,height:900});await page.goto(origin+'/decision-practice',{waitUntil:'networkidle0'});await upload('#sourceFile',sourcePath);await status('Retained source frames verified');
 assert.equal(await page.$$eval('#history details.history-evidence',e=>e.length),0);assert.equal(await page.$eval('#afterFigure',e=>e.hidden),true);
 await retainStep('first');originals[0]=await imageHashes('#beforeImage, #afterImage');await page.click('#advance');
 await retainStep('span');originals[1]=await imageHashes('#beforeImage, #afterImage');await page.click('#advance');report.originals=originals;
 const clean=await state(),before=await download('#saveSession','session-before-review');assert.ok(Array.isArray(before.data.events));assert.equal(before.data.events.length,8);
 if(mode==='nav-baseline'){
  await page.setViewport({width:390,height:844});await fill('#expectedChange','UNSAVED third-step prediction');await openFirst();await imageHashes('#history details.history-evidence[open] img');
  const gap=await page.evaluate(()=>{const details=document.querySelector('#history details.history-evidence[open]'),heading=document.querySelector('#predictionForm h3');return {returnLinks:details.querySelectorAll('a[href^="#"]').length,pixelsFromActiveHeadingToHistoryEnd:details.getBoundingClientRect().bottom-heading.getBoundingClientRect().top,viewportHeight:innerHeight};});
  assert.equal(gap.returnLinks,0);assert.ok(gap.pixelsFromActiveHeadingToHistoryEnd>gap.viewportHeight);record('Navigation baseline: open historical evidence has no direct return to active prediction',gap);await page.screenshot({path:resolve(out,'navigation-baseline.png'),fullPage:true});
 }else if(mode==='baseline'){
  await fill('#expectedChange','UNSAVED third-step prediction');assert.equal(await page.$$eval('#history details, #history img',e=>e.length),0);
  record('Baseline gap reproduced: completed responses persist, but original prior frames cannot be reopened');await page.screenshot({path:resolve(out,'baseline-gap.png'),fullPage:true});
 }else{
  const reviewed=await reviewBoth();assert.deepEqual(await state(),clean);await returnToCurrent('prediction','keyboard');assert.deepEqual(await state(),clean);const after=await download('#saveSession','session-after-review');assert.deepEqual(after.data,before.data);
  record('Two distinct prior original frame pairs/accounts and retained responses match; actual session download unchanged by review',{reviewed});
  await fill('#expectedChange','UNSAVED third-step prediction');await fill('#decisionCue','UNSAVED current cue');await fill('#recovery','UNSAVED current recovery');
  await page.$eval('#uncertain',e=>{e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.$eval('#expectedChange',e=>{e.focus();e.setSelectionRange(8,15);});const draft=await state();
  assert.equal(await page.$eval('#saveSession',e=>e.disabled),true);await reviewBoth();assert.deepEqual(await state(),draft);record('Switching earlier evidence preserves unsubmitted prediction, selection, uncertainty and current reveal boundary');
  await openFirst();await page.screenshot({path:resolve(out,'desktop.png'),fullPage:true});
  await page.setViewport({width:390,height:844});await reviewBoth();assert.deepEqual(await state(),draft);await openFirst();
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.width+1);await page.screenshot({path:resolve(out,'mobile.png'),fullPage:true});record('Native keyboard disclosure and 390px layout preserve the current draft',overflow);await returnToCurrent('prediction','pointer',{history:true});await page.screenshot({path:resolve(out,'return-mobile.png'),fullPage:false});await page.setViewport({width:1280,height:900});
  await page.click('#submitPrediction');await page.click('#reveal');await fill('#comparison','different');await fill('#reflection','UNSAVED third reflection');
  await page.click('#evidenceChoices input[value="after"]');await fill('#revisedJudgment','UNSAVED revised judgment');await fill('#remainingQuestion','UNSAVED remaining question');await page.$eval('#reflection',e=>{e.focus();e.setSelectionRange(2,9);});
  const reflectionDraft=await state();await reviewBoth();assert.deepEqual(await state(),reflectionDraft);record('Historical review preserves live reflection text, selection and chosen evidence');await returnToCurrent('reflection','keyboard');
  await page.click('#saveReflection');await reviewBoth();await returnToCurrent('step','keyboard');const complete=await download('#saveComplete','complete-practice');await upload('#completeFile',complete.filename);await status('Complete practice reopened');
  await reviewBoth();record('Actual complete-practice download reopens original pixels, accounts and retained actions');
  await page.click('#restart');assert.equal(await page.$$eval('#history details.history-evidence',e=>e.length),0);await upload('#sessionFile',before.filename);await status('Practice reopened');
  await reviewBoth();record('Restart invalidates old disclosure; original saved session restores its exact prior associations');
  await upload('#sourceFile',replacementPath);await status('Retained source frames verified');assert.equal(await page.$$eval('#history details.history-evidence',e=>e.length),0);
  const history=await page.$eval('#history',e=>e.innerText);assert.ok(!history.includes('Recorded expected change first'));assert.ok(!history.includes('Recorded expected change span'));assert.match(await page.$eval('#sourceContext',e=>e.textContent),/Different accepted authored account/);
  record('Distinct accepted source account clears previous disclosure and responses');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);for(const [name,hash]of Object.entries(report.sourceHashes))assert.equal(digest(await readFile(new URL('../'+name,import.meta.url))),hash,'Source changed during receiving: '+name);
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e.stack;process.exitCode=1;if(e.receipt)report.sandbox=e.receipt;if(page)await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{});
}finally{report.finishedAt=new Date().toISOString();if(browser)await browser.close();if(server?.listening)await new Promise(ok=>server.close(ok));await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,error:report.error,checks:report.checks.length,receipt:resolve(out,'browser-receipt.json')}));}
