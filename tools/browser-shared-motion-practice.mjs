import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createAppServer} from '../server.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {originalMotionBundle} from './support/shared-motion-browser-fixture.mjs';
import {receiveGroupPracticeTransactions} from './support/shared-motion-practice-transactions.mjs';
import {GROUP_POINTS,groupedFrames} from '../test/helpers/shared-motion-fixture.mjs';
import {sequenceDiscoveryInputs} from '../src/sequence-discovery.mjs';
import {createSharedMotionPractice,assessSharedMotionPractice} from '../src/shared-motion-practice.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.QA_OUTPUT||'/tmp/skill-motion-practice');await mkdir(out,{recursive:true});
const metadata={result:'FAIL',checks:[],errors:[]},server=createAppServer();let browser;
await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});
const base='http://127.0.0.1:'+server.address().port;
// Native page evaluation respects the application's CSP; no unsafe-eval bypass.
async function until(page,predicate,arg){const end=Date.now()+15000;while(Date.now()<end){if(await page.evaluate(predicate,arg))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Browser condition timed out.');}
function oracle(pairs){
 assert(pairs.length>=2);
 const mean=k=>pairs.reduce((s,p)=>({x:s.x+p[k].xMm/pairs.length,y:s.y+p[k].yMm/pairs.length}),{x:0,y:0}),t=mean('target'),a=mean('attempt');
 let dot=0,cross=0,spread=0;
 for(const p of pairs){const x=p.target.xMm-t.x,y=p.target.yMm-t.y,u=p.attempt.xMm-a.x,v=p.attempt.yMm-a.y;dot+=x*u+y*v;cross+=x*v-y*u;spread+=x*x+y*y;}
 assert(spread>0);const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);
 const rs=pairs.map(p=>{const x=p.target.xMm-t.x,y=p.target.yMm-t.y;return Math.hypot(a.x+c*x-s*y-p.attempt.xMm,a.y+s*x+c*y-p.attempt.yMm);});
 return {max:Math.max(...rs),rms:Math.sqrt(rs.reduce((sum,r)=>sum+r*r,0)/rs.length)};
}
async function download(page,selector,name){
 const pending=page.waitForEvent('download');await page.locator(selector).click();const path=resolve(out,name);await(await pending).saveAs(path);return path;
}
const json=async path=>JSON.parse(await readFile(path,'utf8'));
function inputsFor(saved){return sequenceDiscoveryInputs({format:'skill-translator.sequence-discovery/v1',sequence:saved.discovery.sourceBundle.sequence,declarations:saved.discovery.declarations});}
function reportFor(saved){return assessSharedMotionPractice(createSharedMotionPractice(inputsFor(saved).study,saved.comparison.session,{fitToleranceMm:saved.comparison.fitToleranceMm,basis:saved.comparison.basis}));}
async function ready(page){await until(page,()=>!document.querySelector('#motionPracticeSave').disabled&&document.querySelectorAll('#motionPracticeFits tr').length===3);}
const labels={supported:'Within fitted threshold','outside-fit-threshold':'Outside fitted threshold',incomplete:'Incomplete',unresolved:'Unresolved orientation'};
async function verifyRows(page,report){
 for(const round of report.rounds){
  await page.locator('#motionPracticeRound').selectOption(String(round.round));
  for(const group of report.inference.groups){
   await page.locator('#motionPracticeGroup').selectOption(JSON.stringify(group.ids));
   const expected=round.comparisons.filter(r=>JSON.stringify(r.groupIds)===JSON.stringify(group.ids));
   const actual=await page.locator('#motionPracticeFits tr').evaluateAll(rows=>rows.map(r=>({data:{...r.dataset},cells:[...r.cells].map(c=>c.textContent)})));
   assert.equal(actual.length,3);assert.equal(new Set(actual.map(r=>r.data.sourceId)).size,3);
   for(const row of actual){const e=expected.find(e=>e.sourceId===row.data.sourceId);assert(e);assert.equal(row.data.status,e.status);assert.equal(row.cells[1],labels[e.status]);
    if(e.maxResidualMm!==null){assert.notEqual(row.data.maxResidualMm,'');assert(Math.abs(Number(row.data.maxResidualMm)-e.maxResidualMm)<=1e-9);assert.equal(row.cells[5],e.maxResidualMm.toFixed(3));}
    else{assert.equal(row.data.maxResidualMm,'');assert.equal(row.cells[5],'—');}
   }
  }
 }
}
function unchangedSources(saved,original){assert.deepEqual(saved.discovery.sourceBundle.sequence,original.sequence);assert.deepEqual(saved.discovery.sourceBundle.frames,original.frames);}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY||'/opt/google/chrome/chrome'});
 const preflight=await browser.newPage();
 try{const cdp=await preflight.context().newCDPSession(preflight);metadata.sandbox=await requireChromiumSandbox({send:(m,p)=>cdp.send(m,p)});}finally{await preflight.close();}
 for(const path of ['/src/shared-motion-practice.mjs','/web/shared-motion-practice-view.mjs']){const response=await fetch(base+path);assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/javascript/);assert.equal(await response.text(),await readFile(resolve(path.slice(1)),'utf8'));}
 const context=await browser.newContext({viewport:{width:1280,height:1000}});context.on('page',p=>p.on('pageerror',e=>metadata.errors.push(String(e))));
 const page=await context.newPage();await page.goto(base+'/relationship-discovery');
 const original=await originalMotionBundle(page,groupedFrames()),sourceFile=resolve(out,'original-sequence.json');await writeFile(sourceFile,JSON.stringify(original));
 await page.locator('#sequenceSource').setInputFiles(sourceFile);await page.locator('#sequenceIdentities').check();await page.locator('#sequencePlane').check();
 await page.locator('#sequenceBasis').fill('Authored stable identities on one calibrated physical plane');await page.locator('#evidence').selectOption('authored-example');await page.locator('#deviation').fill('.01');await page.locator('#analyzeSequence').click();
 await until(page,()=>/2 maximal/.test(document.querySelector('#motionSummary').textContent));
 await page.locator('#width').fill('600');await page.locator('#height').fill('400');
 const pending=page.waitForEvent('popup');await page.locator('#motionPracticeStart').click();const practice=await pending;await practice.waitForURL('**/practice');await practice.locator('#practiceMarks button').first().waitFor();
 assert.equal(await practice.locator('#practiceMarks button').count(),6);
 const emptyFile=await download(practice,'#savePractice','empty-practice.json');
 await page.locator('#motionPracticeTolerance').fill('.01');await page.locator('#motionPracticeBasis').fill('Proper rigid fit in original calibrated millimetres');
 await page.locator('#motionPracticeSession').setInputFiles(emptyFile);await ready(page);
 const emptySaved=await json(await download(page,'#motionPracticeSave','empty-comparison.json')),emptyReport=reportFor(emptySaved);
 assert.equal(emptyReport.rounds.length,1);assert.equal(emptyReport.rounds[0].positional.placed,0);assert.equal(emptyReport.counts.incomplete,6);
 assert(emptyReport.rounds[0].comparisons.every(r=>r.fit===null&&r.missingAttemptIds.length===3));await verifyRows(page,emptyReport);
 metadata.checks.push('Existing Practice opens empty from the original first source; real empty export yields six incomplete comparisons without substituted placements.');
 async function place(count,doubled){
  for(let i=0;i<count;i++){const[x,y]=GROUP_POINTS[i];await practice.locator('#practiceMarks button[data-id="authored-'+(i+1)+'"]').click();
   await practice.locator('#placementX').fill(String(doubled?2*x:x+100));await practice.locator('#placementY').fill(String(doubled?2*y:y+100));await practice.locator('#placementForm button[type=submit]').click();}
 }
 await place(5,false);await practice.locator('#retryTask').click();await place(6,false);await practice.locator('#retryTask').click();await place(6,true);
 const sessionFile=await download(practice,'#savePractice','actual-practice.json');await practice.locator('#reviewTask').click();await practice.locator('.complete-workspace').screenshot({path:resolve(out,'actual-practice.png')});await practice.close();await page.bringToFront();
 await page.locator('#motionPracticeSession').setInputFiles(sessionFile);await until(page,()=>document.querySelectorAll('#motionPracticeRound option').length===3);await ready(page);
 const saved=await json(await download(page,'#motionPracticeSave','comparison.json'));assert.equal(saved.format,'skill-translator.shared-motion-practice-bundle/v1');unchangedSources(saved,original);assert.deepEqual(saved.comparison.session,await json(sessionFile));assert.equal(saved.comparison.fitToleranceMm,.01);
 const report=reportFor(saved),expected=new Set(),seen=new Set(),frames=groupedFrames();
 const expectedGroups=[['authored-1','authored-2','authored-3'],['authored-4','authored-5','authored-6']],expectedSources=inputsFor(saved).study.demonstrations.map(s=>s.id).sort();
 assert.deepEqual(report.inference.groups.map(g=>g.ids),expectedGroups);assert.deepEqual(report.sourceIds,expectedSources);assert.deepEqual(report.rounds.map(r=>r.round),[1,2,3]);
 const key=(g,s,r)=>JSON.stringify([g,s,r]);for(const g of expectedGroups)for(const s of expectedSources)for(const r of[1,2,3])expected.add(key(g,s,r));
 for(const round of report.rounds){
  assert.equal(round.positional.placed,round.round===1?5:6);if(round.round>1)assert.equal(round.positional.passed,round.round===3);
  for(const row of round.comparisons){const k=key(row.groupIds,row.sourceId,round.round);assert(expected.has(k)&&!seen.has(k));seen.add(k);
   for(const p of row.pairs){const i=Number(p.id.replace('authored-',''))-1,s=expectedSources.indexOf(row.sourceId);assert(i>=0&&i<6);assert(round.round!==1||i<5);
    const[x,y]=GROUP_POINTS[i],d=round.round===3;assert.deepEqual(p.attempt,{xMm:d?2*x:x+100,yMm:d?2*y:y+100});
    assert(Math.abs(p.target.xMm-frames[s][i][0])<1e-9);assert(Math.abs(p.target.yMm-frames[s][i][1])<1e-9);
   }
   if(round.round===1&&row.groupIds.includes('authored-6')){assert.equal(row.status,'incomplete');assert(row.missingAttemptIds.includes('authored-6'));assert.equal(row.fit,null);}
   else{assert.equal(row.pairs.length,3);const o=oracle(row.pairs);assert(Math.abs(row.maxResidualMm-o.max)<=1e-9);assert(Math.abs(row.fit.remainingRmsMm-o.rms)<=1e-9);assert.equal(o.max<=.01+1e-9,round.round!==3);}
  }
 }
 assert.deepEqual(seen,expected);await verifyRows(page,report);
 metadata.checks.push('Eighteen unique group/source/round comparisons from seventeen real form placements; independent physical-coordinate and forward proper-fit oracle agrees with every fitted residual.');
 metadata.checks.push('Earlier missing mark stays incomplete; translated shapes pass while positional scores fail, and doubled positional targets pass while all six fixed-shape fits fail.');
 await page.locator('#motionPracticeRound').selectOption('2');await page.locator('#motionPracticeGroup').selectOption(JSON.stringify(expectedGroups[0]));
 await page.locator('#motionPracticeWitnesses details').first().locator('summary').click();await page.locator('#motionPracticeSection').screenshot({path:resolve(out,'comparison-desktop.png')});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#motionPracticeRound').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#motionPracticeRound').inputValue(),'3');const scrollTable=page.locator('#motionPracticeSection .motion-table').first();await scrollTable.focus();await page.keyboard.press('ArrowRight');await until(page,()=>document.querySelector('#motionPracticeSection .motion-table').scrollLeft>0);await page.keyboard.press('Home');await page.locator('#motionPracticeSection').screenshot({path:resolve(out,'comparison-narrow.png')});
 metadata.checks.push('Desktop and 390px comparison inspection; keyboard round selection and contained residual tables without page-wide overflow.');
 const foreign=await json(sessionFile);foreign.reference.landmarks[0].sourcePx.x+=1;await page.locator('#motionPracticeSession').setInputFiles({name:'foreign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(foreign))});
 await until(page,()=>document.querySelector('#error').textContent.includes('Practice source'));assert.equal(await page.locator('#motionPracticeRound option').count(),3);
 await page.locator('#motionPracticeTolerance').fill('');await page.locator('#motionPracticeRecompute').click();await until(page,()=>document.querySelector('#error').textContent.includes('Declare a practice'));
 assert(await page.locator('#motionPracticeSave').isDisabled());assert.equal(await page.locator('#motionPracticeRound option').count(),3);await page.locator('#motionPracticeTolerance').fill('.01');await page.locator('#motionPracticeRecompute').click();await ready(page);
 const retained=await json(await download(page,'#motionPracticeSave','retained-after-refusal.json'));assert.deepEqual(retained,saved);metadata.checks.push('Foreign session and empty tolerance refused while the original actual rounds and raw source remain retained.');
 const forged=structuredClone(saved);forged.comparison.report={passed:true,counts:{supported:999}};const forgedFile=resolve(out,'forged.json');await writeFile(forgedFile,JSON.stringify(forged));
 const reopenedPage=await context.newPage();await reopenedPage.goto(base+'/relationship-discovery');await reopenedPage.locator('#reopen').setInputFiles(forgedFile);await ready(reopenedPage);await verifyRows(reopenedPage,report);
 const reopened=await json(await download(reopenedPage,'#motionPracticeSave','reopened.json'));unchangedSources(reopened,original);assert.deepEqual(reportFor(reopened),report);assert.equal(reopened.comparison.report,undefined);
 metadata.checks.push('Actual complete wrapper download and fresh-page reopen retain all original PNG bytes, source annotations/declarations and raw rounds while discarding forged verdicts.');
 metadata.transactions=await receiveGroupPracticeTransactions({browser,base,out:resolve(out,'transactions'),validBundle:saved});
 assert.deepEqual(metadata.errors,[]);metadata.report=report;metadata.result='PASS';
}finally{
 await writeFile(resolve(out,'validation.json'),JSON.stringify(metadata,null,2));
 await browser?.close();await new Promise(done=>server.close(done));
 console.log(JSON.stringify({result:metadata.result,checks:metadata.checks,transactionChecks:metadata.transactions?.checks,errors:metadata.errors,sandbox:metadata.sandbox,comparisons:metadata.report?.counts.total,output:out},null,2));
}
