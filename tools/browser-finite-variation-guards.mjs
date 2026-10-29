// Original page consumers and actual downloads; authored geometric controls only.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(process.argv[2]||'finite-variation-receiving');
await mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['src/evidence.mjs','src/calibration-evidence.mjs','web/app.mjs','web/calibration.mjs','server.mjs'];
const before=Object.fromEntries(await Promise.all(files.map(async p=>[p,hash(await readFile(resolve(root,p)))])));
const fixture={title:'Authored guard-boundary source',provenance:'Authored numerical controls; no physical experiment',
 source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
 landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:50}]};
const fixtureFile=resolve(out,'source.json');await writeFile(fixtureFile,JSON.stringify(fixture));
const report={status:'running',checks:[],errors:[],external:[],source_before:before,
 qualification:'Authored numerical and original browser-consumer controls. Aligns the two numerical allowances; not a general binary64 distance certificate, physical measurement precision or learned-skill claim.'};
const record=s=>report.checks.push(s),responseHashes=new Map(),pending=[];
const server=createAppServer();await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
const base='http://127.0.0.1:'+server.address().port;
let browser;
const pageWatch=page=>{
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))report.external.push(r.url());});
 page.on('response',response=>{
  const url=response.url();if(!url.startsWith(base+'/')||!url.endsWith('.mjs'))return;
  pending.push((async()=>{assert.equal(response.status(),200);const sha=hash(await response.body()),path=new URL(url).pathname;assert.ok(!responseHashes.has(path)||responseHashes.get(path)===sha);responseHashes.set(path,sha);})());
 });
};
const input=async(page,selector,value)=>{await page.locator(selector).fill(String(value));};
const download=async(page,selector,name)=>{
 const waiting=page.waitForEvent('download');await page.locator(selector).click();const item=await waiting;
 const path=resolve(out,name);await item.saveAs(path);return {path,value:JSON.parse(await readFile(path,'utf8'))};
};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_BIN,chromiumSandbox:true});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1380,height:960}});
 const preflight=await context.newPage(),cdp=await context.newCDPSession(preflight);
 report.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});await preflight.close();
 const page=await context.newPage();pageWatch(page);await page.goto(base+'/');
 await page.locator('#demoFile').setInputFiles(fixtureFile);await page.waitForFunction(()=>document.querySelector('#demoLabel').textContent.includes('Authored guard-boundary source'));
 await input(page,'#planUncertainty','10.49999999925');
 assert.match(await page.locator('#evidenceProposal').innerText(),/8 of 10 remaining rule pairs/);
 assert.equal(await page.locator('#planUncertainty').inputValue(),'10.49999999925');
 record('Actual Task Space shows8/10 separable pairs at the known21mm/two-allowance boundary; original source shows9/10.');
 await input(page,'#planUncertainty',0.5);assert.match(await page.locator('#evidenceProposal').innerText(),/10 of 10/);
 await input(page,'#planUncertainty',1000);assert.match(await page.locator('#evidenceProposal').innerText(),/None of the tested/);
 await input(page,'#planUncertainty','10.49999999925');
 record('Ordinary clearly separated and wholly overlapping proposals retain their existing behavior.');
 for(const [id,value] of Object.entries({obsLabel:'Same midpoint',obsWidth:170,obsHeight:136,obsX:34,obsY:40.5,obsUncertainty:'10.49999999925'}))await input(page,'#'+id,value);
 await page.locator('#observationForm button[type=submit]').click();
 assert.deepEqual(await page.locator('#candidateCards .compatible').evaluateAll(xs=>xs.map(x=>x.dataset.rule)),['fraction','top']);
 const saved=await download(page,'#exportObservations','observations.json');
 assert.equal(saved.value.observations.length,1);assert.equal(saved.value.observations[0].uncertaintyMm,10.49999999925);
 assert.deepEqual(saved.value.observations[0].sourceReference.landmark.sourcePx,{x:20,y:30});
 record('The unchanged actual observation receiver still admits both rules at the same midpoint; real download retains exact radius and source.');
 const fresh=await context.newPage();pageWatch(fresh);await fresh.goto(base+'/');await fresh.locator('#demoFile').setInputFiles(fixtureFile);
 await fresh.waitForFunction(()=>document.querySelector('#demoLabel').textContent.includes('Authored guard-boundary source'));
 await fresh.locator('#observationFile').setInputFiles(saved.path);await fresh.waitForFunction(()=>document.querySelectorAll('#observationRows tr').length===1);
 assert.deepEqual(await fresh.locator('#candidateCards .compatible').evaluateAll(xs=>xs.map(x=>x.dataset.rule)),['fraction','top']);
 record('A fresh ordinary page reopens the actual observation download and reproduces both compatible rules.');
 const cal=await context.newPage();pageWatch(cal);await cal.goto(base+'/calibration');await cal.locator('#sourceFile').setInputFiles(fixtureFile);
 await cal.waitForFunction(()=>document.querySelector('#sourceTitle').textContent==='Authored guard-boundary source');
 await input(cal,'#planRadius','10.49999999925');assert.match(await cal.locator('#proposal').innerText(),/8 of 10 rule pairs/);
 await input(cal,'#readingLabel','Repeated original reading');await cal.locator('#hypothesisForm button[type=submit]').click();
 assert.equal(await cal.locator('#readingList .record').count(),1);assert.match(await cal.locator('#proposal').innerText(),/8 of 10 rule pairs/);
 await cal.locator('#observationFile').setInputFiles(saved.path);await cal.waitForFunction(()=>document.querySelectorAll('#observationList .record').length===1);
 assert.deepEqual(await cal.locator('#ruleCards .all-readings-compatible').evaluateAll(xs=>xs.map(x=>x.dataset.rule)),['fraction','top']);
 record('The actual calibration consumer counts8/10 with both original and repeated readings, then preserves the midpoint observations for both.');
 const study=await download(cal,'#exportStudy','investigation.json');assert.deepEqual(study.value.source,fixture);
 assert.equal(study.value.hypotheses.length,1);assert.equal(study.value.observations[0].uncertaintyMm,10.49999999925);
 const reopened=await context.newPage();pageWatch(reopened);await reopened.goto(base+'/calibration');await reopened.locator('#investigationFile').setInputFiles(study.path);
 await reopened.waitForFunction(()=>document.querySelectorAll('#observationList .record').length===1);
 assert.deepEqual(await reopened.locator('#ruleCards .all-readings-compatible').evaluateAll(xs=>xs.map(x=>x.dataset.rule)),['fraction','top']);
 const wrong=structuredClone(study.value);wrong.observations[0].sourceReference.landmark.sourcePx.x=21;
 const wrongPath=resolve(out,'wrong-source.json');await writeFile(wrongPath,JSON.stringify(wrong));await reopened.locator('#investigationFile').setInputFiles(wrongPath);
 await reopened.waitForFunction(()=>document.querySelector('#error').textContent.includes('source reference differs'));
 assert.equal(await reopened.locator('#observationList .record').count(),1);
 record('Actual calibration download and fresh reopening preserve all source/readings; wrong-source replacement refuses without losing the accepted trial.');
 await page.locator('#planUncertainty').focus();await page.keyboard.press('Control+A');await page.keyboard.type('1000');
 assert.match(await page.locator('#evidenceProposal').innerText(),/None of the tested/);
 await page.screenshot({path:resolve(out,'desktop.png'),fullPage:true});
 await cal.setViewportSize({width:390,height:844});await cal.locator('#planRadius').scrollIntoViewIfNeeded();await cal.locator('#planRadius').focus();
 assert.equal(await cal.locator('#planRadius').evaluate(x=>document.activeElement===x),true);
 assert.equal(await cal.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await cal.locator('.next-observation').screenshot({path:resolve(out,'narrow-proposal.png')});
 record('Native keyboard edits and390px proposal layout remain usable; screenshots require separate visual inspection.');
 await browser.close();browser=null;await Promise.all(pending);
 for(const name of files)assert.equal(hash(await readFile(resolve(root,name))),before[name]);
 for(const path of ['/src/evidence.mjs','/src/calibration-evidence.mjs'])assert.equal(responseHashes.get(path),before[path.slice(1)]);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);
 report.response_sha256=Object.fromEntries(responseHashes);record('Actual served planner bytes match unchanged received files; no browser errors/offsite requests or source mutations.');report.status='passed';
}catch(error){report.status='failed';report.failure=String(error.stack||error);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));report.finished_at=new Date().toISOString();await writeFile(resolve(out,'receiving.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
