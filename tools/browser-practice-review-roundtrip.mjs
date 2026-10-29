// Authored browser receiving control; no physical-learning claim.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/practice-review-roundtrip');
await mkdir(out,{recursive:true});
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={result:'FAIL',evidence:'Authored software controls; no measured learning claim',tests:[],errors:[],offsite:[],mode:process.env.QA_EXPECT_REOPEN||'pass',receiver_sha256:hash(await readFile(fileURLToPath(import.meta.url)))};
let browser,server;
const record=name=>{report.tests.push(name);console.log(name);};
try{
  assert.ok(process.env.PUPPETEER_PATH,'PUPPETEER_PATH is required');
  assert.ok(process.env.CHROME_BINARY,'CHROME_BINARY is required');
  assert.ok(['pass','refuse'].includes(report.mode),'QA_EXPECT_REOPEN must be pass or refuse');
  report.source_commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  report.source_status=execFileSync('git',['-C',root,'status','--short'],{encoding:'utf8'}).trim();
  const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH);
  const {createPractice,placePractice,retryPractice}=await import('../src/practice.mjs');
  const {appendFocusedResult,createFocusedReview}=await import('../src/focused-review.mjs');
  let url;
  if(process.env.QA_BASE_URL){
    const parsed=new URL(process.env.QA_BASE_URL);
    assert.equal(parsed.protocol,'http:');assert.equal(parsed.hostname,'127.0.0.1');
    assert.equal(parsed.username+parsed.password+parsed.search+parsed.hash,'');assert.equal(parsed.pathname,'/');
    assert.ok(process.env.QA_BUILD_SOURCE,'QA_BUILD_SOURCE must identify the externally served build');
    url=parsed.origin;report.server_mode='external';
  }else{
    const {createAppServer}=await import('../server.mjs');server=createAppServer();
    await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
    url=`http://127.0.0.1:${server.address().port}`;report.server_mode='source';
  }
  report.base_url=url;report.served_assets={};
  for(const path of ['/web/practice-review.mjs','/web/focused-results.mjs','/src/practice-review.mjs','/src/focused-review.mjs']){
    const res=await fetch(url+path,{redirect:'error'});assert.equal(res.status,200);
    const bytes=Buffer.from(await res.arrayBuffer());report.served_assets[path]=hash(bytes);
    // External receiving must identify the actual package separately; always retain served bytes.
    await writeFile(resolve(out,path.slice(1).replaceAll('/','_')),bytes);
  }
  report.build_source=process.env.QA_BUILD_SOURCE||report.source_commit;
  const demo={title:'Authored eight-drill retention control',provenance:'Authored arithmetic; not learner evidence',notes:'BEGIN raw notes\n'+ 'retain Ω tactile cue; '.repeat(10800)+'\nEND raw notes',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:20,y:20},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:60,y:40},toleranceMm:2}]};
  // Keep each source under its existing 256 KiB input limit; nine copies exceed 2 MiB.
  let session=placePractice(demo,100,80,createPractice(demo,100,80),'a',{xMm:23,yMm:24});
  session=retryPractice(demo,100,80,session);session=placePractice(demo,100,80,session,'a',{xMm:21,yMm:20});
  const fixture=async(name,value)=>{const path=resolve(out,name);await writeFile(path,typeof value==='string'?value:JSON.stringify(value));return path;};
  const sourcePath=await fixture('original-source.json',demo),sessionPath=await fixture('original-session.json',session);
  assert.ok((await readFile(sourcePath)).length<256*1024);
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});report.browser=await browser.version();
  const watch=p=>{p.on('pageerror',e=>report.errors.push(String(e)));p.on('request',r=>{if(new URL(r.url()).origin!==url&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))report.offsite.push(r.url());});};
  const open=async(context,width)=>{const p=await context.newPage();watch(p);await p.setViewport({width,height:844});await p.goto(url+'/practice-review',{waitUntil:'networkidle0'});await p.evaluate(()=>{const old=URL.createObjectURL.bind(URL);window.qaBlobs=[];URL.createObjectURL=b=>{window.qaBlobs.push(b);return old(b);};});return p;};
  const upload=async(p,id,path)=>{await p.$eval(id,e=>{e.value='';});await(await p.$(id)).uploadFile(path);};
  const download=async(p,id,name)=>{
    const count=await p.evaluate(()=>window.qaBlobs.length);await p.click(id);
    await p.waitForFunction(n=>window.qaBlobs.length>n,{},count);
    const bytes=Buffer.from(await p.evaluate(async()=>Array.from(new Uint8Array(await window.qaBlobs.at(-1).arrayBuffer()))));
    const path=resolve(out,name);await writeFile(path,bytes);return {path,bytes,json:JSON.parse(bytes.toString('utf8'))};
  };
  const context=await browser.createBrowserContext(),p=await open(context,1280);
  await upload(p,'#sourceFile',sourcePath);await upload(p,'#sessionFile',sessionPath);await p.click('#openPair button');await p.waitForFunction(()=>!document.getElementById('review').hidden);
  await p.click('#marks input[value="a"]');await p.select('#baseline','1');await p.select('#comparison','2');
  const focus=await download(p,'#exportSource','focused-source.json');assert.equal(focus.json.notes,demo.notes);assert.ok(focus.bytes.length<256*1024);
  let focusedSession=placePractice(focus.json,100,80,createPractice(focus.json,100,80),'a',{xMm:20,yMm:20});
  focusedSession=retryPractice(focus.json,100,80,focusedSession);focusedSession=placePractice(focus.json,100,80,focusedSession,'a',{xMm:26,yMm:28});
  const focusedSessionPath=await fixture('focused-session.json',focusedSession);
  const attach=async label=>{await upload(p,'#drillSource',focus.path);await upload(p,'#drillSession',focusedSessionPath);await p.$eval('#drillLabel',e=>{e.value='';});await p.type('#drillLabel',label);await p.click('#attachDrill button');};
  for(let i=1;i<=8;i++){await attach(`Retained attempt ${i}`);await p.waitForSelector(`[data-drill-id="drill-${i}"]`);assert.equal(await p.$$eval('[data-drill-id]',els=>els.length),i);}
  await p.select('[aria-label="Drill round for Retained attempt 1"]','1');
  const saved=await download(p,'#saveReview','saved-review.json');
  assert.ok(saved.bytes.length>2*1024*1024);assert.equal(saved.json.drills.length,8);
  assert.deepEqual(saved.json.review.demo,demo);assert.deepEqual(saved.json.review.session,JSON.parse(await readFile(sessionPath,'utf8')));assert.deepEqual(saved.json.review.selectedIds,['a']);
  assert.equal(saved.json.review.baselineRound,1);assert.equal(saved.json.review.comparisonRound,2);
  const serializedFocusedSession=JSON.parse(await readFile(focusedSessionPath,'utf8'));
  saved.json.drills.forEach((d,i)=>{assert.deepEqual(d.demo,focus.json);assert.deepEqual(d.session,serializedFocusedSession);assert.equal(d.label,`Retained attempt ${i+1}`);assert.equal(d.id,`drill-${i+1}`);assert.equal(d.originalRound,2);assert.equal(d.drillRound,i===0?1:2);});
  report.fixture_bytes={source:(await readFile(sourcePath)).length,focused:focus.bytes.length,saved:saved.bytes.length};report.saved_sha256=hash(saved.bytes);
  record('ordinary source/session upload, UI focus export and eight real attachments preserve notes, raw rounds, labels and selections');
  // Clear only the displayed error so every wait observes this attempted operation.
  const clearError=page=>page.$eval('#error',e=>{e.textContent='';e.hidden=true;});
  const unchanged=async(page,name)=>{const after=await download(page,'#saveReview',`${name}-retained.json`);assert.deepEqual(after.json,saved.json);assert.deepEqual(after.bytes,saved.bytes);};
  await clearError(p);await attach('Ninth refused');await p.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));await unchanged(p,'ninth');record('ninth attachment refuses without changing accepted evidence');
  const fresh=await browser.createBrowserContext(),m=await open(fresh,390);
  await upload(m,'#reviewFile',saved.path);
  if(report.mode==='refuse'){
    await m.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
    assert.equal(await m.$eval('#review',e=>e.hidden),true);assert.equal(await m.$$eval('[data-drill-id]',els=>els.length),0);
    report.refusal=await m.$eval('#error',e=>e.textContent);assert.match(report.refusal,/limit|large|MiB|size/i);
    await m.$eval('#error',e=>e.scrollIntoView({block:'center'}));await m.screenshot({path:resolve(out,'baseline-refusal-390.png')});
    record('baseline explicitly refuses its own greater-than-2-MiB saved review in a fresh context');
  }else{
    await m.waitForSelector('[data-drill-id="drill-8"]');await unchanged(m,'fresh-reopen');
    assert.equal(await m.$$eval('#marks input:checked',els=>els.length),1);
    assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await m.$eval('#drillStatus',e=>e.scrollIntoView({block:'start'}));await m.screenshot({path:resolve(out,'reopened-eight-drills-390.png')});
    record('fresh 390px context reopens exact downloaded bytes and re-downloads identical raw evidence');
    const duplicate=structuredClone(saved.json);duplicate.drills[1].id=duplicate.drills[0].id;
    const mismatch=structuredClone(saved.json);mismatch.drills[0].demo.practiceFocus.originalReference.target.widthMm+=1;
    const invalids=[['malformed','{"schema":'],['duplicate-id',duplicate],['mismatched-reference',mismatch]];
    for(const [name,value]of invalids){
      await clearError(m);await upload(m,'#reviewFile',await fixture(`${name}.json`,value));
      await m.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
      await unchanged(m,name);record(`${name} refuses transactionally with the complete accepted review retained`);
    }
    // Exact aggregate-bound control, built as compact UTF-8 JSON, not padded JSON text.
    const limit=24*1024*1024,legacy=structuredClone(saved.json.review);
    legacy.selectedIds=[];legacy.demo.notes='';
    const overhead=Buffer.byteLength(JSON.stringify(legacy)),remaining=limit-overhead;
    legacy.demo.notes='Ω'.repeat(Math.floor(remaining/2))+'x'.repeat(remaining%2);
    const capText=JSON.stringify(legacy),capBytes=Buffer.from(capText);
    assert.equal(capBytes.length,limit);const capHash=hash(capBytes);
    const capPath=await fixture('exact-cap-review.json',capText);
    await clearError(m);await upload(m,'#reviewFile',capPath);
    await m.waitForFunction(()=>document.getElementById('status').textContent.includes('reopened')&&!document.getElementById('error').textContent&&document.querySelectorAll('[data-drill-id]').length===0);
    const downloadDigest=async page=>{
      const count=await page.evaluate(()=>window.qaBlobs.length);await page.click('#saveReview');
      await page.waitForFunction(n=>window.qaBlobs.length>n,{},count);
      return page.evaluate(async()=>{const bytes=await window.qaBlobs.at(-1).arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);return {bytes:bytes.byteLength,sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};});
    };
    const capUnchanged=async()=>assert.deepEqual(await downloadDigest(m),{bytes:limit,sha256:capHash});
    await capUnchanged();
    await clearError(m);await m.click('#marks input[value="a"]');
    await m.waitForFunction(()=>!!document.getElementById('error').textContent);
    assert.match(await m.$eval('#error',e=>e.textContent),/24\s*MiB/i);
    assert.equal(await m.$eval('#marks input[value="a"]',e=>e.checked),false);await capUnchanged();
    record('exact 24 MiB non-ASCII review accepts; selection growth refuses and restores unchecked state with exact export hash');
    // Notes are unscored metadata: retain matching geometry/reference with a small source.
    const smallFocus=structuredClone(focus.json);smallFocus.notes='Small authored metadata';
    const smallFocusPath=await fixture('small-focused-source.json',smallFocus);
    const validGrowth=appendFocusedResult(createFocusedReview(legacy),smallFocus,serializedFocusedSession,'Aggregate growth refused');
    assert.ok(Buffer.byteLength(JSON.stringify(validGrowth))>limit,'core accepts the matching fixture and its serialized aggregate exceeds the cap');
    await clearError(m);await upload(m,'#drillSource',smallFocusPath);await upload(m,'#drillSession',focusedSessionPath);
    await m.type('#drillLabel','Aggregate growth refused');await m.click('#attachDrill button');
    await m.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
    assert.match(await m.$eval('#error',e=>e.textContent),/24\s*MiB/i);
    assert.equal(await m.$$eval('[data-drill-id]',els=>els.length),0);await capUnchanged();
    record('semantically matching small drill refuses aggregate growth without changing exact-cap review');
    const overPath=await fixture('over-cap-review.json',capText+' ');
    // A valid JSON whitespace suffix proves byte rejection rather than malformed parsing.
    await m.evaluate(()=>{window.qaOverCapRead=false;const old=File.prototype.text;File.prototype.text=function(){if(this.name==='over-cap-review.json')window.qaOverCapRead=true;return old.call(this);};});
    await clearError(m);await upload(m,'#reviewFile',overPath);
    await m.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));
    assert.match(await m.$eval('#error',e=>e.textContent),/24\s*MiB/i);
    assert.equal(await m.evaluate(()=>window.qaOverCapRead),false);await capUnchanged();
    report.aggregate_boundary={bytes:limit,sha256:capHash};record('24 MiB plus one byte refuses before file read and retains exact export hash');

  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);report.result='PASS';
}catch(error){report.failure=String(error.stack||error);process.exitCode=1;console.error(report.failure);}
finally{
  try{if(browser)await browser.close();if(server)await new Promise(ok=>server.close(ok));}catch(error){report.cleanup_error=String(error);report.result='FAIL';process.exitCode=1;}
  await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
