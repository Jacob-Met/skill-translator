import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {requireSandbox,sha256,downloadJSON,assertOriginalCustody,capture,waitText} from './appearance-browser-helpers.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH);
const origin=process.env.HANDOFF_ORIGIN,video=process.env.ACQUIRE_VIDEO,legacyPath=process.env.HANDOFF_LEGACY_SOURCE,out=process.env.QA_OUTPUT;
assert.ok(origin&&video&&legacyPath&&out);await mkdir(out,{recursive:true,mode:0o700});await chmod(out,0o700);
const clipBytes=await readFile(video),legacy=JSON.parse(await readFile(legacyPath)),attribution=JSON.parse(await readFile(process.env.ACQUIRE_ATTRIBUTION));assert.equal(sha256(clipBytes),attribution.originalClipSha256);
const browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true});let context;const groups=[],errors=[],captures=[];
const complete=p=>p.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='complete');
const ready=p=>p.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='ready');
try{
 const sandbox=await requireSandbox(browser);context=await browser.newContext({viewport:{width:1440,height:900}});
 // Capture only actual received source messages. The probe never manufactures source or answers.
 await context.addInitScript(()=>{const Native=BroadcastChannel;window.__handoffProbe={held:[],received:[],hold:false};window.BroadcastChannel=class extends Native{set onmessage(fn){super.onmessage=event=>{if(event.data?.type==='source'){window.__handoffProbe.received.push(event.data.blob);if(window.__holdHandoff){window.__handoffProbe.held.push(()=>fn(event));return;}}return fn(event);};}};});
 context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));const p=await context.newPage();await p.goto(origin+'/sequence');await p.setInputFiles('#clip-file',video);await waitText(p,'#status',/Original clip ready/);
 for(const [i,time] of [.1,.7].entries()){const label='Direct appearance frame '+(i+1);await p.fill('#moment-time',String(time));await p.fill('#moment-label',label);await p.fill('#moment-state','Observer-selected original evidence; no physical action classification.');await p.click('#capture-moment');await waitText(p,'#status',new RegExp('Retained '+label));}
 assert.equal(await p.locator('.moment-card img').count(),2);assert.equal(await p.locator('#export-sequence').isDisabled(),true);assert.equal(await p.locator('#compare-appearance').isEnabled(),true);
 await p.fill('#step-title','Uncommitted observer note retained through comparison');const draftTitle=await p.locator('#step-title').inputValue();
 const pop=p.waitForEvent('popup');await p.click('#compare-appearance');const receiver=await pop;await ready(receiver);assert.equal(await p.locator('#step-title').inputValue(),draftTitle);assert.equal(new URL(receiver.url()).pathname,'/appearance-pair');assert.equal(new URL(receiver.url()).hash,'');
 const carried=await receiver.evaluate(async()=>JSON.parse(await window.__handoffProbe.received[0].text()));assert.equal(carried.sequence.moments.length,2);assert.deepEqual(carried.sequence.steps,[]);assert.equal(carried.sequence.clip.sha256,sha256(clipBytes));
 for(const m of carried.sequence.moments){const bytes=Buffer.from(carried.frames.find(f=>f.momentId===m.id).pngBase64,'base64');assert.equal(sha256(bytes),m.image.sha256);}
 await receiver.click('#compute');await complete(receiver);const saved=await downloadJSON(receiver,'#save',out,'two-frame-appearance.json');assertOriginalCustody(saved.value,carried);assert.deepEqual(saved.value.original.sequence.steps,[]);
 await receiver.reload();await receiver.setInputFiles('#source-file',saved.path);await complete(receiver);const reopened=await downloadJSON(receiver,'#save',out,'two-frame-reopened.json');assert.deepEqual(reopened.value,saved.value);
 groups.push('two ordinary original captures with no step: old export disabled, direct popup verifies PNGs and source-only save/reopen retains steps[]');
 captures.push(await capture(receiver,out,'handoff-two-frame390.png',390));await receiver.close();
 // Hold a real handoff delivery, replace through ordinary file input, then deliver the old callback.
 await context.addInitScript(()=>{window.__holdHandoff=true;});const pending=p.waitForEvent('popup');await p.click('#compare-appearance');const replaced=await pending;await replaced.waitForFunction(()=>window.__handoffProbe.held.length===1);
 await replaced.setInputFiles('#source-file',legacyPath);await ready(replaced);const manualBefore=await replaced.locator('#before option').count();assert.equal(manualBefore,legacy.sequence.moments.length);
 await replaced.evaluate(()=>{for(const f of window.__handoffProbe.held.splice(0))f();});await replaced.waitForTimeout(150);assert.equal(await replaced.locator('#before option').count(),manualBefore);await replaced.click('#compute');await complete(replaced);const manual=await downloadJSON(replaced,'#save',out,'manual-replacement.json');assertOriginalCustody(manual.value,legacy);await replaced.close();
 groups.push('ordinary manual source replacement retires a held actual handoff; late source cannot overwrite replacement');
 // No popup is permitted in this explicit failure control; the original studio must stay usable.
 await p.evaluate(()=>{window.__originalOpen=window.open;window.open=()=>null;});await p.click('#compare-appearance');await waitText(p,'#status',/blocked|new tab/i);assert.equal(await p.locator('.moment-card img').count(),2);assert.equal(await p.locator('#compare-appearance').isEnabled(),true);await p.evaluate(()=>{window.open=window.__originalOpen;});
 const retryPop=p.waitForEvent('popup');await p.click('#compare-appearance');const retry=await retryPop;await retry.waitForFunction(()=>window.__handoffProbe.held.length===1);await retry.evaluate(()=>{window.__holdHandoff=false;for(const f of window.__handoffProbe.held.splice(0))f();});await ready(retry);assert.equal(await p.locator('#step-title').inputValue(),draftTitle);await retry.close();
 groups.push('popup-block failure preserves original frames and unsaved draft, then actual retry receives successfully');
 // Existing four-frame/one-step legacy path uses the same real transient transport.
 await p.setInputFiles('#sequence-file',legacyPath);await waitText(p,'#status',/Reopened 4 verified/);assert.equal(await p.locator('#practice-decisions').isEnabled(),true);
 const oldPop=p.waitForEvent('popup');await p.click('#practice-decisions');const decision=await oldPop;await decision.waitForFunction(()=>window.__handoffProbe.held.length===1);await decision.evaluate(()=>{window.__holdHandoff=false;for(const f of window.__handoffProbe.held.splice(0))f();});
 await waitText(decision,'#status',/received|ready|verified|opened/i);assert.equal(new URL(decision.url()).pathname,'/decision-practice');const originalDecision=await decision.evaluate(async()=>JSON.parse(await window.__handoffProbe.received[0].text()));assert.deepEqual(originalDecision.sequence,legacy.sequence);assert.equal(originalDecision.sequence.steps.length,1);await decision.close();
 groups.push('legacy four-frame one-step direct decision handoff retains original source through shared transport');
 assert.deepEqual(errors,[]);await writeFile(join(out,'receipt.json'),JSON.stringify({status:'passed',groups,errors,sandbox,browser:await browser.version(),clipSHA256:sha256(clipBytes),legacySHA256:sha256(await readFile(legacyPath)),newFrames:carried.sequence.moments.map(m=>({id:m.id,sha256:m.image.sha256,presentedSeconds:m.origin.mediaTimeSeconds})),captures,scope:'Actual ordinary no-step source handoff, private licensed clip, no fabricated image observations or physical-action inference. Private PNG payload omitted.'},null,2));console.log(JSON.stringify({passed:groups.length,out}));
}catch(error){await writeFile(join(out,'failure.json'),JSON.stringify({status:'failed',groups,errors,error:String(error)},null,2));throw error;}finally{await context?.close();await browser.close();}
