import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function requireSandbox(browser){
 const p=await browser.newPage();try{await p.goto('chrome://sandbox');const text=await p.locator('body').innerText();assert.match(text,/Layer 1 Sandbox\s+Namespace/);assert.match(text,/Seccomp-BPF sandbox\s+Yes/);return text;}finally{await p.close();}
}
export async function installProbe(page){
 await page.addInitScript(()=>{
  const NativeWorker=window.Worker,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  const probe=window.__pairProbe={created:[],revoked:[],workers:[],delayNextReply:0,repliesReceived:0};
  URL.createObjectURL=value=>{const u=create(value);probe.created.push(u);return u;};
  URL.revokeObjectURL=u=>{probe.revoked.push(u);return revoke(u);};
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.record={url:String(args[0]),terminated:false};probe.workers.push(this.record);}
   terminate(){this.record.terminated=true;super.terminate();}
   set onmessage(fn){super.onmessage=e=>{probe.repliesReceived++;const ms=probe.delayNextReply;probe.delayNextReply=0;if(ms)setTimeout(()=>fn(e),ms);else fn(e);};}
  };
 });
}
export async function downloadJSON(page,selector,out,name){
 const pending=page.waitForEvent('download');await page.click(selector);const download=await pending,path=join(out,name);await download.saveAs(path);const bytes=await readFile(path);return{path,sha256:sha256(bytes),value:JSON.parse(bytes)};
}
export async function uploadJSON(page,selector,value,name='source.json'){
 await page.setInputFiles(selector,{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
}
export async function waitText(page,selector,pattern){
 await page.waitForFunction(({selector,source,flags})=>new RegExp(source,flags).test(document.querySelector(selector)?.textContent??''),{selector,source:pattern.source,flags:pattern.flags});
}
export async function capture(page,out,name,width){
 await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);const path=join(out,name);await page.screenshot({path,fullPage:true});return{name,sha256:sha256(await readFile(path))};
}
export async function markLiveURLs(page){return page.evaluate(()=>window.__pairProbe.created.filter(u=>!window.__pairProbe.revoked.includes(u)));}
export async function assertRevoked(page,urls){await page.waitForFunction(urls=>urls.every(u=>window.__pairProbe.revoked.includes(u)),urls);}
export async function delayedReply(page,computeSelector){
 const before=await page.evaluate(()=>{window.__pairProbe.delayNextReply=800;return window.__pairProbe.repliesReceived;});await page.click(computeSelector);
 // Wait until a real response has arrived and is held, then perform the competing action.
 await page.waitForFunction(n=>window.__pairProbe.repliesReceived>n,before);
}
export async function writeReceipt(out,value){await mkdir(out,{recursive:true});await writeFile(join(out,'receipt.json'),JSON.stringify(value,null,2)+'\n');}
export function assertOriginalCustody(saved,original){
 assert.equal(saved.format,'skill-translator.appearance-pair/v1');
 assert.ok(!Object.hasOwn(saved,'value')&&!Object.hasOwn(saved,'comparison'),'Export must omit derived answers');
 assert.deepEqual(saved.original.sequence,original.sequence,'Original sequence metadata/attributions changed');
 const frames=value=>Object.fromEntries(value.frames.map(f=>[f.momentId,f.pngBase64]));
 assert.deepEqual(frames(saved.original),frames(original),'Original PNG bytes or moment association changed');
 assert.equal(saved.request.clipSha256,original.sequence.clip.sha256);
 for(const f of saved.request.frames){const m=original.sequence.moments.find(m=>m.id===f.momentId);assert.ok(m);assert.equal(f.sha256,m.image.sha256);assert.equal(f.presentedSeconds,m.origin.mediaTimeSeconds);}
 const q=saved.request;assert.deepEqual(q.support,{left:q.radius,top:q.radius,width:q.widthPx-2*q.radius,height:q.heightPx-2*q.radius});
}
export async function assertRetired(page,saveSelector,resultSelector){
 assert.equal(await page.locator(saveSelector).isDisabled(),true);
 assert.equal(await page.locator(resultSelector+' .appearance-pair-result').count(),0,'Old result must retire');
}
