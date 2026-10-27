import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
// Native page evaluation respects the application's CSP; no unsafe-eval bypass.
async function until(page,predicate,arg){const end=Date.now()+15000;while(Date.now()<end){if(await page.evaluate(predicate,arg))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Browser condition timed out.');}
export async function receiveGroupPracticeTransactions({browser,base,out,validBundle}){
 await mkdir(out,{recursive:true});const page=await browser.newPage({acceptDownloads:true}),checks=[],cleanup=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const A=structuredClone(validBundle),B=structuredClone(validBundle);
 A.discovery.sourceBundle.sequence.title='Transaction source A';B.discovery.sourceBundle.sequence.title='Transaction source B';
 A.comparison.fitToleranceMm=15;B.comparison.fitToleranceMm=30;B.comparison.basis='Transaction B: retained authored physical coordinates';
 await page.addInitScript(()=>{
  const events=[],gates=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=blob=>{const url=create(blob);events.push({kind:'create',url,type:blob.type});return url;};
  URL.revokeObjectURL=url=>{events.push({kind:'revoke',url});return revoke(url);};
  const original=File.prototype.text;
  File.prototype.text=async function(...args){
   const gate=gates.get(this.name);
   if(gate&&!gate.entered){gate.entered=true;await gate.promise;try{return await original.apply(this,args);}finally{gate.finished=true;}}
   return original.apply(this,args);
  };
  window.__transactionProbe={events,arm(name){let release;const promise=new Promise(resolve=>{release=resolve;});gates.set(name,{promise,release,entered:false,finished:false});},
   entered:name=>!!gates.get(name)?.entered,finished:name=>!!gates.get(name)?.finished,release:name=>gates.get(name)?.release()};
 });
 const upload=(value,name)=>page.locator('#reopen').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 const exported=async selector=>{const pending=page.waitForEvent('download');await page.locator(selector).click();const download=await pending;assert.equal(await download.failure(),null);return JSON.parse(await readFile(await download.path(),'utf8'));};
 const originalCustody=(actual,expected)=>{
  assert.equal(actual.format,expected.format);assert.equal(actual.sourceBundle.format,expected.sourceBundle.format);
  assert.deepEqual(actual.sourceBundle.sequence,expected.sourceBundle.sequence);assert.deepEqual(actual.sourceBundle.frames,expected.sourceBundle.frames);assert.deepEqual(actual.declarations,expected.declarations);
 };
 const custody=(actual,expected)=>{originalCustody(actual.discovery,expected.discovery);assert.deepEqual(actual.comparison.session,expected.comparison.session);assert.equal(actual.comparison.fitToleranceMm,expected.comparison.fitToleranceMm);assert.equal(actual.comparison.basis,expected.comparison.basis);};
 const snapshot=()=>page.evaluate(()=>({events:[...window.__transactionProbe.events],urls:[...document.querySelectorAll('#motionSources image[href]')].map(image=>image.getAttribute('href')).filter(url=>url.startsWith('blob:'))}));
 const usableImages=()=>page.evaluate(async()=>{
  const urls=[...document.querySelectorAll('#motionSources image[href]')].map(image=>image.getAttribute('href'));
  if(urls.length!==3)throw Error('Expected three original source images');
  await Promise.all(urls.map(async url=>{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw Error('Original source has no pixels');}));
 });
 const accepted=async expected=>{
  await until(page,({title,tolerance,basis})=>!document.querySelector('#motionPracticeSave').disabled&&document.body.textContent.includes(title)&&document.querySelector('#motionPracticeTolerance').value===String(tolerance)&&document.querySelector('#motionPracticeBasis').value===basis,
   {title:expected.discovery.sourceBundle.sequence.title,tolerance:expected.comparison.fitToleranceMm,basis:expected.comparison.basis});
  custody(await exported('#motionPracticeSave'),expected);await usableImages();
 };
 const load=async(value,name)=>{
  const previous=(await snapshot()).urls[0]??null;await upload(value,name);
  await until(page,previous=>{const url=document.querySelector('#motionSources image[href]')?.getAttribute('href');return !!url&&url!==previous;},previous);
  await accepted(value);await until(page,()=>!document.querySelector('#error').textContent.trim());
 };
 const gate=async(value,name)=>{await page.evaluate(name=>window.__transactionProbe.arm(name),name);await upload(value,name);await until(page,name=>window.__transactionProbe.entered(name),name);};
 const release=async name=>{
  const before=await snapshot();await page.evaluate(name=>window.__transactionProbe.release(name),name);
  await until(page,name=>window.__transactionProbe.finished(name),name);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  return (await snapshot()).events.slice(before.events.length);
 };
 const cleanupCheck=async(before,label)=>{
  const delta=(await snapshot()).events.slice(before.events.length),created=delta.filter(e=>e.kind==='create'&&e.type==='image/png'),revoked=new Set(delta.filter(e=>e.kind==='revoke').map(e=>e.url));
  assert(created.length,label+': no staged PNG URL observed');for(const url of before.urls)assert(!revoked.has(url),label+': revoked accepted PNG');
  for(const{url}of created)assert(revoked.has(url),label+': leaked staged PNG');await usableImages();cleanup.push({label,created:created.length,revokedPNGs:created.length});
 };
 try{
  await page.goto(base+'/relationship-discovery');await load(A,'initial-A.json');
  const beforeInvalid=await snapshot(),invalid=structuredClone(B);invalid.comparison.session=null;await upload(invalid,'invalid-session.json');
  await until(page,()=>/practice session/i.test(document.querySelector('#error').textContent));await cleanupCheck(beforeInvalid,'invalid session');custody(await exported('#motionPracticeSave'),A);
  checks.push('Rejected session after PNG staging preserves the prior comparison and releases every new PNG URL.');
  await load(A,'clear-error-A.json');await gate(A,'slow-wrapper.json');await load(B,'newer-B.json');
  const staleEvents=await release('slow-wrapper.json');assert.equal(staleEvents.filter(e=>e.kind==='create'&&e.type==='image/png').length,0);await accepted(B);
  checks.push('Older gated wrapper loses to newer accepted wrapper at the immediate post-read revision guard.');
  await gate(A,'slow-before-ordinary.json');await upload(B.discovery,'ordinary-B.json');
  await until(page,()=>document.querySelector('#motionPracticeSave').disabled&&document.body.textContent.includes('Transaction source B'));
  originalCustody(await exported('#save'),B.discovery);const ordinaryEvents=await release('slow-before-ordinary.json');
  assert.equal(ordinaryEvents.filter(e=>e.kind==='create'&&e.type==='image/png').length,0);assert(await page.locator('#motionPracticeSave').isDisabled());originalCustody(await exported('#save'),B.discovery);await usableImages();
  checks.push('A newer ordinary source clears comparison atomically and survives the older wrapper completion.');
  await load(A,'restore-A.json');const beforePNG=await snapshot(),badPNG=structuredClone(B.discovery);
  assert.notEqual(badPNG.sourceBundle.frames[1].pngBase64,badPNG.sourceBundle.frames[0].pngBase64);badPNG.sourceBundle.frames[1].pngBase64=badPNG.sourceBundle.frames[0].pngBase64;
  await upload(badPNG,'invalid-PNG.json');await until(page,()=>/image/i.test(document.querySelector('#error').textContent));await cleanupCheck(beforePNG,'PNG digest mismatch');custody(await exported('#motionPracticeSave'),A);
  checks.push('Invalid ordinary PNG digest preserves the accepted source/session and cleans staged PNGs.');
  await load(A,'threshold-A.json');const summary15=await page.locator('#motionPracticeSummary').innerText();
  assert(summary15.includes('9 within fitted threshold; 6 outside; 3 incomplete; 0 unresolved'));
  const beforeThreshold=await snapshot();await page.locator('#motionPracticeTolerance').fill('100');await page.locator('#motionPracticeRecompute').click();
  const threshold=structuredClone(A);threshold.comparison.fitToleranceMm=100;await accepted(threshold);originalCustody(await exported('#save'),A.discovery);
  const summary100=await page.locator('#motionPracticeSummary').innerText();assert(summary100.includes('15 within fitted threshold; 0 outside; 3 incomplete; 0 unresolved'));
  const thresholdEvents=(await snapshot()).events.slice(beforeThreshold.events.length);for(const url of beforeThreshold.urls)assert(!thresholdEvents.some(e=>e.kind==='revoke'&&e.url===url));
  checks.push('Explicit tolerance change recomputes all results while preserving three incomplete comparisons, source PNGs and raw session.');
  await gate(B,'pending-save-B.json');custody(await exported('#motionPracticeSave'),threshold);await release('pending-save-B.json');await accepted(B);
  checks.push('Save during a pending file read exports one coherent accepted source/session snapshot.');
  assert.deepEqual(errors,[]);const report={checks,cleanup,summary15,summary100,errors,boundary:'Stale-file cases prove the immediate post-File.text revision guard; they do not claim every later decode scheduling point.',urlEvents:(await snapshot()).events};
  await writeFile(join(out,'group-practice-transactions.json'),JSON.stringify(report,null,2));return report;
 }finally{await page.close();}
}
