import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {resolve} from 'node:path';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/feature-judgment-handoff');
await mkdir(out+'/downloads',{recursive:true});
const source={title:'Authored cross-size feature exercise',provenance:'Analytic declarations, not physical evidence',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:50},kind:'fraction',toleranceMm:2},{id:'b',label:'B',sourcePx:{x:40,y:50},kind:'fraction',toleranceMm:2}]};
const comparison={schema:'skill-translator-feature-clearance/v1',assumption:'circular-features-with-independent-euclidean-placement-tolerances',source,features:[{id:'a',radiusMm:5},{id:'b',radiusMm:5}],requiredGapMm:10,workpieces:[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100}]};
const comparisonKey='skill-translator-feature-rehearsal-comparison/v1',returnKey='skill-translator-feature-rehearsal-return/v1';
const file=async(name,value)=>{const path=out+'/'+name;await writeFile(path,typeof value==='string'?value:JSON.stringify(value));return path;};
const comparisonFile=await file('comparison.json',comparison),invalidFile=await file('invalid.json','{ invalid JSON');
const server=process.env.QA_ORIGIN?null:createAppServer();if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.QA_ORIGIN||'http://127.0.0.1:'+server.address().port;
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/,'QA_ORIGIN must name a loopback application instance');
let browser,page,sandbox,downloadSession;const downloads=[],groups=[],errors=[],offsite=[],sourceReceipt=[];const record=value=>{groups.push(value);console.log('PASS '+value);};
const text=id=>page.$eval('#'+id,e=>e.textContent);
const value=(id,v)=>page.$eval('#'+id,(e,x)=>{e.value=String(x);e.dispatchEvent(new Event('input',{bubbles:true}));},v);
const go=async(id)=>{await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#'+id)]);assert.equal(new URL(page.url()).origin,origin);};
async function upload(id,path){await(await page.$('#'+id)).uploadFile(path);await page.waitForFunction(id=>document.getElementById(id).value==='',{},id);}
async function place(id,x,y){await page.select('#markChoice',id);await value('placeX',x);await value('placeY',y);await page.$eval('#placementForm',e=>e.requestSubmit());}
async function exported(id){
 const before=downloads.length;await page.click('#'+id);
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  const item=downloads[before];
  if(item?.state==='completed'){
   const bytes=await readFile(out+'/downloads/'+item.guid);
   item.bytes=bytes.length;item.sha256=createHash('sha256').update(bytes).digest('hex');
   return JSON.parse(bytes);
  }
  if(item?.state==='canceled')throw Error('Actual browser download was canceled: '+id);
  await new Promise(r=>setTimeout(r,25));
 }
 throw Error('Actual browser download did not complete: '+id);
}
const study=()=>exported('saveJudgments'),raw=()=>exported('saveRehearsal');
async function clickPaper(){
 const point=await page.$eval('#rehearsalSheet',svg=>{
  svg.scrollIntoView({block:'center'});
  const paper=svg.querySelector('.rehearsal-paper'),p=svg.createSVGPoint();
  p.x=paper.x.baseVal.value+paper.width.baseVal.value*.6;
  p.y=paper.y.baseVal.value+paper.height.baseVal.value*.45;
  const screen=p.matrixTransform(svg.getScreenCTM()),hit=document.elementFromPoint(screen.x,screen.y);
  if(!hit||!svg.contains(hit))throw Error('Pointer target is not the visible rehearsal SVG');
  return{x:screen.x,y:screen.y};
 });
 await page.mouse.click(point.x,point.y);
}
async function shots(name){for(const width of [1280,390]){await page.setViewport({width,height:960});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:true});}await page.setViewport({width:1280,height:960});}
async function start(){await page.goto(origin+'/feature-clearance',{waitUntil:'networkidle0'});await(await page.$('#bundleFile')).uploadFile(comparisonFile);await page.waitForFunction(()=>!document.getElementById('results').hidden);await go('openFeatureRehearsal');await go('startFeatureRehearsal');}
async function restore(path){await page.goto(origin+'/rehearsal',{waitUntil:'networkidle0'});await upload('openRehearsal',path);await page.waitForFunction(()=>document.getElementById('judgmentHistory').textContent.includes('Keep this original account'));await go('reviewFeatureRehearsal');}

async function diagramState(){
 return page.$eval('#featureRehearsalDiagramContent',host=>{
  const svg=host.querySelector('svg'),v=svg?.viewBox.baseVal,t=svg?.getScreenCTM();
  return {text:host.textContent,keys:[...host.querySelectorAll('.feature-footprint-key li')].map(li=>({key:li.value,text:li.textContent})),svg:svg?{viewBox:[v.x,v.y,v.width,v.height],transform:[t.a,t.b,t.c,t.d],name:svg.querySelector('title')?.textContent,description:svg.querySelector('desc')?.textContent,circles:[...svg.querySelectorAll('.feature-footprint-circle')].map(e=>({id:e.dataset.featureId,x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy')),radius:Number(e.getAttribute('r'))})),labels:[...svg.querySelectorAll('.feature-footprint-id')].map(e=>e.textContent),circleTransforms:[...svg.querySelectorAll('.feature-footprint-circle')].map(e=>{const t=e.getScreenCTM();return[t.a,t.b,t.c,t.d];})}:null};
 });
}
async function expectFootprints(points,bounds){
 const state=await diagramState();assert.ok(state.svg,'Committed review must expose a real feature diagram');
 assert.deepEqual(state.svg.circles,points);const [x,y,w,h]=state.svg.viewBox;
 assert.ok([x,y,w,h].every(Number.isFinite)&&w>0&&h>0);
 assert.ok(x<=bounds[0]&&x+w>=bounds[1]&&y<=bounds[2]&&y+h>=bounds[3],'Independently known complete footprints must fit');
 const [a,b,c,d]=state.svg.transform;assert.ok(a>0&&d>0&&Math.abs(a-d)<1e-9&&Math.abs(b)<1e-9&&Math.abs(c)<1e-9,'Circle geometry must use one physical scale');
 for(const transform of state.svg.circleTransforms)assert.ok(transform.every((n,i)=>Math.abs(n-state.svg.transform[i])<1e-9),'Every footprint must share the uniform effective transform');
 assert.match(state.svg.name,/Declared circular features/);assert.match(state.svg.description,/Numbers identify entries/);assert.match(state.svg.description,/pair table supplies observed and required clearance/);
 return state;
}
async function expectWithheldDiagram(){
 const state=await diagramState();assert.equal(state.svg,null);assert.deepEqual(state.keys,[]);
 assert.equal(state.text,'Commit this trial to view its declared features at the recorded centers.');
}
async function diagramShots(name){
 for(const width of [1280,390]){
  await page.setViewport({width,height:960});await page.$eval('#featureRehearsalDiagram',e=>e.scrollIntoView({block:'start'}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.$eval('#featureRehearsalDiagramContent',e=>e.scrollWidth<=e.clientWidth));
  await(await page.$('#featureRehearsalDiagram')).screenshot({path:out+'/'+name+'-'+width+'.png'});
 }
 await page.setViewport({width:1280,height:960});
}
async function startDiagramComparison(name,bundle){
 const path=await file(name+'-comparison.json',bundle);
 await page.goto(origin+'/feature-clearance',{waitUntil:'networkidle0'});await(await page.$('#bundleFile')).uploadFile(path);await page.waitForFunction(()=>!document.getElementById('results').hidden);await go('openFeatureRehearsal');
 assert.equal(await page.$eval('#featureRehearsalResults',e=>e.hidden),true);assert.equal(await text('featureRehearsalDiagramContent'),'');
 await go('startFeatureRehearsal');
}

try{
 assert.notEqual(process.getuid?.(),0,'Run browser receiving as an ordinary user with the Chrome sandbox enabled.');
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const admissionPage=await browser.newPage(),admissionCDP=await admissionPage.createCDPSession();
 sandbox=await requireChromiumSandbox({send:admissionCDP.send.bind(admissionCDP)});await file('sandbox.json',sandbox);await admissionPage.close();
 downloadSession=await browser.target().createCDPSession();
 downloadSession.on('Browser.downloadWillBegin',e=>downloads.push({...e,state:'started'}));
 downloadSession.on('Browser.downloadProgress',e=>{const item=downloads.find(d=>d.guid===e.guid);if(item)Object.assign(item,e);});
 await downloadSession.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:out+'/downloads',eventsEnabled:true});
 for(const [route,path] of [['/rehearsal','web/rehearsal.html'],['/feature-rehearsal','web/feature-rehearsal.html'],['/web/feature-clearance.css','web/feature-clearance.css'],...['web/rehearsal.mjs','web/feature-rehearsal.mjs','src/rehearsal-judgment.mjs','src/feature-rehearsal.mjs'].map(path=>['/'+path,path])]){
  const response=await fetch(origin+route);assert.equal(response.status,200);
  const served=Buffer.from(await response.arrayBuffer()),local=await readFile(new URL('../'+path,import.meta.url));
  assert.deepEqual(served,local);sourceReceipt.push({path,bytes:served.length,sha256:createHash('sha256').update(served).digest('hex')});
 }
 await file('source-receipt.json',sourceReceipt);
 page=await browser.newPage();await page.setViewport({width:1280,height:960});page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!/^(blob:|data:)/.test(r.url()))offsite.push(r.url());});
 await start();await place('a',22,50);await page.click('#requestTargets');await place('b',38,50);
 await page.select('#judgmentChoice','adequate');await value('judgmentReason','Keep this original account');await page.click('#recordJudgment');
 const original=await study();assert.equal(original.judgments.length,1);assert.equal(original.judgments[0].reason,'Keep this original account');assert.equal(await page.$eval('#placeMark',e=>e.disabled),true);
 await file('judgments-before.json',original);await go('reviewFeatureRehearsal');await page.select('#featureRehearsalTrial','2');assert.equal(await page.$eval('#featureRehearsalTrial',e=>e.value),'2');const selectedReview=await exported('saveFeatureRehearsal');assert.equal(selectedReview.selectedTrial,2);assert.deepEqual(selectedReview.rehearsal,original.rehearsal);
 assert.ok(await page.$('#featureJudgmentContext'),'Feature review must show the selected trial original prediction context');
 assert.equal(await text('featureJudgmentContext'),'No prediction was recorded for this trial in the attached study.');
 await page.select('#featureRehearsalTrial','1');assert.ok((await text('featureJudgmentContext')).includes('Keep this original account'));assert.match(await text('featureJudgmentContext'),/Center result and prediction agreement remain withheld/);assert.doesNotMatch(await text('featureJudgmentContext'),/Your prediction (agreed|differed)/);
 await page.select('#featureRehearsalTrial','2');
 assert.ok(await page.$('#saveFeatureRehearsalJudgments'),'Feature review must offer a direct complete-judgment export');
 await page.setViewport({width:390,height:960});await page.$eval('#saveFeatureRehearsalJudgments',e=>e.scrollIntoView({block:'center'}));
 assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),false);assert.equal((await text('saveFeatureRehearsalJudgments')).trim(),'Export complete judgment study');
 const directBounds=await(await page.$('#saveFeatureRehearsalJudgments')).boundingBox();assert.ok(directBounds&&directBounds.width>0&&directBounds.x>=0&&directBounds.x+directBounds.width<=390);
 const directStudy=await exported('saveFeatureRehearsalJudgments');assert.deepEqual(directStudy,original);
 const directDownload=downloads.at(-1),directStudyPath=out+'/downloads/'+directDownload.guid;assert.equal(directDownload.suggestedFilename,'skill-placement-judgments.json');assert.equal(await readFile(directStudyPath,'utf8'),JSON.stringify(original));
 assert.equal(await page.$eval('#featureRehearsalTrial',e=>e.value),'2');await shots('feature-review');
 await go('resumeFeatureRehearsal');const returned=await study();await file('judgments-after.json',returned);
 assert.deepEqual(returned,original,'Review and Resume must preserve the exact first-judgment study');
 assert.match(await text('judgmentHistory'),/Keep this original account/);
 record('actual feature review, trial selection and resume preserve complete judgments, source, plan, actions and prior help');
 const frozen=await raw();await place('a',31,51);assert.deepEqual(await raw(),frozen);
 await clickPaper();assert.deepEqual(await raw(),frozen);
 await page.$eval('#rehearsalSheet',e=>e.focus());assert.equal(await page.evaluate(()=>document.activeElement.id),'rehearsalSheet');await page.keyboard.press('ArrowRight');assert.deepEqual(await raw(),frozen);assert.equal(await page.$eval('#placeMark',e=>e.disabled),true);
 await page.goto(origin+'/rehearsal',{waitUntil:'networkidle0'});await upload('openRehearsal',directStudyPath);
 assert.deepEqual(await study(),original);assert.match(await text('judgmentHistory'),/Keep this original account/);assert.equal(await page.$eval('#placeMark',e=>e.disabled),true);
 record('recorded judgment blocks coordinate, SVG pointer and keyboard edits; the direct feature export reopens the exact study with its placement lock');
 await page.click('#submitTrial');await page.click('#nextTrial');assert.equal(await page.$eval('#placeMark',e=>e.disabled),false);await place('a',41,50);let before=await raw();
 await page.$eval('#rehearsalSheet',e=>{e.scrollIntoView();e.focus();});await page.keyboard.press('ArrowRight');assert.notDeepEqual(await raw(),before);before=await raw();
 await clickPaper();assert.notDeepEqual(await raw(),before);
 const continued=await study();assert.deepEqual(continued.judgments,original.judgments);assert.ok(continued.rehearsal.events.length>original.rehearsal.events.length);const continuedFile=await file('continued-judgments.json',continued);
 await shots('resumed-rehearsal');record('commit and next sheet preserve old judgments while allowing real coordinate, pointer and keyboard placements');
 await go('reviewFeatureRehearsal');assert.match(await text('featureRehearsalStatus'),/judgments/i);const savedFeature=await exported('saveFeatureRehearsal');assert.equal(savedFeature.schema,'skill-translator-feature-rehearsal/v1');assert.deepEqual(Object.keys(savedFeature).sort(),['comparison','rehearsal','schema','selectedTrial']);assert.deepEqual(savedFeature.rehearsal,continued.rehearsal);const savedFile=await file('saved-feature-review.json',savedFeature);
 for(const id of ['featureRehearsalFile','featureRehearsalReviewFile','rehearsalComparisonFile']){await upload(id,invalidFile);assert.match(await text('featureRehearsalError'),/Input refused/);assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),false);}
 assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),continued);await go('resumeFeatureRehearsal');assert.deepEqual(await study(),continued);
 record('failed raw, review and comparison replacements preserve the companion; feature export retains its existing raw schema');
 await go('reviewFeatureRehearsal');const rawFile=await file('legacy-rehearsal.json',continued.rehearsal);await upload('featureRehearsalFile',rawFile);assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),true);await go('resumeFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual(await raw(),continued.rehearsal);
 await restore(continuedFile);await upload('featureRehearsalReviewFile',savedFile);assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),true);await go('resumeFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual(await raw(),continued.rehearsal);
 record('successful explicit raw and saved-feature imports clear old judgments even when their rehearsal bytes match');
 await restore(continuedFile);await page.select('#featureRehearsalTrial','2');assert.match(await text('featureRehearsalStatus'),/judgments/i);await go('startFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual((await raw()).events,[]);
 await restore(continuedFile);const changedComparison=structuredClone(comparison);changedComparison.source.title='A different declared comparison';const changedFile=await file('changed-comparison.json',changedComparison);await upload('rehearsalComparisonFile',changedFile);assert.equal(await page.$eval('#featureRehearsalResults',e=>e.hidden),true);assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),true);await go('startFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.equal((await raw()).source.title,changedComparison.source.title);
 record('explicit fresh start and successful comparison replacement cannot inherit earlier judgments');
 await page.evaluate(({comparisonKey,returnKey,comparison,rehearsal})=>{sessionStorage.setItem(comparisonKey,JSON.stringify(comparison));sessionStorage.setItem(returnKey,JSON.stringify(rehearsal));},{comparisonKey,returnKey,comparison,rehearsal:continued.rehearsal});await page.goto(origin+'/feature-rehearsal',{waitUntil:'networkidle0'});assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),true);await go('resumeFeatureRehearsal');assert.deepEqual(await raw(),continued.rehearsal);const emptyStudy=await study();assert.deepEqual(emptyStudy.judgments,[]);
 await go('reviewFeatureRehearsal');assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),false);assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),emptyStudy);await go('resumeFeatureRehearsal');assert.deepEqual(await raw(),continued.rehearsal);assert.deepEqual((await study()).judgments,[]);
 record('legacy raw handoff and subsequent actual navigation remain compatible');
 await restore(continuedFile);
 await page.evaluate(()=>{window.__freshNavigationCancelled=false;navigation.addEventListener('navigate',event=>{if(new URL(event.destination.url).pathname==='/rehearsal'){event.preventDefault();window.__freshNavigationCancelled=true;}},{once:true});});
 await page.click('#startFeatureRehearsal');await page.waitForFunction(()=>window.__freshNavigationCancelled===true);
 assert.equal(new URL(page.url()).pathname,'/feature-rehearsal');assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),false);await go('resumeFeatureRehearsal');
 assert.deepEqual(await study(),continued,'Cancelled fresh navigation must retain accepted judgments');
 record('a cancelled fresh navigation leaves accepted judgments available for a subsequent real resume');


 // A real four-sheet course separates center predictions from feature outcomes.
 const multiComparison=structuredClone(comparison);multiComparison.workpieces=[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100},{widthMm:150,heightMm:100},{widthMm:250,heightMm:100}];
 const multiComparisonFile=await file('context-comparison.json',multiComparison),firstReason='Each center is two millimetres from its target.',thirdReason='Third sheet: <em>literal original reason</em>\n'+'λ'.repeat(1100),fourthReason='Fourth sheet remains uncommitted.';
 await page.goto(origin+'/feature-clearance',{waitUntil:'networkidle0'});await(await page.$('#bundleFile')).uploadFile(multiComparisonFile);await page.waitForFunction(()=>!document.getElementById('results').hidden);await go('openFeatureRehearsal');await go('startFeatureRehearsal');
 await place('a',22,50);await place('b',38,50);await page.select('#judgmentChoice','adequate');await value('judgmentReason',firstReason);await page.click('#recordJudgment');await page.click('#submitTrial');await page.click('#nextTrial');
 await place('a',40,50);await place('b',80,50);await page.click('#submitTrial');await page.click('#nextTrial');
 await place('a',30,50);await place('b',60,50);await page.select('#judgmentChoice','uncertain');await value('judgmentReason',thirdReason);await page.click('#recordJudgment');await page.click('#submitTrial');await page.click('#nextTrial');
 await place('a',50,50);await place('b',100,50);await page.select('#judgmentChoice','inadequate');await value('judgmentReason',fourthReason);await page.click('#recordJudgment');
 const multiStudy=await study();assert.equal(multiStudy.judgments.length,3);assert.deepEqual(multiStudy.judgments.map(j=>j.reason),[firstReason,thirdReason,fourthReason]);
 await go('reviewFeatureRehearsal');const contextText=()=>text('featureJudgmentContext');
 assert.equal(await page.$eval('#featureRehearsalTrial',e=>e.value),'1');
 assert.match(await text('featureRehearsalSummary'),/Within all original center tolerances\. Some actual gaps fail/);
 assert.ok((await contextText()).includes(firstReason));assert.match(await contextText(),/Recorded center prediction: Every mark is within tolerance/);assert.match(await contextText(),/Your prediction agreed with the center result/);assert.doesNotMatch(await contextText(),/Your prediction differed/);assert.match(await contextText(),/Feature clearance is assessed separately/);
 assert.match(await text('featureRehearsalPairs'),/Fails declared gap/);const gapCells=await page.$$eval('#featureRehearsalPairs tr:first-child td',cells=>cells.map(e=>e.textContent));assert.equal(gapCells[3],'6');assert.equal(gapCells[4],'10');

 assert.ok(await page.$('#featureRehearsalDiagram'),'Committed feature review must offer a declared-footprint view');
 const beforeDiagramRaw=await exported('saveFeatureRehearsal');
 const mixedDiagram=await expectFootprints([{id:'a',x:22,y:50,radius:5},{id:'b',x:38,y:50,radius:5}],[17,43,45,55]);
 assert.deepEqual(mixedDiagram.svg.labels,['1','2']);assert.match(mixedDiagram.keys[0].text,/a — A: recorded center \(22, 50\) mm; declared radius 5 mm/);assert.match(mixedDiagram.keys[1].text,/b — B/);
 await diagramShots('committed-footprints');
 assert.deepEqual(await exported('saveFeatureRehearsal'),beforeDiagramRaw,'Viewing/resizing must preserve complete raw review inputs');
 for(const id of ['featureRehearsalFile','featureRehearsalReviewFile','rehearsalComparisonFile']){await upload(id,invalidFile);assert.deepEqual(await diagramState(),mixedDiagram);}
 record('actual committed footprints show the center-pass/gap6-versus-required10 case at one scale, with unchanged raw inputs and failed-import retention');
 await shots('center-prediction-feature-context');
 record('the actual committed center-pass and feature-gap-fail case retains the original prediction and center agreement separately');
 const multiExport=await exported('saveFeatureRehearsalJudgments');assert.deepEqual(multiExport,multiStudy);const multiDownloadPath=out+'/downloads/'+downloads.at(-1).guid;
 await page.select('#featureRehearsalTrial','2');await expectFootprints([{id:'a',x:40,y:50,radius:5},{id:'b',x:80,y:50,radius:5}],[35,85,45,55]);assert.equal(await contextText(),'No prediction was recorded for this trial in the attached study.');assert.ok(!(await contextText()).includes(firstReason));
 await page.select('#featureRehearsalTrial','3');await expectFootprints([{id:'a',x:30,y:50,radius:5},{id:'b',x:60,y:50,radius:5}],[25,65,45,55]);assert.match(await contextText(),/Recorded center prediction: I am uncertain/);assert.match(await contextText(),/Uncertainty retained; no agreement score/);assert.doesNotMatch(await contextText(),/Your prediction (agreed|differed)/);
 assert.ok((await contextText()).includes(thirdReason));assert.equal(await page.$eval('#featureJudgmentContext',e=>e.querySelectorAll('em').length),0);
 await page.setViewport({width:390,height:960});await page.$eval('#featureJudgmentContext',e=>e.scrollIntoView({block:'center'}));assert.ok(await page.$eval('#featureJudgmentContext',e=>e.scrollWidth<=e.clientWidth));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await(await page.$('.feature-judgment-context')).screenshot({path:out+'/long-context-390.png'});await page.setViewport({width:1280,height:960});
 record('sparse trial mapping preserves uncertainty and literal long reasons without stale text or narrow-page overflow');
 await page.select('#featureRehearsalTrial','4');await expectWithheldDiagram();assert.ok((await contextText()).includes(fourthReason));assert.match(await contextText(),/Recorded center prediction: At least one mark is outside tolerance/);assert.match(await contextText(),/Center result and prediction agreement remain withheld/);assert.doesNotMatch(await contextText(),/Center result: (Within|Outside)|Your prediction (agreed|differed)/);
 assert.match(await text('featureRehearsalSummary'),/Feedback withheld\. Feedback withheld/);assert.equal(await page.$$eval('#featureRehearsalPairs tr',rows=>rows.length),0);
 assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),multiStudy);
 const beforeFailureContext=await contextText();for(const id of ['featureRehearsalFile','featureRehearsalReviewFile','rehearsalComparisonFile']){await upload(id,invalidFile);assert.equal(await contextText(),beforeFailureContext);}
 const multiRawFile=await file('context-raw.json',multiStudy.rehearsal);await upload('featureRehearsalFile',multiRawFile);assert.equal(await contextText(),'Prediction history is unavailable in this raw review.');
 await page.goto(origin+'/rehearsal',{waitUntil:'networkidle0'});await upload('openRehearsal',multiDownloadPath);await go('reviewFeatureRehearsal');assert.ok((await contextText()).includes(firstReason));assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),multiStudy);
 record('uncommitted feedback stays withheld; failed replacement retains context and actual full-study reopening restores it after raw replacement');
 await page.select('#featureRehearsalTrial','4');await go('resumeFeatureRehearsal');await page.click('#submitTrial');const finalMultiStudy=await study();assert.deepEqual(finalMultiStudy.judgments,multiStudy.judgments);
 await go('reviewFeatureRehearsal');await page.select('#featureRehearsalTrial','4');await expectFootprints([{id:'a',x:50,y:50,radius:5},{id:'b',x:100,y:50,radius:5}],[45,105,45,55]);assert.match(await contextText(),/Center result: Within all original center tolerances/);assert.match(await contextText(),/Your prediction differed from the center result/);assert.ok((await contextText()).includes(fourthReason));assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),finalMultiStudy);
 record('actual later commitment reveals the existing center disagreement without rewriting the original prediction or reason');


 // Supported minimum dimensions, missing marks, coincidence and zero radius.
 const smallSource={title:'Authored minimum-sheet edge case',provenance:'Analytic declarations',source:{widthMm:1,heightMm:1,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'zero',label:'Zero-radius point',sourcePx:{x:25,y:50},kind:'fraction',toleranceMm:.1},{id:'missing',label:'Unplaced middle mark',sourcePx:{x:75,y:50},kind:'fraction',toleranceMm:.1},{id:'circle',label:'Quarter-radius circle',sourcePx:{x:50,y:50},kind:'fraction',toleranceMm:.1}]};
 const small={...structuredClone(comparison),source:smallSource,features:[{id:'circle',radiusMm:.25},{id:'missing',radiusMm:.125},{id:'zero',radiusMm:0}],requiredGapMm:.1,workpieces:[{widthMm:1,heightMm:1},{widthMm:2,heightMm:1}]};
 await startDiagramComparison('minimum',small);
 if(!await page.$eval('#submitTrial',e=>e.disabled)){
  await page.click('#submitTrial');const emptyRaw=await raw();await go('reviewFeatureRehearsal');const empty=await diagramState();assert.equal(empty.svg,null);assert.match(empty.text,/Placed features: 0 of 3/);assert.match(empty.text,/No placed features are available to draw/);assert.equal(empty.keys.length,3);assert.ok(empty.keys.every(k=>k.text.includes('placement missing')&&!k.text.includes('recorded center')));
  assert.equal(await page.$$eval('#featureRehearsalPairs tr',rows=>rows.length),3);assert.ok((await text('featureRehearsalPairs')).includes('Unobserved'));
  assert.deepEqual((await exported('saveFeatureRehearsal')).rehearsal,emptyRaw);await diagramShots('empty-commit');
  record('actual empty commitment shows missing identities without inventing geometry');
  await go('startFeatureRehearsal');
 }else record('actual UI refuses an empty commit; no synthetic submission was injected');
 await place('zero',.5,.5);await place('circle',.5,.5);await page.click('#submitTrial');const smallStudy=await study();await go('reviewFeatureRehearsal');
 const smallRaw=await exported('saveFeatureRehearsal'),smallDiagram=await expectFootprints([{id:'zero',x:.5,y:.5,radius:0},{id:'circle',x:.5,y:.5,radius:.25}],[.25,.75,.25,.75]);
 assert.deepEqual(smallDiagram.keys.map(k=>k.key),[1,2,3]);assert.match(smallDiagram.keys[0].text,/declared radius 0 mm/);assert.match(smallDiagram.keys[1].text,/missing — Unplaced middle mark: placement missing/);assert.match(smallDiagram.keys[2].text,/circle — Quarter-radius circle: recorded center \(0.5, 0.5\) mm; declared radius 0.25 mm/);
 assert.deepEqual(smallDiagram.svg.labels,['*']);assert.match(smallDiagram.text,/Shared center: 1 · zero, 3 · circle/);assert.match(smallDiagram.text,/Coincident footprints may overlap completely/);
 const smallRows=await page.$$eval('#featureRehearsalPairs tr',rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)));assert.equal(smallRows.length,3);const overlap=smallRows.find(r=>r[0]==='zero / circle');assert.equal(overlap[3],'-0.25');assert.equal(overlap[5],'Fails declared gap');assert.equal(smallRows.filter(r=>r[5].startsWith('Unobserved')).length,2);
 await diagramShots('coincident-incomplete');assert.deepEqual(await exported('saveFeatureRehearsal'),smallRaw);assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),smallStudy);
 await page.select('#featureRehearsalTrial','2');await expectWithheldDiagram();await page.select('#featureRehearsalTrial','1');assert.deepEqual((await diagramState()).svg.circles,smallDiagram.svg.circles);
 const smallSaved=await file('minimum-actual-review.json',smallRaw);
 record('real partial commitment retains missing source-order key2, coincident identities and zero radius while preserving signed overlap and unchanged downloads');

 // Full bounds include the small circle extending one millimetre beyond the largest.
 const tallSource={title:'Authored accepted dimensional extremes',provenance:'Analytic declarations',source:{widthMm:1,heightMm:10000,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'large',label:'Maximum-radius footprint',sourcePx:{x:25,y:.01},kind:'fraction',toleranceMm:1},{id:'upper',label:'Far-edge <em>literal</em> '+ 'λ'.repeat(65),sourcePx:{x:75,y:99.99},kind:'fraction',toleranceMm:1}]};
 const tall={...structuredClone(comparison),source:tallSource,features:[{id:'upper',radiusMm:3},{id:'large',radiusMm:10000}],requiredGapMm:0,workpieces:[{widthMm:1,heightMm:10000},{widthMm:2,heightMm:10000}]};
 await startDiagramComparison('maximum',tall);await place('large',.25,1);await place('upper',.75,9999);await page.click('#submitTrial');const tallStudy=await study();await go('reviewFeatureRehearsal');
 const tallRaw=await exported('saveFeatureRehearsal'),tallDiagram=await expectFootprints([{id:'large',x:.25,y:1,radius:10000},{id:'upper',x:.75,y:9999,radius:3}],[-9999.75,10000.25,-9999,10002]);
 assert.match(tallDiagram.keys[0].text,/recorded center \(0.25, 1\) mm; declared radius 10000 mm/);assert.match(tallDiagram.keys[1].text,/recorded center \(0.75, 9999\) mm; declared radius 3 mm/);assert.equal(await page.$$eval('#featureRehearsalDiagramContent em',nodes=>nodes.length),0);
 await diagramShots('maximum-radius');assert.deepEqual(await exported('saveFeatureRehearsal'),tallRaw);assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),tallStudy);
 await upload('featureRehearsalReviewFile',smallSaved);await expectFootprints([{id:'zero',x:.5,y:.5,radius:0},{id:'circle',x:.5,y:.5,radius:.25}],[.25,.75,.25,.75]);assert.doesNotMatch((await diagramState()).text,/Maximum-radius|Far-edge/);
 const uncommittedReplacement=structuredClone(smallRaw);uncommittedReplacement.rehearsal.events=uncommittedReplacement.rehearsal.events.filter(e=>e.type!=='submit');await upload('featureRehearsalReviewFile',await file('minimum-uncommitted-review.json',uncommittedReplacement));await expectWithheldDiagram();
 record('accepted dimension/radius extremes retain every full footprint; different-ID committed and uncommitted replacement retire stale geometry');

 // Two-digit source keys at the right boundary with the accepted maximum mark count.
 const denseSource=structuredClone(smallSource);denseSource.title='Thirty declared point features';denseSource.landmarks=Array.from({length:30},(_,i)=>({id:'m'+String(i+1).padStart(2,'0'),label:'Point '+(i+1),sourcePx:{x:i*100/29,y:50},kind:'fraction',toleranceMm:.1}));
 const dense={...structuredClone(small),source:denseSource,features:denseSource.landmarks.map(m=>({id:m.id,radiusMm:0})),requiredGapMm:0};
 await startDiagramComparison('thirty',dense);for(let i=0;i<30;i++)await place(denseSource.landmarks[i].id,i/29,.5);await page.click('#submitTrial');const denseStudy=await study();await go('reviewFeatureRehearsal');
 const denseDiagram=await expectFootprints(denseSource.landmarks.map((m,i)=>({id:m.id,x:i/29,y:.5,radius:0})),[0,1,.5,.5]);assert.equal(denseDiagram.keys.length,30);assert.deepEqual(denseDiagram.svg.labels,Array.from({length:30},(_,i)=>String(i+1)));
 await diagramShots('thirty-key-boundary');await page.setViewport({width:390,height:960});
 const annotation=await page.$eval('#featureRehearsalDiagramContent svg',svg=>{const node=[...svg.querySelectorAll('text')].find(e=>e.textContent==='30'),a=node.getBoundingClientRect(),b=svg.getBoundingClientRect();return{left:a.left,right:a.right,top:a.top,bottom:a.bottom,svgLeft:b.left,svgRight:b.right,svgTop:b.top,svgBottom:b.bottom};});assert.ok(annotation.left>=annotation.svgLeft&&annotation.right<=annotation.svgRight&&annotation.top>=annotation.svgTop&&annotation.bottom<=annotation.svgBottom);
 await page.setViewport({width:1280,height:960});assert.deepEqual(await exported('saveFeatureRehearsalJudgments'),denseStudy);
 record('maximum thirty-mark source retains all exact keys; the two-digit boundary annotation fits at390px without changing declared zero radii');

 const invalidStudy=structuredClone(original);invalidStudy.rehearsal.events.push({type:'place',id:'a',xMm:19,yMm:50});const invalidText=JSON.stringify(invalidStudy);
 await page.evaluate(({comparisonKey,returnKey,comparison,invalidText})=>{sessionStorage.setItem(comparisonKey,JSON.stringify(comparison));sessionStorage.setItem(returnKey,invalidText);},{comparisonKey,returnKey,comparison,invalidText});await page.goto(origin+'/feature-rehearsal',{waitUntil:'networkidle0'});assert.match(await text('featureRehearsalError'),/Placements freeze/);assert.equal(await page.$eval('#featureRehearsalResults',e=>e.hidden),true);assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),returnKey),invalidText);assert.equal(await page.$eval('#saveFeatureRehearsalJudgments',e=>e.disabled),true);
 record('invalid full judgment history is refused without raw fallback or consuming the recoverable handoff');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 const receipt={ok:true,browser:await browser.version(),uid:process.getuid(),sandbox,sourceReceipt,completedDownloads:downloads.filter(d=>d.state==='completed').length,downloads,groups,errors,offsite,scope:'Authored geometric browser controls, complete-study custody, original-center context and committed declared-footprint views. The numeric pair table supplies clearance judgments; no physical or learning-effect claim.'};
 await writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}catch(e){await writeFile(out+'/failure.json',JSON.stringify({ok:false,groups,error:e.stack,errors,offsite,sandbox,sourceReceipt,downloads},null,2)+'\n');if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
