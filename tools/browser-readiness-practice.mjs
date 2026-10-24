import {createRequire} from 'node:module';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
async function sourceManifest(){
  const pending=['server.mjs','web/task-readiness.html','web/task-readiness.css','web/task-readiness.mjs','web/practice.html','web/practice.css','web/styles.css','web/practice.mjs','tools/browser-readiness-practice.mjs'],seen=new Set(),files=[];
  while(pending.length){
    const path=pending.pop();if(seen.has(path))continue;seen.add(path);
    const absolute=resolve(root,path);if(!absolute.startsWith(root))throw Error('Source dependency escaped checkout');
    const bytes=await readFile(absolute);files.push({path,sha256:sha256(bytes),bytes:bytes.length});
    if(!path.endsWith('.mjs'))continue;
    for(const match of bytes.toString('utf8').matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)){
      const spec=match[1];if(spec.startsWith('/src/')||spec.startsWith('/web/')||spec.startsWith('/vendor/'))pending.push(spec.slice(1));
      else if(spec.startsWith('.'))pending.push(relative(root,resolve(dirname(absolute),spec)));
    }
  }
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}
const sources=await sourceManifest();
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const dir=await mkdtemp(join(tmpdir(),'skill-evidence-explanation-'));
const output=process.env.QA_OUTPUT||join(dir,'receipt');await mkdir(output,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true,protocolTimeout:30000});
const page=await browser.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.setViewport({width:1280,height:900});
  await page.goto(origin+'/task-readiness');
  // Generate original authored PNG controls, then admit them through the exact
  // production sequence-bundle reader. No downloaded/public media is involved.
  const bundle=await page.evaluate(async()=>{
    const {createSequence,appendMoment,upsertStep}=await import('/src/demonstration-sequence.mjs');
    const {frameOrigin}=await import('/src/frame-origin.mjs');
    const {createPrerequisiteRehearsal}=await import('/src/prerequisite-rehearsal.mjs');
    const clip={name:'authored-readiness.webm',mimeType:'video/webm',sizeBytes:1234,sha256:'a'.repeat(64),durationSeconds:10};
    let sequence=createSequence(clip,{title:'Authored support, alignment and joining control'});const frames=[];
    for(let i=0;i<5;i++){
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle=['#ffdca0','#b2dfdb','#a8c4f0','#e8bddb','#d1e5a6'][i];ctx.fillRect(0,0,320,180);ctx.fillStyle='#173339';ctx.font='24px sans-serif';ctx.fillText('Authored state '+i,30,90);
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png')),bytes=await blob.arrayBuffer(),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
      const image={name:`frame-${i}.png`,mimeType:'image/png',sha256,widthPx:320,heightPx:180,pixelCoordinates:'browser-oriented'};
      sequence=appendMoment(sequence,{id:`moment-${i}`,label:`Authored state ${i}`,visibleState:'Explicit authored example',image,origin:frameOrigin(clip,i,{mediaTime:i,width:320,height:180},image)});
      frames.push({momentId:`moment-${i}`,pngBase64:canvas.toDataURL('image/png').split(',')[1]});
    }
    for(const [i,id] of ['prepare','align','finish','inspect'].entries())sequence=upsertStep(sequence,{id,beforeMomentId:`moment-${i}`,afterMomentId:`moment-${i+1}`,title:id,intent:`Authored ${id} intention`,visibleChange:'Supplied account',sensoryCue:'Not measured',recoveryCue:'Reassess prerequisites'});
    const {createCapture}=await import('/src/capture.mjs');
    const {attachMomentCalibration}=await import('/src/demonstration-sequence.mjs');
    const task=createCapture(sequence.moments[1].image,[{x:0,y:0},{x:320,y:0},{x:320,y:180},{x:0,y:180}],160,90);
    task.landmarks=[{id:'center',label:'Center registration',kind:'fraction',sourcePx:{x:160,y:90},toleranceMm:1,why:'Authored criterion'},{id:'index',label:'Index registration',kind:'fraction',sourcePx:{x:80,y:45},toleranceMm:1,why:'Second authored criterion'}];
    sequence=attachMomentCalibration(sequence,'moment-1',task);
    const rehearsal=createPrerequisiteRehearsal(sequence,[{before:'prepare',after:'align',reason:'Support before registration'},{before:'prepare',after:'inspect',reason:'Support before inspection'},{before:'align',after:'finish',reason:'Registration before joining'},{before:'inspect',after:'finish',reason:'Inspection before joining'}]);
    rehearsal.attempt=['prepare','align'];
    return {format:'skill-translator.prerequisite-bundle/v1',sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames},rehearsal};
  });
  const sourcePath=join(dir,'authored-sequence.json');await writeFile(sourcePath,JSON.stringify(bundle));
  await writeFile(join(output,'authored-prerequisite-bundle.json'),await readFile(sourcePath));
  await (await page.$('#source-file')).uploadFile(sourcePath);await page.waitForSelector('#authoring:not([hidden])');
  await page.evaluate(()=>{
    [...document.querySelectorAll('#definitions fieldset')].forEach((f,i)=>{f.querySelector('.prompt').value=i===0?'Both after-state marks meet placement tolerances':'Reported completion';f.querySelector('.basis').value='Authored geometric teaching control';});
    document.querySelector('.placement-binding').checked=true;
  });
  await page.click('#freeze');await page.waitForSelector('#lesson:not([hidden])');
  assert.equal(await page.$eval('#manual-report',e=>e.hidden),true);
  const popup=browser.waitForTarget(t=>t.opener()===page.target());await page.click('#open-practice');const practice=await (await popup).page();practice.setDefaultTimeout(15000);practice.on('pageerror',e=>errors.push(String(e)));
  await practice.waitForSelector('#practiceMarks button[data-id="center"]');assert.match(await practice.$eval('#setupLabel',e=>e.textContent),/160 × 90 mm/);
  const practiceCdp=await practice.createCDPSession();
  async function exportPractice(name){await practice.bringToFront();console.log('Exporting '+name);const folder=join(dir,name);await mkdir(folder);await practiceCdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:folder});await practice.click('#savePractice');await new Promise(r=>setTimeout(r,400));const path=join(folder,'skill-practice-session.json');await writeFile(join(output,name+'.json'),await readFile(path));return path;}
  async function importPracticeFile(path,target=page){await target.bringToFront();console.log('Importing '+path);await target.select('#step','prepare');await (await target.$('#practice-file')).uploadFile(path);await target.waitForFunction(()=>!document.getElementById('retain-practice').disabled);}
  async function retain(note){await page.$eval('#note',(e,t)=>{e.value=t;},note);await page.click('#retain-practice');}
  async function choose(target=page){await target.select('#step','align');await target.select('#prediction','ready');await target.type('#reason','Compare the retained placement evidence with the declared prerequisite');await target.click('#choose');}
  const empty=await exportPractice('actual-empty-practice');await importPracticeFile(empty);assert.match(await page.$eval('#practice-preview',e=>e.textContent),/unknown/);await retain('Actual empty practice session; no placed marks');await choose();assert.match(await page.$eval('#finding',e=>e.textContent),/Prerequisites are not established/);
  async function place(id,x,y){await practice.bringToFront();await practice.click(`#practiceMarks button[data-id="${id}"]`);await practice.$eval('#placementX',(e,v)=>e.value=v,x);await practice.$eval('#placementY',(e,v)=>e.value=v,y);await practice.click('#placementForm button[type="submit"]');}
  await place('center',83,45);await place('index',40,22.5);await practice.click('#reviewTask');
  const failed=await exportPractice('actual-failed-practice');await importPracticeFile(failed);assert.match(await page.$eval('#practice-preview',e=>e.textContent),/error 3.000 mm against 1 mm/);await retain('Actual authored control: center is three millimetres outside target');await choose();assert.match(await page.$eval('#finding',e=>e.textContent),/Prerequisites are not established/);
  await place('center',80,45);await practice.click('#reviewTask');const passed=await exportPractice('actual-passing-practice');await importPracticeFile(passed);assert.match(await page.$eval('#practice-preview',e=>e.textContent),/check: pass/);await retain('Actual authored control: both placements meet tolerance');await choose();assert.match(await page.$eval('#finding',e=>e.textContent),/Declared prerequisites are satisfied/);
  await page.select('#value','pass');await page.type('#note','Authored downstream completion');await page.click('#observe');
  await importPracticeFile(empty);await retain('Revised evidence: a fresh empty practice attempt');await choose();assert.match(await page.$eval('#history',e=>e.textContent),/cleared for align/);assert.match(await page.$eval('#finding',e=>e.textContent),/Prerequisites are not established/);
  const before=await page.$eval('#ledger',e=>e.textContent),foreign=JSON.parse(await readFile(passed,'utf8'));foreign.reference.target.widthMm=161;const bad=join(dir,'foreign.json');await writeFile(bad,JSON.stringify(foreign));
  await page.select('#step','prepare');await (await page.$('#practice-file')).uploadFile(bad);await page.waitForFunction(()=>document.getElementById('message').textContent.includes('differ'));assert.equal(await page.$eval('#ledger',e=>e.textContent),before);assert.equal(await page.$eval('#retain-practice',e=>e.disabled),true);
  // Delay an actual file read, switch check context, then release the stale read.
  await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=function(){const promise=original.call(this);return new Promise(resolve=>{window.releasePracticeRead=async()=>resolve(await promise);});};window.restorePracticeRead=()=>File.prototype.text=original;});
  await (await page.$('#practice-file')).uploadFile(passed);await page.waitForFunction(()=>typeof window.releasePracticeRead==='function');await page.select('#step','align');await page.evaluate(()=>window.releasePracticeRead());await page.evaluate(()=>new Promise(r=>setTimeout(r,0)));assert.equal(await page.$eval('#retain-practice',e=>e.disabled),true);assert.equal(await page.$eval('#practice-preview',e=>e.textContent),'');await page.evaluate(()=>window.restorePracticeRead());
  await importPracticeFile(failed);await page.select('#step','align');assert.equal(await page.$eval('#practice-preview',e=>e.textContent),'');
  const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click('#save');await new Promise(r=>setTimeout(r,400));
  const exported=await readFile(join(dir,'task-readiness.json'));await writeFile(join(output,'exported-and-reopened-readiness.json'),exported);const saved=JSON.parse(exported);assert.equal(saved.study.format,'skill-translator.task-readiness/v2');assert.equal(saved.study.events.filter(e=>e.type==='practice').length,4);
  await page.$eval('#message',e=>e.textContent='Awaiting reopened evidence');await (await page.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Source frames validated'));await choose();
  await page.$$eval('#ledger details',nodes=>nodes.forEach(e=>e.open=true));await page.$$eval('.readiness-evidence-explanation details',nodes=>nodes.forEach(e=>e.open=true));await page.waitForFunction(()=>[...document.querySelectorAll('#frames img')].every(i=>i.complete&&i.naturalWidth));
  await page.screenshot({path:join(output,'desktop.png'),fullPage:true});
  const mobile=await browser.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await mobile.setViewport({width:390,height:844});await mobile.goto(origin+'/task-readiness');await (await mobile.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));await mobile.waitForSelector('#lesson:not([hidden])');await choose(mobile);assert.match(await mobile.$eval('#finding',e=>e.textContent),/Prerequisites are not established/);await mobile.$$eval('#ledger details',nodes=>nodes.forEach(e=>e.open=true));await mobile.$$eval('.readiness-evidence-explanation details',nodes=>nodes.forEach(e=>e.open=true));await mobile.waitForFunction(()=>[...document.querySelectorAll('#frames img')].every(i=>i.complete&&i.naturalWidth));assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:join(output,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(await sourceManifest(),sources);
  const artifacts=[];for(const path of ['authored-prerequisite-bundle.json','actual-empty-practice.json','actual-failed-practice.json','actual-passing-practice.json','exported-and-reopened-readiness.json','desktop.png','mobile.png']){const bytes=await readFile(join(output,path));artifacts.push({path,sha256:sha256(bytes),bytes:bytes.length});}
  await writeFile(join(output,'source-sha256.json'),JSON.stringify({files:sources},null,2));
  const runtime={node:process.version,platform:process.platform,arch:process.arch,browser:await browser.version(),configuredChrome:process.env.CHROME_BINARY??null,launchedExecutable:browser.process()?.spawnfile??null,sandboxFlags:browser.process()?.spawnargs.filter(arg=>arg.includes('sandbox'))??[]};
  await writeFile(join(output,'receipt.json'),JSON.stringify({course:'readiness-practice',passed:true,runtime,sources,artifacts,viewports:{desktop:{width:1280,height:900},mobile:{width:390,height:844}},inputBasis:'Original authored PNG/calibration controls; placements entered through the maintained practice consumer, not physical skill evidence',controls:['explicit after-moment practice handoff','actual practice UI empty/fail/pass exports','per-mark errors and missing witnesses','computed evidence changes downstream readiness','revision clears dependent completion','foreign target refuses without mutation','delayed file read and context changes clear drafts','actual v2 save/reopen with original raw sessions','retained images and390px receiving'],errors},null,2));
  console.log(JSON.stringify({passed:true,output}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
