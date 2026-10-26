import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const [rootArg,sourceArg,outArg]=process.argv.slice(2);
if(!rootArg||!sourceArg||!outArg)throw Error('Supply maintained tree, exact original source and new output directory.');
const root=resolve(rootArg),source=resolve(sourceArg),out=resolve(outArg),sha=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(source);assert.equal(original.length,1006547);assert.equal(sha(original),'06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe');
await mkdir(out,{recursive:false});
const {createAppServer}=await import(pathToFileURL(join(root,'server.mjs'))),server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/usr/bin/google-chrome',args:['--allow-chrome-scheme-url']});
const receipt={passed:false,source:{sha256:sha(original),bytes:original.length,author:'Aerra Carnicom',title:"Aerra's Films of the Ordinary IV -- Scissors Cutting Card Stock.webm",license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',page:'https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm'},checks:[],errors:[],limits:['Frozen original-source appearance receiving; no action, contact, cut-completion or skill accuracy labels.','Whole-image small samples omit original detail; different radius interiors have different support.']};
let page;
try{
 const admission=await browser.newPage();await admission.goto('chrome://sandbox/');receipt.sandbox=await admission.locator('body').innerText();assert.match(receipt.sandbox,/Layer 1 Sandbox\s+(Namespace|SUID)/);assert.match(receipt.sandbox,/Seccomp-BPF sandbox\s+Yes/);await admission.close();
 page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true});page.on('pageerror',e=>receipt.errors.push(e.message));
 // Passive receiving instrumentation only. The original worker, messages,
 // transferred samples and application callbacks are left unchanged.
 await page.addInitScript(()=>{
  const NativeWorker=window.Worker;window.sourceStudy={inputs:{},results:{},errors:[]};
  window.Worker=class extends NativeWorker{
   constructor(url,options){super(url,options);this.sourceStudyTranslation=String(url).includes('visual-translation-worker');if(this.sourceStudyTranslation)this.addEventListener('message',event=>{if(event.data.type==='result')window.sourceStudy.results[this.sourceStudyRadius]=structuredClone(event.data.result);if(event.data.type==='error')window.sourceStudy.errors.push(event.data.message);});}
   postMessage(data,...rest){if(this.sourceStudyTranslation){this.sourceStudyRadius=data.options.radius;window.sourceStudy.inputs[this.sourceStudyRadius]=structuredClone(data);}return super.postMessage(data,...rest);}
  };
 });
 const origin=`http://127.0.0.1:${server.address().port}`;await page.goto(origin+'/sequence');
 const waitText=(id,text)=>page.locator('#'+id).filter({hasText:text}).waitFor({timeout:90000});
 await page.locator('#clip-file').setInputFiles(source);await waitText('status','Original clip ready');
 await page.locator('#visual-scan summary').click();await page.locator('#scan-from').fill('0.1');await page.locator('#scan-until').fill('9.1');await page.locator('#scan-count').fill('10');
 await page.locator('#scan-start').click();await waitText('scan-status','Scan ready');
 await page.locator('#scan-order').selectOption('wideTranslationAdjustedChange');await waitText('scan-translation-summary','Image-shift comparison ready');
 const data=await page.evaluate(async()=>{
  const state=window.sourceStudy,input=state.inputs[4],{inspectVisualScan}=await import('/src/visual-scan.mjs');
  const samples=[];for(const sample of input.samples){const {rgba,...metadata}=sample;if(rgba){const hash=await crypto.subtle.digest('SHA-256',rgba);metadata.rgbaSha256=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}samples.push(metadata);}
  return {plan:input.plan,samples,unaligned:inspectVisualScan(input.plan,input.samples),fitted:state.results,errors:state.errors};
 });
 assert.equal(data.plan.clip.sha256,receipt.source.sha256);assert.equal(data.samples.length,10);assert.equal(data.unaligned.intervals.length,9);assert.deepEqual(data.errors,[]);
 for(const radius of [4,16])assert.equal(data.fitted[radius].intervals.length,9);
 receipt.analysis=data;receipt.checks.push('Actual original source, ten frozen requests, all nine original intervals and both radius results retained with presented times and sample hashes.');
 receipt.summaries=data.unaligned.intervals.map((u,index)=>({index,status:u.status,before:u.before,after:u.after,unaligned:{meanAdjustedChange:u.meanAdjustedChange,changedPixelFraction:u.changedPixelFraction},fits:[4,16].map(radius=>{const c=data.fitted[radius].intervals[index].comparison;return {radius,status:c?.status,residual:c?.meanAdjustedChange,alternatives:c?.alternatives,regions:c?.changeRegions};})}));
 const eligible=data.unaligned.intervals.filter(x=>x.status==='compared').sort((a,b)=>b.meanAdjustedChange-a.meanAdjustedChange||a.index-b.index);assert.ok(eligible.length);
 const selected=eligible[0].index;receipt.illustration={index:selected,rule:'Highest original unaligned brightness-adjusted mean change, then original interval index. Chosen only after the complete frozen census; not an action label.'};
 const details=page.locator(`.scan-interval[data-index="${selected}"] .scan-translation[data-radius="16"] details[data-shift-regions]`);
 await details.locator(':scope > summary').click();await details.locator('canvas').first().waitFor();
 for(const frame of ['earlier','later']){const figure=details.locator(`canvas[data-shift-frame="${frame}"]`).locator('..');await figure.scrollIntoViewIfNeeded();await figure.screenshot({path:join(out,`original-${frame}-desktop.png`)});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 for(const frame of ['earlier','later']){const figure=details.locator(`canvas[data-shift-frame="${frame}"]`).locator('..');await figure.scrollIntoViewIfNeeded();await figure.screenshot({path:join(out,`original-${frame}-narrow.png`)});}
 receipt.checks.push('Actual remaining-change figures on both original sample coordinate systems render at desktop and390px without horizontal overflow.');
 for(const [which,label]of [[0,'Original earlier appearance'],[1,'Original later appearance']]){
  await page.locator(`.scan-interval[data-index="${selected}"] button[data-sample]`).nth(which).click();await page.locator('#capture-moment:enabled').waitFor();await page.locator('#moment-label').fill(label);await page.locator('#capture-moment').click();await waitText('status','Retained '+label);
 }
 assert.deepEqual(await page.locator('.moment-card img').evaluateAll(xs=>xs.map(x=>[x.naturalWidth,x.naturalHeight])),[[1920,1080],[1920,1080]]);
 await page.locator('#step-title').fill('Inspect original appearance evidence');await page.locator('#step-intent').fill('Source by Aerra Carnicom, CC BY-SA4.0; inspect appearance without assigning a cut or action outcome.');await page.locator('#save-step').click();await waitText('status','Authored step saved');
 const pending=page.waitForEvent('download');await page.locator('#export-sequence').click();const savedPath=join(out,'original-source-sequence.json');await(await pending).saveAs(savedPath);
 const saved=JSON.parse(await readFile(savedPath,'utf8'));assert.equal(saved.sequence.clip.sha256,receipt.source.sha256);for(let i=0;i<saved.frames.length;i++)assert.equal(sha(Buffer.from(saved.frames[i].pngBase64,'base64')),saved.sequence.moments[i].image.sha256);
 const fresh=await browser.newPage();await fresh.goto(origin+'/sequence');await fresh.locator('#sequence-file').setInputFiles(savedPath);await fresh.locator('#status').filter({hasText:'Reopened 2 verified'}).waitFor();assert.deepEqual(await fresh.locator('.moment-card img').evaluateAll(xs=>xs.map(x=>[x.naturalWidth,x.naturalHeight])),[[1920,1080],[1920,1080]]);await fresh.close();
 receipt.capture={moments:saved.sequence.moments,sourceSha256:saved.sequence.clip.sha256};receipt.checks.push('Illustrative interval passes through original1920×1080 capture, real download and fresh source-only reopening with matching PNG hashes.');
 assert.deepEqual(receipt.errors,[]);receipt.passed=true;
}catch(error){receipt.failure=String(error.stack??error);if(page)await page.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:receipt.passed,checks:receipt.checks,errors:receipt.errors,illustration:receipt.illustration,failure:receipt.failure}));}
