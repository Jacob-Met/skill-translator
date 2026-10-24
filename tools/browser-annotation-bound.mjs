// Actual local photo -> inspector -> unchanged practice course. Uses existing
// Puppeteer/Chrome supplied by the receiver; never installs or changes sandbox.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAppServer} from '../server.mjs';
import {createPractice} from '../src/practice.mjs';
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_PATH));
const out=resolve(process.env.QA_OUTPUT||'/tmp/skill-annotation-bound-receiving');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true});
const errors=[],requests=[],groups=[];let p=await browser.newPage(),active=p,sandbox=null;
const bounded=(promise,ms=3000)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Evidence timeout')),ms);timer.unref();})]);
function watch(p){p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))requests.push(r.url());});}
try{
 const sandboxPage=await browser.newPage();active=sandboxPage;await sandboxPage.goto('chrome://sandbox');
 sandbox=await sandboxPage.evaluate(()=>({text:document.body.innerText.slice(0,16000),rows:[...document.querySelectorAll('tr')].map(r=>r.innerText)}));
 const sandboxText=sandbox.text.replace(/\s+/g,' ');
 assert.match(sandboxText,/Layer 1 Sandbox\s+Namespace/i,'Layer 1 must use the namespace sandbox');
 assert.match(sandboxText,/You are adequately sandboxed/i,'Chrome must report adequate sandboxing');
 for(const label of ['PID namespaces','Network namespaces','Seccomp-BPF sandbox','Seccomp-BPF sandbox supports TSYNC'])assert.ok(new RegExp(label+'\\s+Yes','i').test(sandboxText),label+' must be active: '+sandboxText);
 await writeFile(out+'/sandbox.json',JSON.stringify(sandbox,null,2));await sandboxPage.close();active=p;watch(p);groups.push('Chrome namespace, PID, network, seccomp and TSYNC sandbox active');
 await p.goto(origin+'/practice');
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=200;const x=c.getContext('2d');x.fillStyle='#f4eee0';x.fillRect(0,0,200,200);x.strokeStyle='#20252b';x.strokeRect(10,10,180,180);x.fillStyle='#c93c18';x.beginPath();x.arc(106,100,3,0,Math.PI*2);x.fill();return c.toDataURL('image/png').split(',')[1];});const imagePath=out+'/authored-photo.png';await writeFile(imagePath,Buffer.from(png,'base64'));
 const corners=[{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:0,y:200}];const demo={title:'Authored annotation receiving',source:{widthMm:100,heightMm:100,corners},landmarks:[{id:'a',label:'Central mark',sourcePx:{x:100,y:100},kind:'fraction',toleranceMm:2}]};const setup={demo,widthMm:100,heightMm:100,session:createPractice(demo,100,100),selected:'a',mirrored:true,showGoals:false};
 await p.evaluate(s=>sessionStorage.setItem('skill-translator-observation-input/v1',JSON.stringify(s)),setup);await p.goto(origin+'/observe-attempt');await(await p.$('#imageFile')).uploadFile(imagePath);await p.waitForFunction(()=>document.querySelector('#imageLabel').textContent.startsWith('Paired'));
 await p.evaluate(cs=>cs.forEach((q,i)=>{document.getElementById('cx'+i).value=q.x;document.getElementById('cy'+i).value=q.y;}),corners);await p.click('#calibrate');await p.select('#evidenceClass','authored-image-control');await p.evaluate(()=>{document.getElementById('pixelX').value='106';document.getElementById('pixelY').value='100';document.getElementById('pointForm').requestSubmit();});await p.waitForFunction(()=>!document.getElementById('inspectAnnotationBound').disabled);
 assert.equal(await p.$eval('#outcome',e=>e.dataset.state),'needs-adjustment');
 const popup= new Promise(ok=>p.once('popup',ok));await p.click('#inspectAnnotationBound');const q=await popup;active=q;watch(q);await q.waitForSelector('#finding[data-state="all-outside"]');groups.push('real authored PNG calibration and retained annotation open separate inspector');
 await q.$eval('#halfWidth',e=>{e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}));});await q.$eval('#halfHeight',e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});await q.focus('#inspect');await q.keyboard.press('Enter');await q.waitForSelector('#finding[data-state="unresolved"]');assert.match(await q.$eval('#range',e=>e.textContent),/1\.00000–5\.00000/);assert.match(await q.$eval('#nominal',e=>e.textContent),/outside/);groups.push('keyboard region decision preserves nominal failure');
 await(await q.$('#image')).uploadFile(imagePath);await q.waitForFunction(()=>document.getElementById('paired').textContent.startsWith('Exact'));assert.equal(await q.$$eval('#photo image',e=>e.length),1);
 const cdp=await q.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});await q.click('#save');let bytes;for(let i=0;i<60;i++){try{bytes=await readFile(out+'/annotation-bound.json');break;}catch{await new Promise(ok=>setTimeout(ok,50));}}assert.ok(bytes);const saved=JSON.parse(bytes);assert.equal('result'in saved,false);assert.deepEqual(saved.setup.session,setup.session);
 const forged={...saved,result:{status:'all-within'}};await writeFile(out+'/cached.json',JSON.stringify(forged));await(await q.$('#open')).uploadFile(out+'/cached.json');await q.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Inputs reopened'));assert.equal(await q.$eval('#finding',e=>e.dataset.state),'unresolved');

 // Hold a real File.text promise, edit newer bounds, then release the old read.
 await q.evaluate(()=>{const old=File.prototype.text;window.__originalFileText=old;File.prototype.text=function(){const file=this;return new Promise(resolve=>{window.__releaseOldRead=async()=>resolve(await old.call(file));});};});
 await(await q.$('#open')).uploadFile(out+'/cached.json');await q.waitForFunction(()=>typeof window.__releaseOldRead==='function');
 await q.$eval('#halfWidth',e=>{e.value='3';e.dispatchEvent(new Event('input',{bubbles:true}));});await q.evaluate(async()=>{await window.__releaseOldRead();File.prototype.text=window.__originalFileText;});
 await q.waitForFunction(()=>document.getElementById('halfWidth').value==='3');assert.equal(await q.$eval('#save',e=>e.disabled),true);await q.click('#inspect');groups.push('late notebook read cannot replace newer bounds edit');
 const changed=structuredClone(saved);changed.observation.points[0].pixel.x=107;await writeFile(out+'/wrong.json',JSON.stringify(changed));await(await q.$('#open')).uploadFile(out+'/wrong.json');await q.waitForFunction(()=>!document.getElementById('error').hidden);assert.equal(await q.$eval('#finding',e=>e.dataset.state),'unresolved');groups.push('actual save, input-only reopen, forged cache ignored and wrong source rollback');
 await q.$eval('#halfWidth',e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));});await q.click('#inspect');assert.match(await q.$eval('#error',e=>e.textContent),/full declared region/);assert.equal(await q.$eval('#finding',e=>e.dataset.state),'unresolved');assert.equal(await q.$eval('#save',e=>e.disabled),true);groups.push('unsupported full region refused without clipping or replacing accepted result');
 await q.setViewport({width:390,height:844});await q.screenshot({path:out+'/mobile.png',fullPage:true});const narrow=await q.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(narrow.innerWidth,390);assert.ok(narrow.scrollWidth<=390,JSON.stringify(narrow));await q.setViewport({width:1200,height:900});await q.screenshot({path:out+'/desktop.png',fullPage:true});groups.push('390px and desktop layouts');
 await Promise.all([q.waitForNavigation(),q.click('#returnPractice')]);assert.equal(new URL(q.url()).pathname,'/practice');assert.deepEqual(await q.evaluate(()=>JSON.parse(sessionStorage.getItem('skill-translator-observation-input/v1'))),setup);assert.equal(await p.$eval('#outcome',e=>e.dataset.state),'needs-adjustment');assert.equal(await p.$eval('#pixelX',e=>e.value),'106');await q.click('#savePractice');let returned;for(let i=0;i<60;i++){try{returned=JSON.parse(await readFile(out+'/skill-practice-session.json','utf8'));break;}catch{await new Promise(ok=>setTimeout(ok,50));}}assert.deepEqual(returned,setup.session);groups.push('unchanged practice return, actual practice export, original photo draft retained');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await writeFile(out+'/receipt.json',JSON.stringify({groups,errors,requests,sandbox},null,2));console.log(JSON.stringify({groups,errors,requests}));
}catch(e){
 const failure={error:String(e.stack||e).slice(0,12000),groups,sandbox,pageErrors:errors.slice(-100),offsiteRequests:requests.slice(-100),activeUrl:active?.url(),pages:[]};
 try{const pages=await bounded(browser.pages());for(const page of pages.slice(0,8)){try{failure.pages.push(await bounded(page.evaluate(()=>({url:location.href,title:document.title,status:document.getElementById('status')?.textContent?.slice(0,3000),error:document.getElementById('error')?.textContent?.slice(0,3000),active:{tag:document.activeElement?.tagName,id:document.activeElement?.id},finding:document.getElementById('finding')?.textContent?.slice(0,3000)}))));}catch(problem){failure.pages.push({url:page.url(),captureError:String(problem)});}}}catch(problem){failure.captureError=String(problem);}
 try{if(active&&!active.isClosed())await bounded(active.screenshot({path:out+'/failure.png',fullPage:false,timeout:3000}),4000);}catch(problem){failure.screenshotError=String(problem);}
 await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));throw e;
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
