// Real-browser receiving of source/evidence imports while other accepted work
// proceeds. Install in repository tools/ and run through an authorized host.
// Delayed File.text controls only read completion; all files enter real DOM
// file inputs and all retained evidence is checked through the download button.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {createObservation,exportEvidence} from '../src/evidence.mjs';

const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const server=createAppServer();
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port;
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/observation-import-races');
await mkdir(out,{recursive:true});
const fixture={title:'Analytic source A',provenance:'Authored analytic controls, not physical learning evidence',
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:2}]};
const replacement=structuredClone(fixture);
replacement.title='Analytic source B';replacement.source.widthMm=101;
const row=(label,id='trial')=>createObservation(fixture,{id,landmarkId:'guide',label,
  evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.5});
const bundles={
  seed:exportEvidence(fixture,[row('Retained baseline')]),
  older:exportEvidence(fixture,[row('Older delayed evidence')]),
  newer:exportEvidence(fixture,[row('Newer accepted evidence')]),
};
const paths={};
async function fixtureFile(name,value){const path=out+'/'+name;await writeFile(path,typeof value==='string'?value:JSON.stringify(value,null,2));return path;}
paths.source=await fixtureFile('source-a.json',fixture);
paths.replacement=await fixtureFile('source-b.json',replacement);
for(const [name,value] of Object.entries(bundles))paths[name]=await fixtureFile(name+'-observations.json',value);
paths.invalid=await fixtureFile('invalid-observations.json',{schema:'not-the-observation-schema',observations:[]});
paths.oversized=await fixtureFile('oversized-observations.json',' '.repeat(256*1024+1));
const report={course:'accepted source and evidence survive stale asynchronous observation imports',
  evidence:'authored analytic fixtures; actual browser file inputs and downloaded blobs',tests:[],browser:null};
const offsite=[];let browser;

function watch(page){
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(!r.url().startsWith(url+'/')&&!r.url().startsWith('blob:'))offsite.push(r.url());});
  return errors;
}
async function setup(width=1380){
  const page=await browser.newPage();const errors=watch(page);
  await page.setViewport({width,height:width===390?844:960,deviceScaleFactor:1});
  await page.goto(url+'/',{waitUntil:'networkidle0'});
  await page.evaluate(()=>{
    window.__readGates={};
    const originalText=File.prototype.text;
    File.prototype.text=function(){
      const gate=window.__readGates[this.name];
      if(!gate)return originalText.call(this);
      gate.started=true;
      return new Promise((resolve,reject)=>{
        gate.release=()=>originalText.call(this).then(resolve,reject);
        gate.reject=()=>reject(new Error('Controlled delayed read failure'));
      });
    };
    const originalURL=URL.createObjectURL.bind(URL);
    URL.createObjectURL=blob=>{window.__lastDownload=blob;return originalURL(blob);};
  });
  await upload(page,'demoFile',paths.source);
  await page.waitForFunction(()=>document.getElementById('demoLabel').textContent.includes('Analytic source A'));
  return {page,errors};
}
async function upload(page,id,path){await (await page.$('#'+id)).uploadFile(path);}
async function flush(page){await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));}
async function delay(page,path){
  const name=path.split('/').at(-1);
  await page.evaluate(name=>{window.__readGates[name]={started:false};},name);
  await upload(page,'observationFile',path);
  await page.waitForFunction(name=>window.__readGates[name]?.started,{},name);
  return name;
}
async function release(page,name,reject=false){
  await page.evaluate(async({name,reject})=>{const gate=window.__readGates[name];delete window.__readGates[name];if(reject)gate.reject();else await gate.release();},{name,reject});
  await flush(page);
}
async function imported(page,path,label){
  await upload(page,'observationFile',path);
  await page.waitForFunction(label=>document.getElementById('observationRows').textContent.includes(label),{},label);
}
async function enter(page,label){
  await page.evaluate(label=>{
    const values={obsLabel:label,obsClass:'authored-example',obsWidth:200,obsHeight:160,obsX:20,obsY:60,obsUncertainty:.5};
    for(const [id,value] of Object.entries(values))document.getElementById(id).value=String(value);
    document.getElementById('observationForm').requestSubmit();
  },label);
  await page.waitForFunction(label=>document.getElementById('observationRows').textContent.includes(label),{},label);
}
async function download(page,id='exportObservations',keyboard=false){
  await page.evaluate(()=>{window.__lastDownload=null;});
  if(keyboard){await page.focus('#'+id);await page.keyboard.press('Enter');}else await page.click('#'+id);
  await page.waitForFunction(()=>window.__lastDownload instanceof Blob,{timeout:2500});
  return page.evaluate(async()=>JSON.parse(await window.__lastDownload.text()));
}
async function labels(page){return (await download(page)).observations.map(o=>o.label);}
async function state(page){return page.evaluate(()=>({
  source:document.getElementById('demoLabel').textContent,
  evidenceStatus:document.getElementById('evidenceStatus').textContent,
  error:document.getElementById('error').textContent,
  rows:document.getElementById('observationRows').textContent,
  selectedFile:document.getElementById('observationFile').files[0]?.name??null,
}));}
async function run(name,work,width=1380){
  const {page,errors}=await setup(width);const result={name};
  try{await work(page);assert.deepEqual(errors,[]);result.result='PASS';}
  catch(error){result.result='FAIL';result.error=String(error);result.state=await state(page);result.pageErrors=errors;}
  finally{report.tests.push(result);console.log(JSON.stringify(result));await page.close();}
}
try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check',...(process.env.CHROME_NO_SANDBOX==='1'?['--no-sandbox']:[])]});
  report.browser=await browser.version();

  await run('source replacement retains new source evidence after an old-source read completes',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await upload(page,'demoFile',paths.replacement);
    await page.waitForFunction(()=>document.getElementById('demoLabel').textContent.includes('Analytic source B'));
    await enter(page,'Accepted for source B');
    await release(page,pending);
    const retained=await download(page);
    assert.deepEqual(retained.observations.map(o=>o.label),['Accepted for source B']);
    assert.equal(retained.observations[0].sourceReference.source.widthMm,101);
    assert.equal((await state(page)).error,'');
  });
  await run('newer selected evidence wins when reads finish out of order',async page=>{
    const pending=await delay(page,paths.older);
    await imported(page,paths.newer,'Newer accepted evidence');
    await release(page,pending);
    assert.deepEqual(await labels(page),['Newer accepted evidence']);
  });
  await run('accepted observation addition survives a pending evidence import',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await enter(page,'Accepted local addition');
    await release(page,pending);
    assert.deepEqual(await labels(page),['Retained baseline','Accepted local addition']);
    assert.equal((await state(page)).selectedFile,null,'retired latest selection must allow the same file to be chosen again');
    await imported(page,paths.older,'Older delayed evidence');
    assert.deepEqual(await labels(page),['Older delayed evidence']);
  });
  await run('accepted observation removal cannot be undone by a pending evidence import',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await page.click('button[aria-label="Remove Retained baseline"]');
    await release(page,pending);
    assert.deepEqual(await labels(page),[]);
    assert.equal((await state(page)).selectedFile,null);
  });
  await run('stale read rejection cannot replace newer accepted status or error',async page=>{
    const pending=await delay(page,paths.older);
    await imported(page,paths.newer,'Newer accepted evidence');
    const accepted=await state(page);
    await release(page,pending,true);
    const after=await state(page);
    assert.equal(after.error,accepted.error);
    assert.equal(after.evidenceStatus,accepted.evidenceStatus);
    assert.deepEqual(await labels(page),['Newer accepted evidence']);
  });
  await run('stale cleanup preserves the later pending file selection',async page=>{
    const older=await delay(page,paths.older),newer=await delay(page,paths.newer);
    await release(page,older);
    assert.equal((await state(page)).selectedFile,'newer-observations.json');
    await release(page,newer);
    assert.deepEqual(await labels(page),['Newer accepted evidence']);
  });
  await run('accepted source annotation preserves existing evidence while retiring older reads',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await page.evaluate(()=>{
      const values={sourceX:40,sourceY:40,annotationLabel:'Accepted new mark',annotationKind:'fraction',annotationTolerance:2};
      for(const [id,value] of Object.entries(values))document.getElementById(id).value=String(value);
      document.getElementById('authorForm').requestSubmit();
    });
    await page.waitForFunction(()=>document.getElementById('demoLabel').textContent.includes('2 source marks'));
    await release(page,pending);
    assert.deepEqual(await labels(page),['Retained baseline']);
    assert.equal((await state(page)).selectedFile,null);
    assert.equal((await download(page,'downloadSource')).landmarks.length,2);
  });
  await run('latest invalid selection retains accepted evidence and retires an older valid read',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await upload(page,'observationFile',paths.invalid);
    await page.waitForFunction(()=>document.getElementById('error').textContent.includes('Unsupported observation file schema'));
    const accepted=await state(page);
    await release(page,pending);
    assert.deepEqual(await labels(page),['Retained baseline']);
    assert.equal((await state(page)).error,accepted.error);
  });
  await run('latest oversized selection retires an older valid read before file decoding',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    const pending=await delay(page,paths.older);
    await upload(page,'observationFile',paths.oversized);
    await page.waitForFunction(()=>document.getElementById('error').textContent.includes('Observation file must be'));
    const accepted=await state(page);
    await release(page,pending);
    assert.deepEqual(await labels(page),['Retained baseline']);
    assert.equal((await state(page)).error,accepted.error);
  });
  await run('keyboard export and fresh 390px reopen retain exact source-bound observations',async page=>{
    await imported(page,paths.seed,'Retained baseline');
    await enter(page,'Saved second trial');
    const saved=await download(page,'exportObservations',true);
    const source=await download(page,'downloadSource',true);
    const savedPath=await fixtureFile('saved-browser-evidence.json',saved);
    const sourcePath=await fixtureFile('saved-browser-source.json',source);
    const mobile=await browser.newPage(),mobileErrors=watch(mobile);
    try{
      await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});
      await mobile.goto(url+'/',{waitUntil:'networkidle0'});
      await mobile.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__lastDownload=blob;return original(blob);};});
      await upload(mobile,'demoFile',sourcePath);
      await mobile.waitForFunction(()=>document.getElementById('demoLabel').textContent.includes('Analytic source A'));
      await imported(mobile,savedPath,'Saved second trial');
      assert.deepEqual(await download(mobile,'exportObservations',true),saved);
      const width=await mobile.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(width.page<=width.viewport+2,JSON.stringify(width));
      await mobile.focus('button[aria-label="Remove Saved second trial"]');await mobile.keyboard.press('Enter');
      assert.deepEqual((await download(mobile,'exportObservations',true)).observations.map(o=>o.label),['Retained baseline']);
      await (await mobile.$('#evidenceLab')).screenshot({path:out+'/mobile-reopened-evidence.png'});
      assert.deepEqual(mobileErrors,[]);
    }finally{await mobile.close();}
    await (await page.$('#evidenceLab')).screenshot({path:out+'/desktop-retained-evidence.png'});
  });
  report.offsite=offsite;report.result=report.tests.every(test=>test.result==='PASS')&&offsite.length===0?'PASS':'FAIL';
  if(report.result!=='PASS')process.exitCode=1;
  console.log(JSON.stringify(report,null,2));
}finally{
  await writeFile(out+'/browser-race-receipt.json',JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
