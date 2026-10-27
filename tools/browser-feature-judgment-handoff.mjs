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
try{
 assert.notEqual(process.getuid?.(),0,'Run browser receiving as an ordinary user with the Chrome sandbox enabled.');
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const admissionPage=await browser.newPage(),admissionCDP=await admissionPage.createCDPSession();
 sandbox=await requireChromiumSandbox({send:admissionCDP.send.bind(admissionCDP)});await file('sandbox.json',sandbox);await admissionPage.close();
 downloadSession=await browser.target().createCDPSession();
 downloadSession.on('Browser.downloadWillBegin',e=>downloads.push({...e,state:'started'}));
 downloadSession.on('Browser.downloadProgress',e=>{const item=downloads.find(d=>d.guid===e.guid);if(item)Object.assign(item,e);});
 await downloadSession.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:out+'/downloads',eventsEnabled:true});
 for(const path of ['web/rehearsal.mjs','web/feature-rehearsal.mjs','src/rehearsal-judgment.mjs','src/feature-rehearsal.mjs']){
  const response=await fetch(origin+'/'+path);assert.equal(response.status,200);
  const served=Buffer.from(await response.arrayBuffer()),local=await readFile(new URL('../'+path,import.meta.url));
  assert.deepEqual(served,local);sourceReceipt.push({path,bytes:served.length,sha256:createHash('sha256').update(served).digest('hex')});
 }
 await file('source-receipt.json',sourceReceipt);
 page=await browser.newPage();await page.setViewport({width:1280,height:960});page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!/^(blob:|data:)/.test(r.url()))offsite.push(r.url());});
 await start();await place('a',22,50);await page.click('#requestTargets');await place('b',38,50);
 await page.select('#judgmentChoice','adequate');await value('judgmentReason','Keep this original account');await page.click('#recordJudgment');
 const original=await study();assert.equal(original.judgments.length,1);assert.equal(original.judgments[0].reason,'Keep this original account');assert.equal(await page.$eval('#placeMark',e=>e.disabled),true);
 await file('judgments-before.json',original);await go('reviewFeatureRehearsal');await page.select('#featureRehearsalTrial','2');assert.equal(await page.$eval('#featureRehearsalTrial',e=>e.value),'2');const selectedReview=await exported('saveFeatureRehearsal');assert.equal(selectedReview.selectedTrial,2);assert.deepEqual(selectedReview.rehearsal,original.rehearsal);await shots('feature-review');
 await go('resumeFeatureRehearsal');const returned=await study();await file('judgments-after.json',returned);
 assert.deepEqual(returned,original,'Review and Resume must preserve the exact first-judgment study');
 assert.match(await text('judgmentHistory'),/Keep this original account/);
 record('actual feature review, trial selection and resume preserve complete judgments, source, plan, actions and prior help');
 const frozen=await raw();await place('a',31,51);assert.deepEqual(await raw(),frozen);
 await clickPaper();assert.deepEqual(await raw(),frozen);
 await page.$eval('#rehearsalSheet',e=>e.focus());assert.equal(await page.evaluate(()=>document.activeElement.id),'rehearsalSheet');await page.keyboard.press('ArrowRight');assert.deepEqual(await raw(),frozen);assert.equal(await page.$eval('#placeMark',e=>e.disabled),true);
 record('recorded unsubmitted judgment still blocks coordinate, original SVG pointer and keyboard edits');
 await page.click('#submitTrial');await page.click('#nextTrial');assert.equal(await page.$eval('#placeMark',e=>e.disabled),false);await place('a',41,50);let before=await raw();
 await page.$eval('#rehearsalSheet',e=>{e.scrollIntoView();e.focus();});await page.keyboard.press('ArrowRight');assert.notDeepEqual(await raw(),before);before=await raw();
 await clickPaper();assert.notDeepEqual(await raw(),before);
 const continued=await study();assert.deepEqual(continued.judgments,original.judgments);assert.ok(continued.rehearsal.events.length>original.rehearsal.events.length);const continuedFile=await file('continued-judgments.json',continued);
 await shots('resumed-rehearsal');record('commit and next sheet preserve old judgments while allowing real coordinate, pointer and keyboard placements');
 await go('reviewFeatureRehearsal');assert.match(await text('featureRehearsalStatus'),/judgments/i);const savedFeature=await exported('saveFeatureRehearsal');assert.equal(savedFeature.schema,'skill-translator-feature-rehearsal/v1');assert.deepEqual(Object.keys(savedFeature).sort(),['comparison','rehearsal','schema','selectedTrial']);assert.deepEqual(savedFeature.rehearsal,continued.rehearsal);const savedFile=await file('saved-feature-review.json',savedFeature);
 for(const id of ['featureRehearsalFile','featureRehearsalReviewFile','rehearsalComparisonFile']){await upload(id,invalidFile);assert.match(await text('featureRehearsalError'),/Input refused/);}
 await go('resumeFeatureRehearsal');assert.deepEqual(await study(),continued);
 record('failed raw, review and comparison replacements preserve the companion; feature export retains its existing raw schema');
 await go('reviewFeatureRehearsal');const rawFile=await file('legacy-rehearsal.json',continued.rehearsal);await upload('featureRehearsalFile',rawFile);await go('resumeFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual(await raw(),continued.rehearsal);
 await restore(continuedFile);await upload('featureRehearsalReviewFile',savedFile);await go('resumeFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual(await raw(),continued.rehearsal);
 record('successful explicit raw and saved-feature imports clear old judgments even when their rehearsal bytes match');
 await restore(continuedFile);await page.select('#featureRehearsalTrial','2');assert.match(await text('featureRehearsalStatus'),/judgments/i);await go('startFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.deepEqual((await raw()).events,[]);
 await restore(continuedFile);const changedComparison=structuredClone(comparison);changedComparison.source.title='A different declared comparison';const changedFile=await file('changed-comparison.json',changedComparison);await upload('rehearsalComparisonFile',changedFile);assert.equal(await page.$eval('#featureRehearsalResults',e=>e.hidden),true);await go('startFeatureRehearsal');assert.deepEqual((await study()).judgments,[]);assert.equal((await raw()).source.title,changedComparison.source.title);
 record('explicit fresh start and successful comparison replacement cannot inherit earlier judgments');
 await page.evaluate(({comparisonKey,returnKey,comparison,rehearsal})=>{sessionStorage.setItem(comparisonKey,JSON.stringify(comparison));sessionStorage.setItem(returnKey,JSON.stringify(rehearsal));},{comparisonKey,returnKey,comparison,rehearsal:continued.rehearsal});await page.goto(origin+'/feature-rehearsal',{waitUntil:'networkidle0'});await go('resumeFeatureRehearsal');assert.deepEqual(await raw(),continued.rehearsal);assert.deepEqual((await study()).judgments,[]);
 await go('reviewFeatureRehearsal');await go('resumeFeatureRehearsal');assert.deepEqual(await raw(),continued.rehearsal);assert.deepEqual((await study()).judgments,[]);
 record('legacy raw handoff and subsequent actual navigation remain compatible');
 await restore(continuedFile);
 await page.evaluate(()=>{window.__freshNavigationCancelled=false;navigation.addEventListener('navigate',event=>{if(new URL(event.destination.url).pathname==='/rehearsal'){event.preventDefault();window.__freshNavigationCancelled=true;}},{once:true});});
 await page.click('#startFeatureRehearsal');await page.waitForFunction(()=>window.__freshNavigationCancelled===true);
 assert.equal(new URL(page.url()).pathname,'/feature-rehearsal');await go('resumeFeatureRehearsal');
 assert.deepEqual(await study(),continued,'Cancelled fresh navigation must retain accepted judgments');
 record('a cancelled fresh navigation leaves accepted judgments available for a subsequent real resume');

 const invalidStudy=structuredClone(original);invalidStudy.rehearsal.events.push({type:'place',id:'a',xMm:19,yMm:50});const invalidText=JSON.stringify(invalidStudy);
 await page.evaluate(({comparisonKey,returnKey,comparison,invalidText})=>{sessionStorage.setItem(comparisonKey,JSON.stringify(comparison));sessionStorage.setItem(returnKey,invalidText);},{comparisonKey,returnKey,comparison,invalidText});await page.goto(origin+'/feature-rehearsal',{waitUntil:'networkidle0'});assert.match(await text('featureRehearsalError'),/Placements freeze/);assert.equal(await page.$eval('#featureRehearsalResults',e=>e.hidden),true);assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),returnKey),invalidText);
 record('invalid full judgment history is refused without raw fallback or consuming the recoverable handoff');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 const receipt={ok:true,browser:await browser.version(),uid:process.getuid(),sandbox,sourceReceipt,completedDownloads:downloads.filter(d=>d.state==='completed').length,downloads,groups,errors,offsite,scope:'Authored geometric browser controls; live navigation preservation only. Feature exports retain their existing schema and exclude judgments.'};
 await writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}catch(e){await writeFile(out+'/failure.json',JSON.stringify({ok:false,groups,error:e.stack,errors,offsite,sandbox,sourceReceipt,downloads},null,2)+'\n');if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
