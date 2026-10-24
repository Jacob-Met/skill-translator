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
  const pending=['server.mjs','web/task-readiness.html','web/task-readiness.css','web/task-readiness.mjs','tools/browser-readiness-explanation.mjs'],seen=new Set(),files=[];
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
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
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
    const rehearsal=createPrerequisiteRehearsal(sequence,[{before:'prepare',after:'align',reason:'Support before registration'},{before:'prepare',after:'inspect',reason:'Support before inspection'},{before:'align',after:'finish',reason:'Registration before joining'},{before:'inspect',after:'finish',reason:'Inspection before joining'}]);
    rehearsal.attempt=['prepare','align'];
    return {format:'skill-translator.prerequisite-bundle/v1',sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames},rehearsal};
  });
  const sourcePath=join(dir,'authored-sequence.json');await writeFile(sourcePath,JSON.stringify(bundle));
  await writeFile(join(output,'authored-prerequisite-bundle.json'),await readFile(sourcePath));
  await (await page.$('#source-file')).uploadFile(sourcePath);await page.waitForSelector('#authoring:not([hidden])');
  await page.evaluate(()=>{
    const fields=[...document.querySelectorAll('#definitions fieldset')];
    fields.forEach((f,i)=>{f.querySelector('.prompt').value=['Sheet is supported','Edges are aligned','Join is retained','Reference is visible'][i];f.querySelector('.basis').value='Explicit authored teaching control';});

  });
  assert.equal(await page.$$eval('#definitions .requires',n=>n.length),0);
  assert.match(await page.$eval('#definitions',n=>n.textContent),/Support before registration/);
  await page.click('#freeze');await page.waitForSelector('#lesson:not([hidden])');
  const selector='.readiness-evidence-explanation';
  async function choose(target=page){await target.select('#step','finish');await target.select('#prediction','blocked');await target.type('#reason','Inspect the reports that block this declared task');await target.click('#choose');}
  async function report(step,value,note){await page.select('#step',step);await page.select('#value',value);await page.select('#evidence-class','authored-example');await page.type('#note',note);await page.click('#observe');assert.equal(await page.$(selector),null,'An observation edit must clear the previous explanation');}
  const visibleSteps=target=>target.$$eval('.readiness-evidence-explanation article',nodes=>nodes.map(n=>n.dataset.stepId));
  await choose();assert.deepEqual(await visibleSteps(page),['prepare']);
  assert.match(await page.$eval(selector,n=>n.textContent),/No retained observation/);
  assert.equal(await page.$$eval(selector+' ul li',nodes=>nodes.length),4);
  assert.match(await page.$eval(selector,n=>n.textContent),/Support before inspection/);
  await report('prepare','unknown','Authored control: support has not been established');await choose();
  assert.match(await page.$eval(selector,n=>n.textContent),/Reported as unknown/);assert.match(await page.$eval(selector,n=>n.textContent),/support has not been established/);
  await report('prepare','fail','Authored control: support check was unsatisfied');await choose();
  assert.match(await page.$eval(selector,n=>n.textContent),/Reported as unsatisfied/);assert.match(await page.$eval(selector,n=>n.textContent),/support check was unsatisfied/);
  await report('prepare','pass','Authored control: support check is now satisfied');await choose();assert.deepEqual(await visibleSteps(page),['align','inspect']);
  await report('align','pass','Authored alignment report');await choose();assert.deepEqual(await visibleSteps(page),['inspect']);
  await report('inspect','pass','Authored inspection report');await choose();assert.deepEqual(await visibleSteps(page),[]);assert.match(await page.$eval(selector,n=>n.textContent),/selected step’s own completion/);
  await report('prepare','unknown','Authored support revision: needs another observation');await choose();assert.deepEqual(await visibleSteps(page),['prepare']);assert.match(await page.$eval('#history',n=>n.textContent),/cleared for align, inspect/);
  const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click('#save');await new Promise(r=>setTimeout(r,500));
  const exportedBytes=await readFile(join(dir,'task-readiness.json'));await writeFile(join(output,'exported-and-reopened-readiness.json'),exportedBytes);
  const saved=JSON.parse(exportedBytes.toString('utf8'));assert.deepEqual(saved.study.prerequisites,bundle.rehearsal);
  await (await page.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));await page.waitForFunction(()=>document.getElementById('finding').textContent==='');await choose();
  assert.deepEqual(await visibleSteps(page),['prepare']);assert.match(await page.$eval(selector,n=>n.textContent),/needs another observation/);
  const acceptedHistory=await page.$eval('#history',n=>n.textContent);saved.study.source.steps[0].intent+=' altered';const badPath=join(dir,'bad-source.json');await writeFile(badPath,JSON.stringify(saved));
  await (await page.$('#study-file')).uploadFile(badPath);await page.waitForFunction(()=>document.getElementById('message').textContent.includes('changed'));assert.equal(await page.$eval('#history',n=>n.textContent),acceptedHistory);
  await page.$eval(selector+' article details',n=>n.open=true);await page.$eval(selector+' > details',n=>n.open=true);
  await page.waitForFunction(()=>[...document.querySelectorAll('.readiness-evidence-explanation img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.match(await page.$eval(selector+' article',n=>n.textContent),/Before: Authored state 0/);assert.match(await page.$eval(selector+' article',n=>n.textContent),/After: Authored state 1/);
  await page.screenshot({path:join(output,'desktop.png'),fullPage:true});
  const mobile=await browser.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await mobile.setViewport({width:390,height:844});await mobile.goto(origin+'/task-readiness');await (await mobile.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));await mobile.waitForSelector('#lesson:not([hidden])');await choose(mobile);
  assert.deepEqual(await visibleSteps(mobile),['prepare']);assert.match(await mobile.$eval(selector,n=>n.textContent),/Reported as unknown/);
  await mobile.$eval(selector+' article details',n=>n.open=true);await mobile.$eval(selector+' > details',n=>n.open=true);
  await mobile.waitForFunction(()=>[...document.querySelectorAll('.readiness-evidence-explanation img')].every(i=>i.complete&&i.naturalWidth>0));assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.screenshot({path:join(output,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(await sourceManifest(),sources,'Runtime source changed during receiving');
  const artifacts=[];for(const path of ['authored-prerequisite-bundle.json','exported-and-reopened-readiness.json','desktop.png','mobile.png']){const bytes=await readFile(join(output,path));artifacts.push({path,sha256:sha256(bytes),bytes:bytes.length});}
  await writeFile(join(output,'source-sha256.json'),JSON.stringify({files:sources},null,2));
  const runtime={node:process.version,platform:process.platform,arch:process.arch,browser:await browser.version(),configuredChrome:process.env.CHROME_BINARY??null,launchedExecutable:browser.process()?.spawnfile??null,sandboxFlags:browser.process()?.spawnargs.filter(arg=>arg.includes('sandbox'))??[]};
  await writeFile(join(output,'receipt.json'),JSON.stringify({course:'readiness-explanation',passed:true,runtime,sources,artifacts,viewports:{desktop:{width:1280,height:900},mobile:{width:390,height:844}},inputBasis:'Original authored PNG controls wrapped using the maintained prerequisite validator; not a physical demonstration or upstream UI recording',controls:['diamond ancestry and single earliest missing check','distinct unknown and unsatisfied reports with original notes','independent branch requests after upstream completion','ready prerequisites do not imply selected-step completion','upstream revision invalidation and stale explanation clearing','actual export/reopen and changed-source refusal','exact retained prerequisite frames and390px layout'],errors},null,2));
  console.log(JSON.stringify({passed:true,output}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
