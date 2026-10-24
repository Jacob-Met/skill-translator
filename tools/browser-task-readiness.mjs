import {createRequire} from 'node:module';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const dir=await mkdtemp(join(tmpdir(),'skill-readiness-'));
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
    return {format:'skill-translator.sequence-bundle/v1',sequence,frames};
  });
  const sourcePath=join(dir,'authored-sequence.json');await writeFile(sourcePath,JSON.stringify(bundle));
  await (await page.$('#source-file')).uploadFile(sourcePath);await page.waitForSelector('#authoring:not([hidden])');
  await page.evaluate(()=>{
    const fields=[...document.querySelectorAll('#definitions fieldset')];
    fields.forEach((f,i)=>{f.querySelector('.prompt').value=['Sheet is supported','Edges are aligned','Join is retained','Reference is visible'][i];f.querySelector('.basis').value='Explicit authored teaching control';});
    fields[1].querySelector('input[value="prepare"]').click();fields[2].querySelector('input[value="align"]').click();
  });
  await page.click('#freeze');await page.waitForSelector('#lesson:not([hidden])');
  await page.select('#step','align');await page.select('#prediction','ready');await page.type('#reason','I overlooked the missing support evidence');await page.click('#choose');
  assert.match(await page.$eval('#finding',n=>n.textContent),/not established/);
  // The prerequisite's after frame is also this step's before frame: preserve
  // exact identity and display it once instead of inventing another observation.
  assert.equal(await page.$$eval('#frames img',imgs=>imgs.length),2);
  await page.waitForFunction(()=>[...document.querySelectorAll('#frames img')].every(i=>i.complete&&i.naturalWidth>0));
  async function observe(step){await page.select('#step',step);await page.select('#value','pass');await page.select('#evidence-class','authored-example');await page.$eval('#note',n=>n.value='Authored observed state');await page.click('#observe');}
  await observe('prepare');await page.type('#note','Unsubmitted note for prepare');await page.select('#value','pass');await page.type('#reason','Unsubmitted judgment for prepare');await page.select('#prediction','ready');await page.select('#step','align');
  assert.equal(await page.$eval('#note',n=>n.value),'');assert.equal(await page.$eval('#value',n=>n.value),'unknown');
  assert.equal(await page.$eval('#reason',n=>n.value),'');assert.equal(await page.$eval('#prediction',n=>n.value),'uncertain');
  await page.type('#reason','Now there is reported support evidence');await page.select('#prediction','ready');await page.click('#choose');assert.match(await page.$eval('#finding',n=>n.textContent),/prerequisites are satisfied/);
  await observe('align');await observe('finish');await observe('inspect');await observe('prepare');
  assert.match(await page.$eval('#history',n=>n.textContent),/cleared for align, finish/);
  const ledger=await page.$eval('#ledger',n=>n.textContent);assert.match(ledger,/Edges are aligned: No retained observation/);assert.match(ledger,/Reference is visible: pass/);
  const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click('#save');
  await new Promise(r=>setTimeout(r,500));
  await page.type('#note','Unsubmitted note before reopen');await page.select('#value','pass');await page.type('#reason','Unsubmitted judgment before reopen');
  await (await page.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));
  await page.waitForFunction(()=>document.getElementById('note').value==='');
  assert.equal(await page.$eval('#value',n=>n.value),'unknown');assert.equal(await page.$eval('#reason',n=>n.value),'');assert.equal(await page.$eval('#prediction',n=>n.value),'uncertain');
  const saved=JSON.parse(await readFile(join(dir,'task-readiness.json'),'utf8'));
  saved.study.source.steps[0].intent+=' changed account';const badPath=join(dir,'mismatched-study.json');await writeFile(badPath,JSON.stringify(saved));
  const acceptedHistory=await page.$eval('#history',n=>n.textContent);
  await (await page.$('#study-file')).uploadFile(badPath);await page.waitForFunction(()=>document.getElementById('message').textContent.includes('changed'));
  assert.equal(await page.$eval('#history',n=>n.textContent),acceptedHistory);
  await page.select('#step','finish');await page.select('#prediction','blocked');await page.type('#reason','The upstream revision cleared the reported alignment result');await page.click('#choose');
  await page.waitForFunction(()=>document.querySelectorAll('#frames img').length>0&&[...document.querySelectorAll('#frames img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:join(output,'desktop.png'),fullPage:true});
  const mobile=await browser.newPage();await mobile.setViewport({width:390,height:844});await mobile.goto(origin+'/task-readiness');await (await mobile.$('#study-file')).uploadFile(join(dir,'task-readiness.json'));await mobile.waitForSelector('#lesson:not([hidden])');
  assert.match(await mobile.$eval('#history',n=>n.textContent),/cleared for align, finish/);
  await mobile.select('#step','finish');await mobile.select('#prediction','blocked');await mobile.type('#reason','Alignment needs a new observation after the revision');await mobile.click('#choose');
  await mobile.waitForFunction(()=>document.querySelectorAll('#frames img').length>0&&[...document.querySelectorAll('#frames img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.screenshot({path:join(output,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);await writeFile(join(output,'receipt.json'),JSON.stringify({course:'task-readiness',passed:true,controls:['retained PNG admission','committed judgment and prerequisite witness','upstream revision invalidation','independent branch retention','actual download and fresh mobile reopen','390px overflow'],errors},null,2));
  console.log(JSON.stringify({passed:true,output}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
