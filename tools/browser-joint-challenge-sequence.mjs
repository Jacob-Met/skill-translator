import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {sequenceInitial,nextRound} from '../test/support/joint-challenge-sequence-fixtures.mjs';
import {startJointChallengeSequence,freezeNextJointChallengeRound,analyzeJointChallengeSequence,serializeJointChallengeSequence} from '../src/joint-challenge-sequence.mjs';
import {outcomeAt} from '../test/support/joint-challenge-conflict-fixtures.mjs';

const base=process.env.BASE_URL;if(!base)throw Error('BASE_URL must identify the received maintained server');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/home/ubuntu/.npm/_npx/f0a362733743bae2/node_modules/playwright');
const out=new URL('../receipts/joint-challenge-sequence-browser/',import.meta.url);await mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const diagnosticCases=JSON.parse(await readFile(new URL('../test/support/joint-challenge-sequence-conflicts-cases.json',import.meta.url),'utf8'));
const receipt={startedAt:new Date().toISOString(),base,authoredExamples:true,checks:[],files:[],screenshots:[]};
async function manifest(dir){for(const entry of await readdir(new URL('../'+dir,import.meta.url),{withFileTypes:true}).catch(()=>[])){const path=dir+entry.name;if(entry.isDirectory()){if(!['node_modules','.git','receipts'].includes(entry.name))await manifest(path+'/');}else if(/\.(mjs|js|html|css|json)$/.test(path)){const bytes=await readFile(new URL('../'+path,import.meta.url));receipt.files.push({path,bytes:bytes.length,sha256:sha(bytes)});}}}
for(const dir of ['src/','web/','native/','tools/','scripts/','test/'])await manifest(dir);
async function until(page,fn,arg){const deadline=Date.now()+15000;while(Date.now()<deadline){if(await page.evaluate(fn,arg))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Sequence browser predicate timed out');}
let browser;
try{
  browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),pre=await context.newPage(),cdp=await context.newCDPSession(pre);
  receipt.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});await pre.close();
  const errors=[];let page;
  async function newPage(){if(page)await page.close();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/joint-calibration');await page.locator('#jcs-plan-form').waitFor();}
  async function upload(id,value,name='sequence-control.json'){
    await page.locator(id).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
    await until(page,id=>document.querySelector(id).value==='',id);
  }
  async function exported(){const wait=page.waitForEvent('download');await page.locator('#jcs-export').click();const download=await wait,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString();}
  async function combinations(value){await until(page,value=>document.querySelector('#jointChallengeSequence').dataset.combinations===String(value),value);}
  async function freeze(width=300,height=240,label='Next authored workpiece'){
    for(const [id,value]of [['label',label],['width',width],['height',height],['radius','.1']])await page.locator('#jcs-'+id).fill(String(value));
    await page.locator('#jcs-prospective').check();await page.locator('#jcs-seal').check();await page.locator('#jcs-freeze').click();
  }
  async function receive(mark,x,y,{keyboard=false}={}){
    await page.locator('#jcs-mark').selectOption(mark);await page.locator('#jcs-outcome-label').fill('Authored '+mark+' browser outcome');await page.locator('#jcs-class').selectOption('authored-example');
    for(const [id,value]of [['x',x],['y',y],['actual-radius','.01']])await page.locator('#jcs-'+id).fill(String(value));
    await page.locator('#jcs-collected').check();if(keyboard){await page.locator('#jcs-save').focus();await page.keyboard.press('Enter');}else await page.locator('#jcs-save').click();
  }
  const initial=sequenceInitial();
  await newPage();await upload('#jc-file',initial);await page.locator('#jcs-start').click();await combinations(1);
  assert.equal(await page.locator('#jcs-context').isVisible(),false);await freeze();
  await until(page,()=>document.querySelector('#jointChallengeSequence').dataset.roundCount==='1');
  const frozen=await exported(),frozenObject=JSON.parse(frozen),frozenPrediction=analyzeJointChallengeSequence(frozen).rounds[0].predictions;
  assert.equal(frozenObject.rounds[0].results.length,0);assert.equal(frozenObject.rounds[0].prefix.initial.results.length,2);
  assert.match(await page.locator('#jcs-history').innerText(),/Left clearance: \(20, 90\) mm/);
  assert.match(await page.locator('#jcs-history').innerText(),/Left clearance: \(60, 150\) mm/);
  assert.equal(await page.locator('#jc-conflicts').isVisible(),true);
  receipt.checks.push('actual initial import, retained source, next-workpiece freeze and conditioned original predictions');

  await receive('guide',20,90,{keyboard:true});await receive('index',60,150);await combinations(1);
  assert.match(await page.locator('#jcs-counts').innerText(),/4\/4 outcomes qualified/);
  const good=await exported();assert.equal(good.at(-1),'\n');assert.equal(good,serializeJointChallengeSequence(good));
  assert.deepEqual(analyzeJointChallengeSequence(good).rounds[0].predictions,frozenPrediction);
  assert.equal('predictions' in JSON.parse(good).rounds[0],false);await writeFile(new URL('actual-export.json',out),good);
  await newPage();await upload('#jcs-file',good);await combinations(1);assert.equal(await exported(),good);
  assert.equal(await page.locator('#jcs-context').isVisible(),true);await upload('#jc-file',initial);assert.equal(await page.locator('#jcs-context').isVisible(),false);
  const forged=JSON.parse(good);forged.rounds[0].predictions=[{xMm:999}];forged.analysis={combinationCount:999};await upload('#jcs-file',forged);assert.equal(await exported(),good);
  receipt.checks.push('trusted keyboard outcome, actual source-only download, fresh independent reopen and derived-cache recomputation');

  const invalid=JSON.parse(good);invalid.initial.results[0].observation.label='Changed sealed prior';
  await upload('#jcs-file',invalid,'same-account.json');assert.equal(await page.locator('#jcs-error').isVisible(),true);assert.equal(await exported(),good);
  await upload('#jcs-file',good,'same-account.json');assert.equal(await page.locator('#jcs-error').isVisible(),false);assert.equal(await exported(),good);
  await upload('#jcs-file',' '.repeat(4000001));assert.equal(await page.locator('#jcs-error').isVisible(),true);assert.equal(await exported(),good);
  await upload('#jcs-file',good);await freeze(10,10,'Unsupported small sheet');assert.equal(await page.locator('#jcs-error').isVisible(),true);assert.equal(await exported(),good);
  receipt.checks.push('stale full prefix, byte bound and unsupported-sheet refusal retain accepted sequence; same file can be selected again');

  await receive('guide',220,90);await combinations(0);assert.equal(await page.locator('#jcs-freeze').isDisabled(),true);assert.equal(await page.locator('#jcs-save').isDisabled(),false);
  await receive('guide',20,90);await combinations(1);const corrected=await exported();await freeze(400,320,'Third authored workpiece');
  await until(page,()=>document.querySelector('#jointChallengeSequence').dataset.roundCount==='2');
  const continued=JSON.parse(await exported());assert.deepEqual(continued.rounds[0],JSON.parse(corrected).rounds[0]);
  assert.deepEqual(analyzeJointChallengeSequence(continued).rounds[0].predictions,frozenPrediction);
  const earlier=page.locator('#jcs-history > details').nth(1);await earlier.locator(':scope > summary').click();
  assert.equal(await earlier.locator('button').count(),0);await upload('#jcs-file',good);
  const missing=sequenceInitial({outcomes:false});missing.results=[outcomeAt(missing.plan,'guide',199,159,'first-workpiece',.2)];
  const missingSequence=freezeNextJointChallengeRound(startJointChallengeSequence(missing),nextRound());
  await upload('#jcs-file',serializeJointChallengeSequence(missingSequence));await combinations(25);assert.match(await page.locator('#jcs-history').innerText(),/Prior evidence: 0 qualified, 1 missing, 1 above/);
  await upload('#jcs-file',good);
  receipt.checks.push('latest-only correction, empty-family freeze refusal, immutable earlier round and frozen prediction, explicit missing/imprecise sealing');

  const delays=[
    ['#jcs-file','#jcs-label',good],['#jcs-file','#jc-plan-label',good],['#jcs-file','#readingLabel',good],
    ['#jc-file','#jcs-label',initial],['#studyFile','#jcs-outcome-label',initial.plan.investigation]
  ];
  for(const [input,draft,value]of delays){
    await page.evaluate(()=>{const original=File.prototype.text;window.restoreSequenceText=()=>{File.prototype.text=original;};window.releaseSequenceRead=null;File.prototype.text=function(){const file=this;if(file.name!=='sequence-delayed.json')return original.call(file);return new Promise(resolve=>{window.releaseSequenceRead=async()=>resolve(await original.call(file));});};});
    await page.locator(input).setInputFiles({name:'sequence-delayed.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
    await until(page,()=>typeof window.releaseSequenceRead==='function');await page.locator(draft).focus();await page.keyboard.press('Control+A');await page.keyboard.type('Newer retained draft');
    await page.evaluate(async()=>{await Promise.race([window.releaseSequenceRead(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Delayed sequence read timeout')),5000))]);window.restoreSequenceText();});
    await until(page,id=>document.querySelector(id).value==='',input);assert.equal(await page.locator(draft).inputValue(),'Newer retained draft');assert.equal(await exported(),good);
  }
  receipt.checks.push('delayed sequence, challenge and training imports lose to newer trusted drafts in all five parent/child directions');

  const other=structuredClone(initial);other.plan.label='Different complete initial challenge';await upload('#jc-file',other);
  assert.equal(await page.locator('#jcs-context').isVisible(),true);assert.equal(await exported(),good);await upload('#jc-file',initial);
  await page.locator('#coherentExample').click();assert.equal(await page.locator('#jcs-context').isVisible(),true);assert.equal(await exported(),good);
  await upload('#jc-file',initial);assert.equal(await page.locator('#jcs-context').isVisible(),false);
  receipt.checks.push('completed challenge and training replacements retain the accepted sequence and visibly mark its separate original context');

  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.locator('#jointChallengeSequence').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'sequence overview overflow '+width);
    const overview=new URL('sequence-'+width+'-overview.png',out);await page.screenshot({path:overview.pathname});let bytes=await readFile(overview);receipt.screenshots.push({path:overview.pathname,width,kind:'overview',bytes:bytes.length,sha256:sha(bytes)});
    await page.locator('#jcs-outcome-label').focus();await page.keyboard.press('Control+A');await page.keyboard.type('Keyboard sequence '+width);await page.keyboard.press('Tab');
    assert.equal(await page.locator('#jcs-class').evaluate(node=>node===document.activeElement),true);
    assert.ok(await page.locator('#jcs-class').evaluate(node=>getComputedStyle(node).outlineStyle!=='none'&&parseFloat(getComputedStyle(node).outlineWidth)>=2));
    const round=page.locator('#jcs-history > details').nth(1);await round.evaluate(node=>node.open=false);await round.locator(':scope > summary').focus();await page.keyboard.press('Enter');
    assert.equal(await round.evaluate(node=>node.open),true);assert.equal(await round.locator(':scope > summary').evaluate(node=>node===document.activeElement),true);
    await round.evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'sequence retained evidence overflow '+width);
    const details=new URL('sequence-'+width+'-details.png',out);await page.screenshot({path:details.pathname});bytes=await readFile(details);receipt.screenshots.push({path:details.pathname,width,kind:'retained-evidence',bytes:bytes.length,sha256:sha(bytes)});
    assert.match(await round.innerText(),/Authored example/);assert.match(await round.innerText(),/Left clearance: \(20, 90\) mm/);
  }
  receipt.checks.push('actual 1440/390/320 overview and original-evidence layouts, no overflow, trusted keyboard disclosure and visible focus');

  await upload('#jcs-file',diagnosticCases['cross-round-pair']);await combinations(0);
  const crossRound=await exported(),conflicts=page.locator('#jcs-conflicts');
  assert.equal(await conflicts.getAttribute('data-groups'),'1');assert.equal(await conflicts.getAttribute('data-subsets'),'3');
  assert.match(await conflicts.innerText(),/25 original combinations/);assert.match(await conflicts.innerText(),/Earlier predictions keep their own prior-source prefixes/);
  const group=conflicts.locator('[data-conflict-group]').first();await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');
  assert.equal(await group.evaluate(node=>node.open),true);
  assert.match(await group.innerText(),/Initial course · retained/);assert.match(await group.innerText(),/Round 1 · current/);
  assert.match(await group.innerText(),/first-workpiece-guide/);assert.match(await group.innerText(),/later-workpiece-guide/);
  for(const id of ['first-workpiece','later-workpiece']){
    await group.locator('[data-jcs-inspect="'+id+'"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.workpiece),id);
    const original=page.locator('#jcs-history [data-workpiece="'+id+'"]');
    assert.match(await original.innerText(),/Authored/);
    assert.equal(await original.locator('button').count(),id==='first-workpiece'?0:2);
  }
  assert.equal(await exported(),crossRound);
  const namedInitial=JSON.parse(crossRound);namedInitial.rounds[0].id='initial';await upload('#jcs-file',namedInitial);await combinations(0);
  await conflicts.locator('[data-jcs-inspect="later-workpiece"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.workpiece),'later-workpiece');
  assert.equal(await page.locator('#jcs-history [data-workpiece="later-workpiece"] button').count(),2);
  receipt.checks.push('retrospective cross-round minimal group, original rejecting observations, trusted source navigation and sealed/current custody');

  await upload('#jcs-file',diagnosticCases['six-workpieces-five-alternative-conflicts']);await combinations(0);
  assert.equal(await conflicts.getAttribute('data-groups'),'5');assert.equal(await conflicts.getAttribute('data-subsets'),'63');
  assert.equal(await conflicts.locator('[data-conflict-group]').count(),5);
  const capacity=await exported(),expanded=conflicts.locator('[data-conflict-group]').first();
  await expanded.locator(':scope > summary').focus();await page.keyboard.press('Enter');assert.equal(await expanded.evaluate(node=>node.open),true);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await conflicts.scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'retrospective conflict overflow '+width);
    const path=new URL('sequence-conflicts-'+width+'.png',out);await conflicts.screenshot({path:path.pathname});const bytes=await readFile(path);receipt.screenshots.push({path:path.pathname,width,kind:'retrospective-conflicts',bytes:bytes.length,sha256:sha(bytes)});
  }
  assert.equal(await exported(),capacity);
  receipt.checks.push('all five alternative minimal pairs at63-subset capacity, actual1440/390/320 source-linked conflict layouts');

  const prior=JSON.parse(capacity);await receive('guide',20,210,{keyboard:true});await combinations(1);
  assert.equal(await conflicts.getAttribute('data-groups'),'0');const correctedCapacity=JSON.parse(await exported());
  assert.deepEqual(correctedCapacity.initial,prior.initial);assert.deepEqual(correctedCapacity.rounds.slice(0,-1),prior.rounds.slice(0,-1));assert.deepEqual(correctedCapacity.rounds.at(-1).prefix,prior.rounds.at(-1).prefix);
  await upload('#jcs-file',diagnosticCases['sealed-missing-and-imprecise']);await combinations(25);
  assert.equal(await conflicts.getAttribute('data-groups'),'0');assert.match(await conflicts.innerText(),/No qualified outcomes can constrain/);
  const sourceOnly=await exported(),cached=JSON.parse(sourceOnly);cached.minimalGroups=[['invented']];cached.workpieces=[];await upload('#jcs-file',cached);assert.equal(await exported(),sourceOnly);
  const broken=JSON.parse(sourceOnly);broken.rounds[0].prefix.initial.plan.label='Forged prior';await upload('#jcs-file',broken);assert.equal(await page.locator('#jcs-error').isVisible(),true);assert.equal(await exported(),sourceOnly);
  await upload('#jcs-file',good);
  receipt.checks.push('current-only correction clears conflicts without altering sealed source, missing/imprecise non-elimination and refused cached/prefix replacement');
  for(const path of ['src/joint-challenge-sequence.mjs','web/joint-challenge-sequence.mjs','web/joint-challenge.mjs','web/joint-challenge.css']){
    const response=await page.request.get(base+'/'+path);assert.equal(response.status(),200);assert.equal(sha(await response.body()),sha(await readFile(new URL('../'+path,import.meta.url))));
  }
  assert.equal((await page.request.get(base+'/test/support/joint-challenge-sequence-fixtures.mjs')).status(),404);
  assert.equal((await page.request.get(base+'/test/support/joint-challenge-sequence-conflicts-cases.json')).status(),404);
  assert.equal((await page.request.get(base+'/tools/browser-joint-challenge-sequence.mjs')).status(),404);
  assert.deepEqual(errors,[]);receipt.checks.push('exact served continuation and parent source, private harness/fixtures, no browser exceptions');
  receipt.status='passed';receipt.browserVersion=await browser.version();
}catch(error){receipt.status='failed';receipt.error=String(error.stack??error);throw error;}
finally{if(browser)await browser.close();receipt.completedAt=new Date().toISOString();await writeFile(new URL('receipt.json',out),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,groups:receipt.checks.length,receipt:new URL('receipt.json',out).pathname,error:receipt.error??null}));}
