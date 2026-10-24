// Independent actual-browser receiving: authored geometric controls, not measured calibration uncertainty.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {analyzeSensitivity} from '../src/sensitivity.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/calibration-sensitivity-20261024');await mkdir(out,{recursive:true});
const fixture={title:'Independent calibration control',provenance:'Authored planar geometry, no camera measurement',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[
 {id:'left',label:'Left guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:20},toleranceMm:1},
 {id:'center',label:'Center',kind:'fraction',sourcePx:{x:50,y:40},toleranceMm:2},
 {id:'top',label:'Top guide',kind:'edge_offset_mm',edge:'top',sourcePx:{x:75,y:10},toleranceMm:1}]};
const sourcePath=resolve(out,'source.json');await writeFile(sourcePath,JSON.stringify(fixture));
const settings={cornerPx:0,landmarkPx:2,sourceWidthMm:0,sourceHeightMm:0,targetWidthMm:0,targetHeightMm:0};
const refusalSettings={...settings,landmarkPx:0,cornerPx:50,sourceWidthMm:100,targetWidthMm:300};
const expectedRefusal=analyzeSensitivity(fixture,'center',200,160,refusalSettings);
assert.equal(expectedRefusal.totalScenarios,151);assert.equal(expectedRefusal.validScenarios,103);assert.equal(expectedRefusal.invalidScenarios,48);
const report={course:'calibration sensitivity and preserved task practice',result:'FAIL',tests:[],errors:[],offsite:[]};
const mark=name=>report.tests.push(name);const server=createAppServer();let browser;
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});const origin='http://127.0.0.1:'+server.address().port;
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check']});report.browser=await browser.version();
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:'))report.offsite.push(r.url());});await page.setViewport({width:1380,height:960,deviceScaleFactor:1});
 const intercept=()=>page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__download=b;return original(b);};});
 const exported=async button=>{await intercept();await page.click(button);return page.evaluate(async()=>JSON.parse(await window.__download.text()));};
 await page.goto(origin+'/practice',{waitUntil:'networkidle0'});
 await page.evaluate(()=>{document.getElementById('practiceWidth').value='200';document.getElementById('practiceHeight').value='160';document.getElementById('setupForm').requestSubmit();});
 await(await page.$('#practiceSource')).uploadFile(sourcePath);await page.waitForFunction(()=>document.getElementById('setupLabel').textContent.includes('Independent calibration control'));
 await page.select('#practiceView','mirrored');await page.evaluate(()=>{document.getElementById('practiceGoals').checked=false;document.getElementById('practiceGoals').dispatchEvent(new Event('change'));});
 for(const p of [{id:'left',x:24,y:43},{id:'center',x:104,y:83},{id:'top',x:154,y:13}]){
  await page.click('#practiceMarks button[data-id="'+p.id+'"]');await page.evaluate(({x,y})=>{document.getElementById('placementX').value=String(x);document.getElementById('placementY').value=String(y);document.getElementById('placementForm').requestSubmit();},p);
 }
 await page.click('#reviewTask');assert.equal(await page.$eval('#taskOutcome',e=>e.dataset.state),'needs-adjustment');
 const rawBefore=await exported('#savePractice');assert.equal(rawBefore.attempts.length,3);
 await page.click('#practiceMarks button[data-id="center"]');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#inspectCalibration')]);await page.waitForFunction(()=>document.body.dataset.status==='ready');
 assert.equal(new URL(page.url()).pathname,'/sensitivity');assert.equal(await page.$eval('#sensitivityMark',e=>e.value),'center');assert.match(await page.$eval('#sourceIdentity',e=>e.textContent),/practice sheet 200 × 160 mm/);
 mark('practice transfers exact source, selected mark and physical target dimensions');
 const apply=async values=>{await page.evaluate(values=>{for(const[k,v]of Object.entries(values)){const e=document.getElementById(k);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));}},values);assert.equal(await page.$eval('#saveSensitivity',e=>e.disabled),true);await page.click('#runSensitivity');assert.equal(await page.$eval('#saveSensitivity',e=>e.disabled),false);};
 await apply(settings);const shift=Number(await page.$eval('#maxShift',e=>e.dataset.value));assert.ok(Math.abs(shift-Math.sqrt(32))<1e-8);assert.match(await page.$eval('#scenarioCount',e=>e.textContent),/0 refused$/);assert.match(await page.$eval('#toleranceMeaning',e=>e.textContent),/beyond the declared placement tolerance/);assert.match(await page.$eval('.method-note',e=>e.textContent),/not a probability distribution or a guaranteed envelope/);
 mark('independent 2px perturbation at 2mm per pixel produces sqrt(32)mm sampled movement with honest finite-sampling meaning');await page.screenshot({path:resolve(out,'sensitivity-desktop.png'),fullPage:true});
 const saved=await exported('#saveSensitivity');assert.deepEqual(saved.source,fixture);assert.deepEqual(saved.assumptions,settings);assert.equal(Object.hasOwn(saved,'analysis'),false);assert.equal(Object.hasOwn(saved,'maxSampledShiftMm'),false);
 const reopened={...saved,maxSampledShiftMm:0,exceedsDeclaredTolerance:false};const savedPath=resolve(out,'session.json');await writeFile(savedPath,JSON.stringify(reopened));
 await apply(refusalSettings);assert.equal(await page.$eval('#refusedScenarios',e=>e.hidden),false);
 const expectedText=`${expectedRefusal.validScenarios} valid predictions / ${expectedRefusal.totalScenarios} scenarios · ${expectedRefusal.invalidScenarios} refused`;
 assert.equal(await page.$eval('#scenarioCount',e=>e.textContent),expectedText);assert.ok((await page.$$('#refusalReasons li')).length>0);
 const plotted=await page.$$eval('#sensitivityPlot circle.sensitivity-combined, #sensitivityPlot circle.sensitivity-individual',es=>es.length);assert.equal(plotted,expectedRefusal.validScenarios-1);report.refusalCounts={valid:expectedRefusal.validScenarios,invalid:expectedRefusal.invalidScenarios,total:expectedRefusal.totalScenarios};
 mark('invalid geometry/dimension scenarios remain counted refusals and contribute no invented plotted predictions');await page.screenshot({path:resolve(out,'sensitivity-refusals.png'),fullPage:true});
 await(await page.$('#openSensitivity')).uploadFile(savedPath);await page.waitForFunction(()=>document.getElementById('sensitivityFileStatus').textContent.includes('Reopened and recomputed'));assert.ok(Math.abs(Number(await page.$eval('#maxShift',e=>e.dataset.value))-Math.sqrt(32))<1e-8);assert.match(await page.$eval('#scenarioCount',e=>e.textContent),/0 refused$/);
 mark('actual source-and-assumptions export/reopen recomputes the result and ignores fabricated cached metrics');
 const badPath=resolve(out,'invalid-session.json');await writeFile(badPath,JSON.stringify({...saved,assumptions:{cornerPx:51}}));await(await page.$('#openSensitivity')).uploadFile(badPath);await page.waitForFunction(()=>document.getElementById('sensitivityError').textContent.includes('Session refused'));assert.ok(Math.abs(Number(await page.$eval('#maxShift',e=>e.dataset.value))-Math.sqrt(32))<1e-8);
 mark('invalid session import refuses atomically while preserving the visible experiment');
 report.layouts=[];for(const width of [390,320]){await page.setViewport({width,height:900,deviceScaleFactor:1});await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));const size=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));assert.ok(size.page<=width+2,JSON.stringify(size));report.layouts.push(size);await page.screenshot({path:resolve(out,`sensitivity-${width}.png`),fullPage:true});}
 mark('390px and 320px layouts retain the experiment without horizontal overflow');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#returnPractice')]);assert.equal(new URL(page.url()).pathname,'/practice');assert.match(await page.$eval('#practiceStatus',e=>e.textContent),/placements and rounds were retained/);assert.equal(await page.$eval('#practiceView',e=>e.value),'mirrored');assert.equal(await page.$eval('#practiceGoals',e=>e.checked),false);assert.equal(await page.$eval('#taskOutcome',e=>e.dataset.state),'needs-adjustment');
 const rawAfter=await exported('#savePractice');assert.deepEqual(rawAfter,rawBefore);assert.equal((await page.$$('.placed-point')).length,3);
 mark('return to practice retains exact raw placements and round history, failed outcome, mirrored view and hidden goals');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);mark('no browser exceptions or offsite requests');report.result='PASS';console.log(JSON.stringify(report,null,2));
}catch(error){report.failure=error.stack||String(error);throw error;}
finally{await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(report,null,2)+'\n');try{if(browser)await browser.close();}finally{if(server.listening)await new Promise(ok=>server.close(ok));}}
