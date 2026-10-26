import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const [treeArg,sourceArg,outArg]=process.argv.slice(2);
if(!treeArg||!sourceArg||!outArg)throw Error('Supply exact maintained tree, original scissors source and new output directory.');
const tree=resolve(treeArg),source=resolve(sourceArg),out=resolve(outArg),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(source);assert.equal(bytes.length,1006547);assert.equal(hash(bytes),'06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe');
await mkdir(out,{recursive:false});
const {createAppServer}=await import(pathToFileURL(join(tree,'server.mjs'))),server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/usr/bin/google-chrome'}),errors=[];
const pins={};for(const path of ['web/video-input.mjs','src/visual-scan.mjs','src/visual-translation.mjs','src/translated-change-regions.mjs'])pins[path]=hash(await readFile(join(tree,path)));
const receipt={completed:false,sourceSha256:hash(bytes),sourceBytes:bytes.length,maintainedRevision:'ad218f4d4f390e1d817b132e4c06c45ab2d9628b',pins,errors,interpretation:'Known development source; finite-search containment and costs only. Direct browser use of maintained acquisition/comparison modules, not a new ordinary product control.'};
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/sequence`);await page.locator('#clip-file').setInputFiles(source);await page.locator('#status').filter({hasText:'Original clip ready'}).waitFor();
 receipt.result=await page.evaluate(async()=>{
  const {loadLocalVideo,releaseVideo,samplePresentedFrame}=await import('/web/video-input.mjs');
  const {createVisualScanPlan,inspectVisualScan}=await import('/src/visual-scan.mjs');
  const {inspectTranslatedScan}=await import('/src/visual-translation.mjs');
  const original=document.querySelector('#clip-file').files[0],radii=[4,16],startSeconds=.1,endSeconds=9.1;
  const sha=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),v=>v.toString(16).padStart(2,'0')).join('');
  async function acquire(clip,requestedSeconds){const begun=performance.now();try{return {...await samplePresentedFrame(clip,requestedSeconds),acquisitionMs:performance.now()-begun};}catch(e){return {requestedSeconds,error:String(e.message||e).slice(0,1200),acquisitionMs:performance.now()-begun};}}
  async function summarizeSample(sample){const {rgba,...metadata}=sample;return {...metadata,...(rgba?{rgbaSha256:await sha(rgba)}:{})};}
  const key=(a,b)=>`${a.requestedSeconds}:${b.requestedSeconds}`;
  function fit(clip,a,b){
   const plan=createVisualScanPlan(clip.identity,{startSeconds:a.requestedSeconds,endSeconds:b.requestedSeconds,sampleCount:2}),samples=[a,b];
   const raw=inspectVisualScan(plan,samples).intervals[0],fits={};
   for(const radius of radii){const begun=performance.now();fits[radius]={...inspectTranslatedScan(plan,samples,{radius,includeChangeRegions:true}).intervals[0],fitMs:performance.now()-begun};}
   return {key:key(a,b),before:raw.before,after:raw.after,raw,fits};
  }
  const boundary=row=>row.fits[16].status==='compared'&&row.fits[16].comparison.alternatives.some(a=>a.searchBoundary);
  function metrics(rows){
   return Object.fromEntries(radii.map(radius=>{
    let compared=0,contained=0,boundary=0,ambiguous=0,requestedContainedSeconds=0,actualComparedSeconds=0,actualContainedSeconds=0,zeroSum=0,fitSum=0,changedSum=0,regionSeconds=0;const statuses={};
    for(const row of rows){const r=row.fits[radius],status=r.status==='compared'?r.comparison.status:r.status;statuses[status]=(statuses[status]||0)+1;if(r.status!=='compared'||!r.comparison.alternatives.length)continue;
     compared++;const c=r.comparison,duration=row.after.presentedSeconds-row.before.presentedSeconds,hit=c.alternatives.some(a=>a.searchBoundary);if(hit)boundary++;else{contained++;requestedContainedSeconds+=row.after.requestedSeconds-row.before.requestedSeconds;actualContainedSeconds+=duration;}if(c.alternatives.length>1)ambiguous++;
     actualComparedSeconds+=duration;zeroSum+=duration*c.zero.meanAdjustedChange*255;fitSum+=duration*c.meanAdjustedChange*255;
     const changed=c.changeRegions?.earlier?.some?.changedPixels;if(Number.isFinite(changed)){changedSum+=duration*changed;regionSeconds+=duration;}
    }
    return [radius,{intervals:rows.length,compared,contained,boundary,ambiguous,statuses,requestedTotalSeconds:endSeconds-startSeconds,requestedContainedSeconds,requestedContainedFraction:requestedContainedSeconds/(endSeconds-startSeconds),actualComparedSeconds,actualContainedSeconds,actualContainedFraction:actualComparedSeconds?actualContainedSeconds/actualComparedSeconds:null,meanZeroLevels:actualComparedSeconds?zeroSum/actualComparedSeconds:null,meanFitLevels:actualComparedSeconds?fitSum/actualComparedSeconds:null,regionSeconds,meanChangedPixels:regionSeconds?changedSum/regionSeconds:null}];
   }));
  }
  const clip=await loadLocalVideo(original);document.body.append(clip.video);clip.video.style.width='160px';let adaptive;
  try{
   const initialPlan=createVisualScanPlan(clip.identity,{startSeconds,endSeconds,sampleCount:10}),initial=[];
   for(const t of initialPlan.requestedTimes)initial.push(await acquire(clip,t));
   const cache=new Map(),parents=initial.slice(1).map((s,i)=>fit(clip,initial[i],s));for(const p of parents)cache.set(p.key,p);
   const selected=parents.map((p,index)=>({p,index})).filter(({p})=>boundary(p)),midpoints=[];
   for(const {p,index}of selected){const t=(p.before.requestedSeconds+p.after.requestedSeconds)/2;midpoints.push({...await acquire(clip,t),parentIndex:index});}
   const ordered=[...initial,...midpoints].sort((a,b)=>a.requestedSeconds-b.requestedSeconds),final=[];
   for(let i=1;i<ordered.length;i++){const id=key(ordered[i-1],ordered[i]);if(!cache.has(id))cache.set(id,fit(clip,ordered[i-1],ordered[i]));final.push(cache.get(id));}
   adaptive={plan:initialPlan,initialSamples:await Promise.all(initial.map(summarizeSample)),midpointSamples:await Promise.all(midpoints.map(summarizeSample)),selectedParentIndices:selected.map(x=>x.index),parents,final,evaluatedPairs:[...cache.values()],initialMetrics:metrics(parents),finalMetrics:metrics(final),work:{sampleRequests:ordered.length,successfulSamples:ordered.filter(x=>x.rgba).length,pairFitsPerRadius:cache.size,acquisitionMs:ordered.reduce((n,s)=>n+s.acquisitionMs,0),fitMs:Object.fromEntries(radii.map(r=>[r,[...cache.values()].reduce((n,p)=>n+p.fits[r].fitMs,0)]))}};
  }finally{releaseVideo(clip);}
  const control=await loadLocalVideo(original);document.body.append(control.video);control.video.style.width='160px';let uniform;
  try{
   const plan=createVisualScanPlan(control.identity,{startSeconds,endSeconds,sampleCount:adaptive.work.sampleRequests}),samples=[];for(const t of plan.requestedTimes)samples.push(await acquire(control,t));
   const rows=samples.slice(1).map((s,i)=>fit(control,samples[i],s));uniform={plan,samples:await Promise.all(samples.map(summarizeSample)),final:rows,metrics:metrics(rows),work:{sampleRequests:samples.length,successfulSamples:samples.filter(x=>x.rgba).length,pairFitsPerRadius:rows.length,acquisitionMs:samples.reduce((n,s)=>n+s.acquisitionMs,0),fitMs:Object.fromEntries(radii.map(r=>[r,rows.reduce((n,p)=>n+p.fits[r].fitMs,0)]))}};
  }finally{releaseVideo(control);}
  return {adaptive,uniform};
 });
 assert.equal(receipt.result.adaptive.work.sampleRequests,receipt.result.uniform.work.sampleRequests);assert.deepEqual(errors,[]);receipt.completed=true;
}catch(error){receipt.failure=String(error.stack||error);throw error;}
finally{await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({completed:receipt.completed,errors,adaptive:receipt.result?.adaptive.finalMetrics,uniform:receipt.result?.uniform.metrics,adaptiveWork:receipt.result?.adaptive.work,uniformWork:receipt.result?.uniform.work,failure:receipt.failure},null,2));}
