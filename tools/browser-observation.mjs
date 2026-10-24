// Real-browser course; all images are authored projective controls, not photos.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const controls=resolve(process.env.OBSERVATION_CONTROLS||join(root,'test/fixtures/learner-observation'));
const expected=JSON.parse(await readFile(controls+'/expected.json','utf8'));
for(const fixture of Object.values(expected.cases)){const bytes=await readFile(join(controls,fixture.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256);assert.equal(bytes.length,fixture.bytes);}
const out=resolve(process.env.QA_OUTPUT||'.receipts/learner-observation');await mkdir(out,{recursive:true});
const server=createAppServer();let browser;const errors=[],offsite=[],report={result:'FAIL',evidence:expected.evidence,fixtures:Object.values(expected.cases).map(c=>({file:c.file,sha256:c.sha256})),tests:[]};
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});const origin='http://127.0.0.1:'+server.address().port;
const INPUT='skill-translator-observation-input/v1',RESULT='skill-translator-observation-result/v1';
const demo={title:'Independent learner image control',provenance:expected.evidence,
 source:{widthMm:200,heightMm:100,corners:[{x:0,y:0},{x:400,y:0},{x:400,y:200},{x:0,y:200}]},
 landmarks:[{id:'guide',label:'Guide',kind:'fraction',sourcePx:{x:40,y:100},toleranceMm:2},{id:'center',label:'Center',kind:'fraction',sourcePx:{x:200,y:100},toleranceMm:2}]};
const note=name=>report.tests.push(name);
async function download(page,selector,name){
 const dir=await mkdtemp(join(out,'download-')),cdp=await page.createCDPSession();
 try{await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click(selector);
  for(let i=0;i<100;i++){try{return JSON.parse(await readFile(join(dir,name),'utf8'));}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}await new Promise(ok=>setTimeout(ok,100));}
  throw Error('Actual browser download did not complete: '+name);
 }finally{await cdp.detach();}
}
async function assertPractice(page,{round,placed,state,history}){
 assert.match(await page.$eval('#roundLabel',e=>e.textContent),new RegExp(String(round).padStart(2,'0')));
 assert.equal(await page.$$eval('.placed-point',es=>es.length),placed);
 assert.equal(await page.$eval('#practiceView',e=>e.value),'mirrored');
 assert.equal(await page.$eval('#practiceGoals',e=>e.checked),false);
 assert.equal(await page.$$eval('.practice-goal',es=>es.length),0);
 assert.equal(await page.$$eval('#historyRows .history-round',es=>es.length),history);
 if(state)assert.equal(await page.$eval('#taskOutcome',e=>e.dataset.state),state);
}
async function enterObservation(page){await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#observeAttempt')]);assert.equal(new URL(page.url()).pathname,'/observe-attempt');}

try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const p=await browser.newPage();await p.setViewport({width:1280,height:1000});p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))offsite.push(r.url());});
 await p.evaluateOnNewDocument(key=>{window.__arrival=sessionStorage.getItem(key);},RESULT);
 await p.goto(origin+'/',{waitUntil:'networkidle0'});
 const setup=await p.evaluate(async({demo,key})=>{const {createPractice,placePractice}=await import('/src/practice.mjs');let session=createPractice(demo,300,200);session=placePractice(demo,300,200,session,'guide',{xMm:42,yMm:88});const setup={demo,widthMm:300,heightMm:200,session,selected:'guide',reviewed:false,mirrored:true,showGoals:false};sessionStorage.setItem(key,JSON.stringify(setup));return setup;},{demo,key:RESULT});
 await p.goto(origin+'/practice?resume=observation',{waitUntil:'networkidle0'});await assertPractice(p,{round:1,placed:1,state:'in-progress',history:0});await enterObservation(p);assert.deepEqual(await p.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),INPUT),setup);note('actual practice Observe button transfers validated existing session and mirrored hidden-goal preferences');await(await p.$('#imageFile')).uploadFile(controls+'/observation-a.png');await p.waitForFunction(()=>document.getElementById('imageLabel').textContent.startsWith('Paired:'));
 await p.select('#evidenceClass','authored-image-control');await p.evaluate(corners=>{corners.forEach((c,i)=>{document.getElementById('cx'+i).value=c.rawPixel[0];document.getElementById('cy'+i).value=c.rawPixel[1];});},expected.corners);await p.click('#calibrate');
 for(const [id,v]of Object.entries(expected.cases.A.observations)){await p.select('#mark',id);await p.evaluate(pixel=>{document.getElementById('pixelX').value=pixel[0];document.getElementById('pixelY').value=pixel[1];document.getElementById('pointForm').requestSubmit();},v.rawPixel);}
 assert.equal(await p.$eval('#outcome',e=>e.dataset.state),'needs-adjustment');assert.match(await p.$eval('[data-id=guide]',e=>e.textContent),/36.000, 96.000 mm.*7.211 mm/);note('actual authored PNG and rational pixels yield conditional 6,-4 mm error without correction');
 await p.screenshot({path:out+'/desktop.png',fullPage:true});
 const bundle=await download(p,'#saveObservation','learner-observation.json');
 assert.deepEqual(bundle.observation.points.map(x=>x.pixel),Object.values(expected.cases.A.observations).map(v=>({x:v.rawPixel[0],y:v.rawPixel[1]})));assert.equal(bundle.observation.image.sha256,expected.cases.A.sha256);assert.equal(bundle.observation.evidenceClass,'authored-image-control');assert.deepEqual(bundle.setup.session,setup.session);await writeFile(out+'/notebook.json',JSON.stringify(bundle));note('export retains exact raw image identity/calibration/pixels/class and earlier practice round');
 const bad=structuredClone(bundle);bad.observation.calibration.widthMm=301;await writeFile(out+'/invalid.json',JSON.stringify(bad));await(await p.$('#openObservation')).uploadFile(out+'/invalid.json');await p.waitForFunction(()=>!document.getElementById('error').hidden);assert.equal(await p.$eval('#outcome',e=>e.dataset.state),'needs-adjustment');assert.equal(await p.$eval('#applyObservation',e=>e.disabled),false);note('invalid notebook replacement preserves paired image and existing review');
 await(await p.$('#openObservation')).uploadFile(out+'/notebook.json');await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Notebook reopened'));assert.equal(await p.$eval('#applyObservation',e=>e.disabled),true);
 await(await p.$('#imageFile')).uploadFile(controls+'/observation-c.png');await p.waitForFunction(()=>document.getElementById('error').textContent.includes('does not match'));assert.equal(await p.$eval('#applyObservation',e=>e.disabled),true);
 await(await p.$('#imageFile')).uploadFile(controls+'/observation-a.png');await p.waitForFunction(()=>!document.getElementById('applyObservation').disabled);note('reopen recomputes raw coordinates, requires exact image re-pair and rejects alternate authored bytes');
 await p.setViewport({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/mobile.png',fullPage:true});await p.setViewport({width:320,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));note('390px and 320px viewports have no horizontal overflow');
 await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.click('#applyObservation')]);assert.equal(new URL(p.url()).pathname,'/practice');const result=await p.evaluate(()=>JSON.parse(window.__arrival));assert.equal(result.session.round,2);assert.deepEqual(result.session.history[0].attempts,setup.session.attempts);assert.deepEqual(result.session.photoObservation.points,bundle.observation.points);assert.equal(result.mirrored,true);assert.equal(result.showGoals,false);await assertPractice(p,{round:2,placed:2,state:'needs-adjustment',history:1});assert.match(await p.$eval('#photoProvenance',e=>e.textContent),/Authored image control/);assert.match(await p.$eval('#photoProvenance',e=>e.textContent),new RegExp(expected.cases.A.sha256));note('apply restores actual practice DOM, raw photo evidence, earlier placements and display preferences');
 const nextBundle=structuredClone(bundle);nextBundle.setup.mirrored=false;nextBundle.setup.showGoals=true;nextBundle.observation.image={...nextBundle.observation.image,sha256:expected.cases.B.sha256,name:'observation-b.png'};nextBundle.observation.points=Object.entries(expected.cases.B.observations).map(([id,v])=>({id,pixel:{x:v.rawPixel[0],y:v.rawPixel[1]}}));await writeFile(out+'/corrected-notebook.json',JSON.stringify(nextBundle));
 await enterObservation(p);await(await p.$('#openObservation')).uploadFile(out+'/corrected-notebook.json');await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Notebook reopened'));
 await(await p.$('#imageFile')).uploadFile(controls+'/observation-c.png');await p.waitForFunction(()=>document.getElementById('error').textContent.includes('does not match'));assert.equal(await p.$eval('#applyObservation',e=>e.disabled),true);
 await(await p.$('#imageFile')).uploadFile(controls+'/observation-b.png');await p.waitForFunction(()=>!document.getElementById('applyObservation').disabled);assert.equal(await p.$eval('#outcome',e=>e.dataset.state),'within');await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.click('#applyObservation')]);const corrected=await p.evaluate(()=>JSON.parse(window.__arrival));assert.equal(corrected.session.round,3);assert.equal(corrected.mirrored,result.mirrored);assert.equal(corrected.showGoals,result.showGoals);assert.deepEqual(corrected.session.history[0],result.session.history[0]);assert.deepEqual(corrected.session.history[1].photoObservation,result.session.photoObservation);assert.deepEqual(corrected.session.history[1].attempts,result.session.attempts);await assertPractice(p,{round:3,placed:2,state:'passed',history:2});assert.match(await p.$eval('#historyRows',e=>e.textContent),new RegExp(expected.cases.A.sha256));note('older observation notebook preserves active later history and actual DOM preferences; new photo archives current round; same-geometry wrong bytes rejected');
 await p.click('#practiceMarks button[data-id="guide"]');await p.evaluate(()=>{document.getElementById('placementX').value='31';document.getElementById('placementY').value='100';document.getElementById('placementForm').requestSubmit();});
 assert.match(await p.$eval('#placementResults [data-id="guide"] .placement-origin',e=>e.textContent),/Manual placement; the original photo pixel is retained/);assert.match(await p.$eval('#photoProvenance',e=>e.textContent),/manually overridden/);
 const edited=await download(p,'#savePractice','skill-practice-session.json');assert.deepEqual(edited.detachedPhotoMarks,['guide']);assert.deepEqual(edited.photoObservation,corrected.session.photoObservation);assert.equal(edited.attempts.find(a=>a.id==='guide').xMm,31);assert.deepEqual(edited.history,corrected.session.history);note('actual manual placement UI detaches only edited claim; real practice export retains original photo pixels and earlier history');
 await p.click('#retryTask');await assertPractice(p,{round:4,placed:0,state:'in-progress',history:3});assert.match(await p.$eval('#historyRows',e=>e.textContent),/manually overridden/);const archived=await download(p,'#savePractice','skill-practice-session.json');assert.deepEqual(archived.history[2].photoObservation,edited.photoObservation);assert.deepEqual(archived.history[2].detachedPhotoMarks,['guide']);assert.deepEqual(archived.history[2].attempts,edited.attempts);assert.deepEqual(archived.attempts,[]);note('actual retry and exported raw round history retain photo identity/pixels and manual overrides');
 await enterObservation(p);const returning=await p.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),INPUT);await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.click('#returnPractice')]);assert.deepEqual(await p.evaluate(()=>JSON.parse(window.__arrival)),returning);await assertPractice(p,{round:4,placed:0,state:'in-progress',history:3});assert.deepEqual(await download(p,'#savePractice','skill-practice-session.json'),archived);note('return without applying restores exact incoming current/history state and actual practice DOM');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);note('no browser exceptions or external requests');report.result='PASS';console.log(JSON.stringify(report,null,2));
}catch(e){report.failure=e.stack||String(e);throw e;}finally{report.errors=errors;report.offsite=offsite;try{if(browser)await browser.close();}finally{if(server.listening)await new Promise(ok=>server.close(ok));await writeFile(out+'/browser-receipt.json',JSON.stringify(report,null,2)+'\n');}}
