import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [rootArg,sourceArg,outArg]=process.argv.slice(2);if(!outArg)throw Error('Supply published tree, exact source and new output directory.');
const root=resolve(rootArg),source=resolve(sourceArg),out=resolve(outArg),here=dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),original=await readFile(source);
assert.equal(original.length,1006547);assert.equal(sha(original),'06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe');
await mkdir(out,{recursive:false});
const receipt={completed:false,source:{sha256:sha(original),bytes:original.length},protocolSha256:sha(await readFile(join(here,'PROTOCOL.md'))),pins:{},intervals:[],errors:[],limitations:['Previously inspected development source, with no correspondence ground truth.','Actual maintained browser acquisition feeds the native experimental comparison. This run does not claim a browser consumer for the new result.','All original intervals, fixed reference regions and exact minima are retained.']};
for(const p of ['src/visual-translation.mjs','src/regional-translation.mjs','src/contained-regional-placement.mjs','web/visual-scan.mjs','web/video-input.mjs'])receipt.pins[p]=sha(await readFile(join(root,p)));
const {compareContainedRegionalPlacements}=await import(pathToFileURL(join(root,'src/contained-regional-placement.mjs')));
const {createAppServer}=await import(pathToFileURL(join(root,'server.mjs'))),server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/usr/bin/google-chrome',args:['--allow-chrome-scheme-url']});
try{
 const sandbox=await browser.newPage();await sandbox.goto('chrome://sandbox/');receipt.sandbox=await sandbox.locator('body').innerText();assert.match(receipt.sandbox,/Layer 1 Sandbox\s+(Namespace|SUID)/);assert.match(receipt.sandbox,/Seccomp-BPF sandbox\s+Yes/);await sandbox.close();
 const page=await browser.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));
 await page.addInitScript(()=>{const Original=window.Worker;window.placementReceiving={inputs:[],results:[]};window.Worker=class extends Original{constructor(url,options){super(url,options);this.observed=String(url).includes('visual-translation-worker');if(this.observed)this.addEventListener('message',e=>{if(e.data.type==='result')window.placementReceiving.results.push({inputIndex:this.inputIndex,result:structuredClone(e.data.result)});});}postMessage(data,...rest){if(this.observed){this.inputIndex=window.placementReceiving.inputs.length;window.placementReceiving.inputs.push(structuredClone(data));}return super.postMessage(data,...rest);}};});
 await page.goto(`http://127.0.0.1:${server.address().port}/sequence`);const waitText=(id,text)=>page.locator('#'+id).filter({hasText:text}).waitFor({timeout:90000});
 await page.locator('#clip-file').setInputFiles(source);await waitText('status','Original clip ready');await page.locator('#visual-scan > summary').click();await page.locator('#scan-from').fill('.1');await page.locator('#scan-until').fill('9.1');await page.locator('#scan-count').fill('10');await page.locator('#scan-start').click();await waitText('scan-status','Scan ready');await page.locator('#scan-order').selectOption('wideTranslationAdjustedChange');await waitText('scan-translation-summary','Image-shift comparison ready');
 const input=await page.evaluate(()=>{const s=window.placementReceiving,index=s.inputs.findIndex(x=>x.options.radius===16),i=s.inputs[index];return {plan:i.plan,samples:i.samples.map(x=>({...x,rgba:x.rgba?Array.from(x.rgba):null})),wide:s.results.find(x=>x.inputIndex===index)?.result};});
 assert.equal(input.plan.clip.sha256,receipt.source.sha256);assert.equal(input.samples.length,10);assert.equal(input.wide.intervals.length,9);
 const samples=input.samples.map(s=>s.rgba?{...s,rgba:new Uint8ClampedArray(s.rgba)}:s);
 receipt.acquisition={plan:input.plan,samples:samples.map(({rgba,...s})=>({...s,rgbaSha256:rgba?sha(rgba):null}))};
 const started=performance.now();
 for(const interval of input.wide.intervals){const account={index:interval.index,status:interval.status};receipt.intervals.push(account);if(interval.status!=='compared')continue;const before=samples[interval.index],after=samples[interval.index+1],begin=performance.now();account.result=compareContainedRegionalPlacements(before,after);account.elapsedMilliseconds=performance.now()-begin;if(account.result.status!=='compared')continue;
  const {changeRegions,...whole}=interval.comparison;assert.deepEqual(account.result.baseline.global,whole);assert.equal(account.result.tiles.length,8);
  for(const tile of account.result.tiles){const old=account.result.baseline.tiles[tile.index].comparison;assert.deepEqual(tile.comparison.support,old.support);assert.ok(tile.comparison.meanAdjustedChange<=old.meanAdjustedChange);}
 }
 receipt.elapsedComparisonMilliseconds=performance.now()-started;
 receipt.summary={intervals:receipt.intervals.map(x=>({index:x.index,status:x.result?.status??x.status,baselineMean:x.result?.baseline?.independentRegionalMean,containedMean:x.result?.independentRegionalMean,baselineBoundary:x.result?.baseline?.tiles.filter(t=>t.comparison.status==='search-boundary').length,imageBoundary:x.result?.tiles.filter(t=>t.comparison.status==='image-boundary').length,unique:x.result?.tiles.filter(t=>t.comparison.status==='unique').length,ambiguous:x.result?.tiles.filter(t=>t.comparison.status==='ambiguous').length,outsideFormerWindow:x.result?.tiles.filter(t=>t.comparison.alternatives.some(a=>Math.abs(a.dx)>16||Math.abs(a.dy)>16)).length,elapsedMilliseconds:x.elapsedMilliseconds}))};
 assert.deepEqual(receipt.errors,[]);receipt.completed=true;
}catch(error){receipt.failure=String(error.stack||error);throw error;}finally{await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({completed:receipt.completed,summary:receipt.summary,errors:receipt.errors,failure:receipt.failure}));}
