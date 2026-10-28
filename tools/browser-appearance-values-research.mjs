import {createRequire} from 'node:module';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH),hash=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(process.env.ORIGINAL_BUNDLE,'utf8'),out=process.env.QA_OUTPUT;await mkdir(out,{recursive:true});
const settings={widthPx:160,radius:4},pairIndexes=[[0,1],[1,2],[2,3]];let browser,server;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true});
 const guard=await browser.newPage();await guard.goto('chrome://sandbox');const sandbox=await guard.locator('body').innerText();assert.match(sandbox,/PID namespaces\s+Yes/);assert.match(sandbox,/Seccomp-BPF sandbox\s+Yes/);await guard.close();
 server=createAppServer();await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/appearance-pair');
 const result=await page.evaluate(async({original,settings,pairIndexes})=>{
  const io=await import('/web/appearance-pair-input.mjs'),core=await import('/src/appearance-pair.mjs');
  const file=text=>new File([text],'retained-source.json',{type:'application/json'});const loaded=await io.readAppearanceInput(file(original)),pairs=[];
  try{for(const [a,b] of pairIndexes){const q=core.defaultAppearanceRequest(loaded.sequence,loaded.sequence.moments[a].id,loaded.sequence.moments[b].id,settings);
   const sampled=await io.makeAppearanceSamples(loaded,q),computed=core.inspectAppearanceSamples(sampled.source,loaded.sequence,sampled.before,sampled.after);
   const bundle=await io.makeAppearanceBundle(loaded,q),saved=JSON.parse(await bundle.text());saved.value=999;saved.comparison={meanAdjustedChange:999};
   let reopened;try{reopened=await io.readAppearanceInput(file(JSON.stringify(saved)));const next=await io.makeAppearanceSamples(reopened,reopened.request),again=core.inspectAppearanceSamples(next.source,reopened.sequence,next.before,next.after);if(JSON.stringify(again)!==JSON.stringify(computed))throw Error('Fresh saved-source recomputation differs');}finally{io.releaseAppearanceInput(reopened);}
   pairs.push({source:computed.source,comparison:computed.comparison,scalar:computed.comparison.meanAdjustedChange,sourceOnlyReopenRecomputed:true,forgedStoredFindingsIgnored:true});
  }}finally{io.releaseAppearanceInput(loaded);}
  return {pairs,inference:null};
 },{original,settings,pairIndexes});
 assert.equal(result.pairs.length,3);assert.deepEqual(errors,[]);assert.ok(result.pairs.every(p=>Number.isFinite(p.scalar)&&p.comparison.alternatives.length));
 const paths=['src/appearance-pair.mjs','src/visual-translation.mjs','web/appearance-pair-input.mjs','web/sequence-input.mjs'];const sourceHashes=Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await readFile(new URL('../'+p,import.meta.url)))])));
 const receipt={status:'passed',scope:'Actual original PNG browser admission, frozen whole-frame sampling, finite appearance computation and source-only fresh reopening; no new UI or decision inference',createdUtc:new Date().toISOString(),browser:await browser.version(),sandbox,settings,pairIndexes,bundleSHA256:hash(original),sourceHashes,errors,...result,limits:['All three pairs come from the same original scissors recording; no independent-recording claim.','Finite-image residual and minimizing shifts do not establish physical correspondence, contact, action or skill.','No numerical threshold fitter or owner schema was edited.']};
 await writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:'passed',pairs:receipt.pairs.map(p=>({scalar:p.scalar,status:p.comparison.status,minima:p.comparison.alternatives.length,boundary:p.comparison.boundaryMinimum})),output:out+'/receipt.json'}));
}finally{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));}
