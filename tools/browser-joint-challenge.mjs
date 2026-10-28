import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {createObservation} from '../src/evidence.mjs';
import {jointSourceReading,createJointCalibrationHypothesis,exportJointCalibration} from '../src/joint-calibration.mjs';
import {freezeJointChallengePlan as freeze,createJointChallengeResult as result,exportJointChallengeStudy as save} from '../src/joint-challenge.mjs';
import {alternativeGroupCourse} from '../test/support/joint-challenge-conflict-fixtures.mjs';
const source={provenance:'Authored rectangle controls',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[['guide',20,30],['index',60,50]].map(([id,x,y])=>({id,label:id,kind:'edge_offset_mm',edge:'left',sourcePx:{x,y},toleranceMm:50}))};
const row=(s,id,mark,x,y,w=100,h=80,u=50)=>createObservation(s,{id,landmarkId:mark,label:id,evidenceClass:'authored-example',widthMm:w,heightMm:h,xMm:x,yMm:y,uncertaintyMm:u});
function study(s=source,alternatives=true){return exportJointCalibration(s,s.landmarks.map(m=>m.id),s.landmarks.map((m,i)=>row(s,'train-'+i,m.id,m.sourcePx.x,m.sourcePx.y)),alternatives?[createJointCalibrationHypothesis(s,{id:'wide',label:'Wide source',basis:'proposed-reading',reading:{...jointSourceReading(s),widthMm:150}})]:[]);}
const trial=(id='future',w=200,h=160)=>({id,label:id,widthMm:w,heightMm:h,uncertaintyMm:.1});
const plan=(s=study(),trials=[trial()])=>freeze(s,{id:'plan',label:'Unseen workpieces',prospectiveDeclaration:true,trials});
const outcome=(p,mark,x,y,t='future',u=.01,id=t+'-'+mark)=>{const sheet=p.trials.find(s=>s.id===t);return result(p,{trialId:t,collectedAfterPlan:true,observation:{id,landmarkId:mark,label:id,evidenceClass:'authored-example',widthMm:sheet.widthMm,heightMm:sheet.heightMm,xMm:x,yMm:y,uncertaintyMm:u}});};

assert.equal(study().landmarkIds.length,2);assert.equal(plan().trials.length,1);assert.equal(save(plan(),[]).results.length,0);
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/home/ubuntu/.npm/_npx/f0a362733743bae2/node_modules/playwright');
const base=process.env.BASE_URL;if(!base)throw Error('BASE_URL must identify the received maintained server');
const out=new URL('../receipts/joint-challenge-conflicts-browser/',import.meta.url);await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),receipt={startedAt:new Date().toISOString(),base,authoredExamples:true,checks:[],files:[],screenshots:[]};
async function manifest(dir){for(const x of await readdir(new URL('../'+dir,import.meta.url),{withFileTypes:true}).catch(()=>[])){const p=dir+x.name;if(x.isDirectory()){if(!['node_modules','.git','receipts'].includes(x.name))await manifest(p+'/');}else if(/\.(mjs|html|css|json)$/.test(p)){const b=await readFile(new URL('../'+p,import.meta.url));receipt.files.push({path:p,bytes:b.length,sha256:sha(b)});}}}
for(const d of ['src/','web/','native/','tools/','scripts/','test/'])await manifest(d);
let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),pre=await context.newPage(),cdp=await context.newCDPSession(pre);
 receipt.sandbox=await requireChromiumSandbox({send:(m,p)=>cdp.send(m,p)});await pre.close();
 let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async()=>{await page.goto(base+'/joint-calibration');await page.locator('#jc-plan-form').waitFor();};
 const upload=async(id,value,name='fixture.json')=>{await page.locator(id).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});await waitPredicate(page,id=>document.querySelector(id).value==='',id);};
 const status=async s=>{await waitPredicate(page,s=>document.querySelector('#jc-summary').dataset.status===s,s);};
 const exported=async()=>{const wait=page.waitForEvent('download');await page.locator('#jc-export').click();const d=await wait;const stream=await d.createReadStream();const chunks=[];for await(const b of stream)chunks.push(b);return Buffer.concat(chunks).toString();};
 const fillOutcome=async(mark,x,y,r='.01')=>{await page.locator('#jc-mark').selectOption(mark);await page.locator('#jc-outcome-label').fill('Authored browser control');await page.locator('#jc-class').selectOption('authored-example');for(const [id,v]of [['x',x],['y',y],['radius',r]])await page.locator('#jc-'+id).fill(String(v));await page.locator('#jc-collected').check();await page.locator('#jc-save').click();};
 await open();await upload('#studyFile',study());
 for(const [n,v]of [['width','200'],['height','160'],['radius','.1']])await page.locator('#jc-drafts [name='+n+']').fill(v);
 await page.locator('#jc-prospective').check();await page.locator('#jc-freeze').click();await status('awaiting-results');
 await fillOutcome('guide',20,60);await status('incomplete');await fillOutcome('index',90,100);await status('none-compatible');assert.equal(await page.locator('#jc-switching').isVisible(),true);
 await fillOutcome('guide',30,60);await status('one-joint-explanation');console.log("PHASE",new Date().toISOString());receipt.checks.push('actual parent import, freeze, cross-mark trap and coherent wide outcome');
 const good=await exported();assert.equal('readings' in JSON.parse(good).plan,false);assert.equal(good,JSON.stringify(JSON.parse(good)));await writeFile(new URL('export.json',out),good);
 await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await open();await upload('#jc-file',good);await status('one-joint-explanation');assert.equal(await exported(),good);
 const forged=JSON.parse(good);forged.plan.readings=[{fake:true}];forged.verdict={status:'none-compatible'};await upload('#jc-file',forged);await status('one-joint-explanation');assert.equal(await exported(),good);
 const bad=JSON.parse(good);bad.results[0].observation.sourceReference.landmark.sourcePx.x++;await upload('#jc-file',bad);assert.equal(await page.locator('#jc-error').isVisible(),true);assert.equal(await exported(),good);console.log("PHASE",new Date().toISOString());receipt.checks.push('compact Blob download, fresh reopen, derived-cache recomputation, forged-anchor refusal');
 for(const [input,draft,value]of [['#studyFile','#jc-outcome-label',study()],['#jc-file','#readingLabel',good]]){
  await page.evaluate(()=>{const original=File.prototype.text;window.restoreFileText=()=>{File.prototype.text=original;};window.releaseRead=null;File.prototype.text=function(){const f=this;if(f.name!=='delayed.json')return original.call(f);return new Promise(resolve=>{window.releaseRead=async()=>resolve(await original.call(f));});};});
  await page.locator(input).setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
  await waitPredicate(page,()=>typeof window.releaseRead==='function');await page.locator(draft).focus();await page.keyboard.press('Control+A');await page.keyboard.type('Preserved typed draft');await page.evaluate(async()=>{const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error("Delayed fixture release timeout")),5000));await Promise.race([window.releaseRead(),timeout]);window.restoreFileText();});await waitPredicate(page,id=>document.querySelector(id).value==='',input);
  assert.equal(await page.locator(draft).inputValue(),'Preserved typed draft');assert.equal(await exported(),good);
 }
 await page.locator('#coherentExample').click();assert.equal(await page.locator('#jc-stale').isVisible(),true);assert.equal(await exported(),good);console.log("PHASE",new Date().toISOString());receipt.checks.push('both delayed import directions retired by trusted typing, draft retention, frozen training after parent commit');
 await upload('#jc-file',good);await page.locator('#jc-drafts [name=width]').fill('10');await page.locator('#jc-drafts [name=height]').fill('10');await page.locator('#jc-prospective').check();await page.locator('#jc-freeze').click();assert.equal(await page.locator('#jc-error').isVisible(),true);assert.equal(await exported(),good);
 const p=plan(study(source,false),[trial('one'),trial('two',300,240)]);
 await upload('#jc-file',save(p,[outcome(p,'guide',20,60,'one'),outcome(p,'index',60,100,'one'),outcome(p,'guide',220,90,'two'),outcome(p,'index',60,150,'two')]));await status('none-compatible');assert.equal(await page.locator('#jc-switching').isVisible(),false);
 const p1=plan();await upload('#jc-file',save(p1,[outcome(p1,'guide',199,159)]));await status('none-compatible');assert.match(await page.locator('#jc-counts').innerText(),/1 missing/);
 await upload('#jc-file',save(p1,[outcome(p1,'guide',199,159),outcome(p1,'index',90,100,'future',.2)]));await status('none-compatible');assert.match(await page.locator('#jc-counts').innerText(),/1 above/);console.log("PHASE",new Date().toISOString());receipt.checks.push('failed replacement retains account; fixed rule across sheets; contradiction dominates missing and imprecise');
 const st=study(source,false);st.source.padding='';const empty=save(plan(st),[]),gap=4000000-Buffer.byteLength(JSON.stringify(empty));st.source.padding='é'.repeat(Math.floor(gap/2))+'x'.repeat(gap%2);const capacity=JSON.stringify(save(plan(st),[]));assert.equal(Buffer.byteLength(capacity),4000000);
 await upload('#jc-file',capacity);await status('awaiting-results');await fillOutcome('guide',40,60);assert.equal(await page.locator('#jc-error').isVisible(),true);assert.equal(await exported(),capacity);console.log("PHASE",new Date().toISOString());receipt.checks.push('exact 4000000 UTF8 complete-envelope outcome refusal retains account');
 await upload('#jc-file',good);
 for(let i=1;i<6;i++)await page.locator('#jc-add-trial').click();
 const boxes=page.locator('.jc-trial-draft');assert.equal(await boxes.count(),6);
 for(let i=0;i<6;i++){await boxes.nth(i).locator('[name=width]').fill(String(200+i*10));await boxes.nth(i).locator('[name=height]').fill(String(160+i*10));}
 await page.locator('#jc-prospective').check();await page.locator('#jc-freeze').click();await status('awaiting-results');assert.equal(JSON.parse(await exported()).plan.trials.length,6);assert.equal(await page.locator('#jc-add-trial').isDisabled(),true);
 await upload('#jc-file',good);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#jointChallenge').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);
  await page.locator('#jc-outcome-label').focus();await page.keyboard.press('Control+A');await page.keyboard.type('Keyboard '+width);assert.equal(await page.locator('#jc-outcome-label').inputValue(),'Keyboard '+width);await page.keyboard.press('Tab');assert.equal(await page.locator('#jc-class').evaluate(n=>n===document.activeElement),true);
  const path=new URL('joint-'+width+'.png',out);await page.screenshot({path:path.pathname,fullPage:true});const b=await readFile(path);receipt.screenshots.push({file:path.pathname,sha256:sha(b),bytes:b.length,width});
 }
 console.log("PHASE",new Date().toISOString());receipt.checks.push('six-sheet freeze; 1440/390/320 overflow, keyboard, focus and screenshots');
 const conflictCourse=alternativeGroupCourse(),conflictRaw=JSON.stringify(save(conflictCourse.plan,conflictCourse.results));
 await page.setViewportSize({width:1440,height:1000});await upload('#jc-file',conflictRaw);await status('none-compatible');
 const groupIds=async()=>page.locator('.jc-conflict-group').evaluateAll(nodes=>nodes.map(node=>node.dataset.trials));
 assert.deepEqual(await groupIds(),['three','one,two']);
 assert.match(await page.locator('#jc-conflict-summary').innerText(),/2 inclusion-minimal groups/);
 assert.match(await page.locator('#jc-conflicts').innerText(),/All 7 nonempty subsets/);
 const paired=page.locator('.jc-conflict-group[data-trials="one,two"]');
 await paired.locator('summary').focus();await page.keyboard.press('Enter');
 await waitPredicate(page,()=>document.querySelector('.jc-conflict-group[data-trials="one,two"]').textContent.includes('Why each workpiece is necessary'));
 assert.equal(await paired.evaluate(node=>node.open),true);
 assert.match(await paired.innerText(),/one-guide/);assert.match(await paired.innerText(),/two-guide/);
 assert.match(await paired.innerText(),/leaves 1 original rule combination/);
 assert.equal(await paired.locator('summary').evaluate(node=>node===document.activeElement),true);
 assert.ok(await paired.locator('summary').evaluate(node=>getComputedStyle(node).outlineStyle!=='none'&&parseFloat(getComputedStyle(node).outlineWidth)>=2));
 assert.equal(await exported(),conflictRaw);
 receipt.checks.push('all minimal workpiece groups of different sizes, original-outcome witnesses, necessity and keyboard disclosure');
 await writeFile(new URL('conflict-export.json',out),conflictRaw);
 await page.close();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await open();
 await upload('#jc-file',conflictRaw);assert.deepEqual(await groupIds(),['three','one,two']);assert.equal(await exported(),conflictRaw);
 const forgedConflict=JSON.parse(conflictRaw);forgedConflict.conflicts={minimalGroups:[],enumerationComplete:true};forgedConflict.plan.readings=[{id:'invented',marks:[]}];
 await upload('#jc-file',forgedConflict);assert.deepEqual(await groupIds(),['three','one,two']);assert.equal(await exported(),conflictRaw);
 const badConflict=JSON.parse(conflictRaw);badConflict.results[0].observation.sourceReference.landmark.sourcePx.x++;
 await upload('#jc-file',badConflict);assert.equal(await page.locator('#jc-error').isVisible(),true);assert.deepEqual(await groupIds(),['three','one,two']);assert.equal(await exported(),conflictRaw);
 assert.equal(await page.locator('#jc-stale').isVisible(),false);
 await page.evaluate(()=>{const original=File.prototype.text;window.restoreFileText=()=>{File.prototype.text=original;};window.releaseRead=null;File.prototype.text=function(){const file=this;if(file.name!=='conflict-delayed.json')return original.call(file);return new Promise(resolve=>{window.releaseRead=async()=>resolve(await original.call(file));});};});
 await page.locator('#studyFile').setInputFiles({name:'conflict-delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(study()))});
 await waitPredicate(page,()=>typeof window.releaseRead==='function');
 const activeGroup=page.locator('.jc-conflict-group[data-trials="one,two"]');assert.equal(await activeGroup.evaluate(node=>node.open),false);
 await activeGroup.locator('summary').focus();await page.keyboard.press('Enter');
 await waitPredicate(page,()=>document.querySelector('.jc-conflict-group[data-trials="one,two"]').textContent.includes('Why each workpiece is necessary'));
 await page.evaluate(async()=>{await Promise.race([window.releaseRead(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Conflict delayed-read release timeout')),5000))]);window.restoreFileText();});
 await waitPredicate(page,()=>document.querySelector('#studyFile').value==='');
 assert.equal(await page.locator('#jc-stale').isVisible(),false);assert.equal(await exported(),conflictRaw);
 await page.locator('#coherentExample').click();assert.equal(await page.locator('#jc-stale').isVisible(),true);assert.deepEqual(await groupIds(),['three','one,two']);assert.equal(await exported(),conflictRaw);
 assert.equal('conflicts' in JSON.parse(conflictRaw),false);
 const servedCore=await page.request.get(base+'/src/joint-challenge-conflicts.mjs');assert.equal(servedCore.status(),200);assert.equal(sha(await servedCore.body()),sha(await readFile(new URL('../src/joint-challenge-conflicts.mjs',import.meta.url))));
 assert.equal((await page.request.get(base+'/test/support/joint-challenge-conflict-fixtures.mjs')).status(),404);
 receipt.checks.push('conflict source-only fresh reopen and forged-cache recomputation; failed source retention; keyboard activity fences delayed parent import; stale frozen groups and served/private boundaries');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  await page.locator('.jc-conflict-group').evaluateAll(nodes=>nodes.forEach(node=>{node.open=false;}));
  await page.locator('#jc-conflicts').evaluate(node=>node.scrollIntoView({block:'start'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'conflict overview overflow '+width);
  const overview=new URL('conflicts-'+width+'-overview.png',out);await page.screenshot({path:overview.pathname});let bytes=await readFile(overview);receipt.screenshots.push({file:overview.pathname,sha256:sha(bytes),bytes:bytes.length,width,kind:'conflict-overview'});
  const group=page.locator('.jc-conflict-group[data-trials="one,two"]');
  await group.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await group.evaluate(node=>node.open),true);
  await group.locator('summary').evaluate(node=>node.scrollIntoView({block:'start'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'conflict details overflow '+width);
  const details=new URL('conflicts-'+width+'-details.png',out);await page.screenshot({path:details.pathname});bytes=await readFile(details);receipt.screenshots.push({file:details.pathname,sha256:sha(bytes),bytes:bytes.length,width,kind:'conflict-details'});
 }
 receipt.checks.push('conflict overview and complete disclosure at 1440/390/320 with keyboard focus, horizontal bounds and actual viewport captures');
 assert.deepEqual(errors,[]);receipt.status='passed';
}catch(e){receipt.status='failed';receipt.error=e.stack;if(e.receipt)receipt.sandbox=e.receipt;throw e;}
finally{receipt.completedAt=new Date().toISOString();await writeFile(new URL('receipt.json',out),JSON.stringify(receipt,null,2));await browser?.close();}

async function waitPredicate(page,fn,arg){const end=Date.now()+30000;while(Date.now()<end){if(await page.evaluate(fn,arg))return;await new Promise(r=>setTimeout(r,25));}throw Error("Timed out waiting for browser predicate: "+fn.toString());}
