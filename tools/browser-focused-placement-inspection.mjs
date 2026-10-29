// Read-only browser diagnostic against an explicitly supplied local application.
// Writes only its own fixtures, screenshots and evidence outside the source tree.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
const base=new URL(process.env.QA_BASE_URL);
assert.equal(base.protocol,'http:');assert.equal(base.hostname,'127.0.0.1');
assert.equal(base.pathname,'/');assert.equal(base.username+base.password+base.search+base.hash,'');
assert.match(process.env.QA_BUILD_SOURCE||'',/^[0-9a-f]{40}$/,'QA_BUILD_SOURCE must be an expected full commit');assert.ok(process.env.QA_OUTPUT);assert.ok(process.env.PUPPETEER_PATH);assert.ok(process.env.CHROME_BINARY);
const out=resolve(process.env.QA_OUTPUT);await mkdir(out,{recursive:false});
const report={result:'FAIL',scope:'Read-only selected-placement inspection receiving; authored geometry, no learning claim',origin:base.origin,expected_source_commit:process.env.QA_BUILD_SOURCE,source_identity:'Expected commit is caller-supplied. Tie actual served asset hashes to matching static runtime/manifest verification or a reviewed candidate tree receipt.',receiver_sha256:hash(await readFile(new URL(import.meta.url))),assets:{},errors:[],offsite:[]};
let browser;
try{
 for(const path of ['/web/focused-results.mjs','/web/practice-review.mjs','/web/practice-review.css','/src/focused-review.mjs','/src/practice.mjs','/src/practice-review.mjs']){
  const r=await fetch(base.origin+path,{redirect:'error'});assert.equal(r.status,200);report.assets[path]=hash(Buffer.from(await r.arrayBuffer()));
 }
 const puppeteer=require(process.env.PUPPETEER_PATH);
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});
 report.browser=await browser.version();const page=await browser.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(base.origin+'/')&&!r.url().startsWith('blob:'))report.offsite.push(r.url());});
 await page.setViewport({width:1280,height:960});await page.goto(base.origin+'/practice-review',{waitUntil:'networkidle0'});
 const fixture=await page.evaluate(async()=>{
  const {createPractice,placePractice,retryPractice}=await import('/src/practice.mjs');
  const {createReview,focusedPractice}=await import('/src/practice-review.mjs');
  const {createFocusedReview,appendFocusedResult,compareFocusedResult}=await import('/src/focused-review.mjs');
  const demo={title:'Authored opposite-direction control',provenance:'Authored arithmetic, not learner evidence',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'a',label:'Opposite sides',kind:'fraction',sourcePx:{x:20,y:20},toleranceMm:1},{id:'b',label:'Missing in drill',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:1},{id:'c',label:'Outside focused subset',kind:'fraction',sourcePx:{x:60,y:40},toleranceMm:1},{id:'d',label:'Missing original',kind:'fraction',sourcePx:{x:70,y:50},toleranceMm:2},{id:'e',label:'Unequal offsets',kind:'fraction',sourcePx:{x:30,y:50},toleranceMm:6}]};
  let original=createPractice(demo,100,80);
  for(const [id,xMm,yMm] of [['a',25,20],['b',40,30],['c',60,40],['e',33,54]])original=placePractice(demo,100,80,original,id,{xMm,yMm});
  const review=createReview(demo,original);review.selectedIds=['a','b','d','e'];
  const focus=focusedPractice(review);
  let session=placePractice(focus.demo,100,80,focus.session,'a',{xMm:15,yMm:20});
  session=placePractice(focus.demo,100,80,session,'d',{xMm:70,yMm:50});session=placePractice(focus.demo,100,80,session,'e',{xMm:27,yMm:46});
  session=retryPractice(focus.demo,100,80,session);session=placePractice(focus.demo,100,80,session,'a',{xMm:22,yMm:21});
  const bundle=appendFocusedResult(createFocusedReview(review),focus.demo,session,'Opposite-side drill');
  bundle.drills[0].drillRound=1;
  return {bundle,comparison:compareFocusedResult(bundle,'drill-1')};
 });
 const a=fixture.comparison.marks.find(m=>m.id==='a');
 assert.equal(a.original.evaluation.dxMm,5);assert.equal(a.drill.evaluation.dxMm,-5);
 assert.equal(a.original.evaluation.errorMm,5);assert.equal(a.drill.evaluation.errorMm,5);
 const file=resolve(out,'authored-review.json');await writeFile(file,JSON.stringify(fixture.bundle));
 await(await page.$('#reviewFile')).uploadFile(file);await page.waitForSelector('[data-drill-id="drill-1"]');
 report.oracle=fixture.comparison;
 report.visible=await page.$eval('[data-drill-id="drill-1"]',e=>({text:e.innerText,headers:[...e.querySelectorAll('th')].map(n=>n.textContent),rows:[...e.querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent)),controls:[...e.querySelectorAll('button,select')].map(n=>({tag:n.tagName,label:n.getAttribute('aria-label')||n.textContent}))}));
 assert.equal(report.visible.rows[0][1],'5.00');assert.equal(report.visible.rows[0][2],'5.00');
 assert.equal(report.visible.rows[1][2],'Missing');assert.equal(report.visible.rows[2][2],'Not practiced');
 assert.equal(report.visible.headers.length,4);
 await page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.receivedDownload=b;return original(b);};});
 const save=async()=>{await page.click('#saveReview');return page.evaluate(async()=>window.receivedDownload.text());};
 const before=await save();
 const inspect=async id=>{const selector=`[data-drill-id="drill-1"] [data-inspect-mark="${id}"]`;await page.focus(selector);await page.keyboard.press('Enter');await page.waitForSelector('[data-placement-inspection]');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H4');};
 await inspect('a');
 const values=await page.$$eval('.placement-inspection-sides>div',nodes=>nodes.map(n=>Object.fromEntries([...n.querySelectorAll('dt')].map(dt=>[dt.textContent,dt.nextElementSibling.textContent]))));
 assert.equal(values[0]['Horizontal offset · dx mm'],'+5.00');assert.equal(values[1]['Horizontal offset · dx mm'],'-5.00');
 assert.equal(values[0]['Vertical offset · dy mm'],'0.00');assert.equal(values[1]['Distance from target · mm'],'5.00');
 assert.equal(values[0]['Recorded placement result'],'Outside tolerance');
 assert.equal(await save(),before);
 await page.$eval('[data-placement-inspection]',n=>n.scrollIntoView({block:'center'}));
 await page.screenshot({path:resolve(out,'desktop-inspection.png')});
 await page.focus('[data-placement-inspection] button');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.inspectMark),'a');
 await inspect('b');assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/No placement retained in this focused round/);
 await inspect('c');assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/This mark was not part of this focused task/);
 await inspect('d');assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/No placement retained in this original round/);
 await inspect('e');
 const unequal=await page.$$eval('.placement-inspection-sides>div',nodes=>nodes.map(n=>Object.fromEntries([...n.querySelectorAll('dt')].map(dt=>[dt.textContent,dt.nextElementSibling.textContent]))));
 assert.equal(unequal[0]['Horizontal offset · dx mm'],'+3.00');assert.equal(unequal[0]['Vertical offset · dy mm'],'+4.00');assert.equal(unequal[1]['Horizontal offset · dx mm'],'-3.00');assert.equal(unequal[1]['Vertical offset · dy mm'],'-4.00');
 for(const v of unequal){assert.equal(v['Distance from target · mm'],'5.00');assert.equal(v['Tolerance · mm'],'6.00');assert.equal(v['Recorded placement result'],'Within tolerance');}
 // Current drill-planning checkboxes must not rewrite the attached source scope.
 await inspect('c');await page.click('#marks input[value="c"]');
 assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/This mark was not part of this focused task/);
 await page.click('#marks input[value="c"]');assert.equal(await save(),before);
 await inspect('a');
 const round='[aria-label="Drill round for Opposite-side drill"]';await page.focus(round);await page.select(round,'2');
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),0);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Drill round for Opposite-side drill');
 await inspect('a');assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/\+2.00/);assert.match(await page.$eval('[data-placement-inspection]',n=>n.textContent),/\+1.00/);
 await page.select(round,'1');await inspect('a');assert.equal(await save(),before);
 const bad=resolve(out,'invalid-review.json');await writeFile(bad,'{}');await(await page.$('#reviewFile')).uploadFile(bad);
 await page.waitForFunction(()=>!document.getElementById('error').hidden);
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),1);assert.equal(await save(),before);
 await page.setViewport({width:390,height:844});
 await page.$eval('[data-placement-inspection]',n=>n.scrollIntoView({block:'start'}));
 await page.screenshot({path:resolve(out,'narrow-inspection.png')});
 report.narrow=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));
 assert.ok(report.narrow.documentWidth<=report.narrow.viewport+2);
 // Invalid attachment is refused without disturbing the inspected accepted record.
 const wrongSource=resolve(out,'wrong-focused-source.json'),drillSession=resolve(out,'drill-session.json');
 const wrong=structuredClone(fixture.bundle.drills[0].demo);wrong.landmarks[0].toleranceMm=99;
 await writeFile(wrongSource,JSON.stringify(wrong));await writeFile(drillSession,JSON.stringify(fixture.bundle.drills[0].session));
 await(await page.$('#drillSource')).uploadFile(wrongSource);await(await page.$('#drillSession')).uploadFile(drillSession);await page.type('#drillLabel','Refused attachment');
 await page.$eval('#error',e=>{e.textContent='';e.hidden=true;});await page.click('#attachDrill button');await page.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),1);assert.equal(await save(),before);
 // Full count refusal retains the inspected evidence; no repeated 24 MiB fixture.
 const full=structuredClone(fixture.bundle);full.drills=Array.from({length:8},(_,i)=>({...structuredClone(full.drills[0]),id:`drill-${i+1}`}));
 const fullPath=resolve(out,'eight-drills.json');await writeFile(fullPath,JSON.stringify(full));await(await page.$('#reviewFile')).uploadFile(fullPath);await page.waitForSelector('[data-drill-id="drill-8"]');
 // Identical human labels must not confuse stable-card focus after a round change.
 const second='[data-drill-id="drill-2"] select[aria-label="Drill round for Opposite-side drill"]';await page.focus(second);await page.select(second,'2');
 assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-drill-id]')?.dataset.drillId),'drill-2');await page.select(second,'1');
 await inspect('a');const fullBefore=await save();
 const goodSource=resolve(out,'valid-focused-source.json');await writeFile(goodSource,JSON.stringify(fixture.bundle.drills[0].demo));await(await page.$('#drillSource')).uploadFile(goodSource);
 await page.$eval('#error',e=>{e.textContent='';e.hidden=true;});await page.click('#attachDrill button');await page.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),1);assert.equal(await save(),fullBefore);
 await page.$eval('#reviewFile',e=>{e.value='';});await(await page.$('#reviewFile')).uploadFile(file);await page.waitForFunction(()=>document.querySelectorAll('[data-drill-id]').length===1);await inspect('a');
 // Delay a valid replacement. Inspection must not invalidate its admission token.
 const replacement=structuredClone(fixture.bundle);replacement.drills[0].label='Delayed accepted replacement';const delayed=resolve(out,'delayed-review.json');await writeFile(delayed,JSON.stringify(replacement));
 await page.evaluate(()=>{const old=File.prototype.text;File.prototype.text=function(){if(this.name==='delayed-review.json')return new Promise(resolve=>{window.releaseReview=async()=>resolve(await old.call(this));});return old.call(this);};});
 await(await page.$('#reviewFile')).uploadFile(delayed);await page.waitForFunction(()=>!!window.releaseReview);await inspect('b');await page.evaluate(()=>window.releaseReview());
 await page.waitForFunction(()=>document.querySelector('[data-drill-id="drill-1"] h3')?.textContent==='Delayed accepted replacement');
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),0);
 await inspect('a');await page.click('[data-remove-drill="drill-1"]');
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#attachDrill button')),true);
 assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),0);assert.equal(await page.$$eval('[data-drill-id]',ns=>ns.length),0);
 await(await page.$('#reviewFile')).uploadFile(file);await page.waitForSelector('[data-drill-id="drill-1"]');await inspect('a');
 await page.click('#example');assert.equal(await page.$$eval('[data-placement-inspection]',ns=>ns.length),0);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);
 report.result='PASS';report.finding='Explicit keyboard inspection exposes opposite signed displacement, preserves exact export bytes, distinguishes missing/subset states, survives failed replacement and clears on accepted replacement.';
}catch(error){report.failure=String(error.stack||error);process.exitCode=1;}finally{
 await writeFile(resolve(out,'diagnostic.json'),JSON.stringify(report,null,2));
 if(browser)await browser.close();
}
console.log(JSON.stringify(report,null,2));
