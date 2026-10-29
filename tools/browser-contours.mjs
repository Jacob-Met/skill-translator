import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createAppServer} from '../server.mjs';
const {withBrowserSession}=await import(pathToFileURL(process.env.BROWSER_HELPER));
const out=process.env.QA_OUTPUT;await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,receipt={groups:[]};
try{await withBrowserSession({root:new URL('..',import.meta.url).pathname,chromeBin:process.env.CHROME_BINARY,runDirectory:out+'-session'},async({send,evaluate,exceptions,sandbox})=>{
 await send('Page.enable');await send('Runtime.enable');
 const wait=async(code)=>{for(let i=0;i<200;i++){if(await evaluate(code))return;await new Promise(r=>setTimeout(r,50));}throw Error(code+' '+await evaluate("document.getElementById('status')?.textContent"));};
 const upload=async(selector,file)=>{const{root}=await send('DOM.getDocument');const{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId,files:[file]});};
 const open=async()=>{await send('Page.navigate',{url:base+'/sequence-contours'});await wait("document.readyState==='complete'&&!!document.getElementById('source')");};
 await open();await upload('#source',process.env.SOURCE_BUNDLE);await wait("document.getElementById('status').textContent.startsWith('Original PNG')");
 for(let f=0;f<4;f++)for(let t=0;t<2;t++){
  await upload('#report',process.env.NATIVE_REPORTS+`/frame-${f}-tile-${t}.json`);
  const expected=JSON.parse(await readFile(process.env.NATIVE_REPORTS+`/frame-${f}-tile-${t}.json`));
  await wait(`document.getElementById('coverage').textContent.includes('${expected.chains.length} native walks visit ${expected.coverage.visitedEdgePixels}')`);
  assert.equal(await evaluate("document.getElementById('chain').options.length"),expected.chains.length+1);
 }
 receipt.groups.push('all eight actual original-PNG native reports admitted; all walks and omitted coverage visible');
 await upload('#report',process.env.NATIVE_REPORTS+'/frame-1-tile-0.json');await wait("document.getElementById('coverage').textContent.includes('43 native walks')");
 const report=JSON.parse(await readFile(process.env.NATIVE_REPORTS+'/frame-1-tile-0.json'));
 const longest=report.chains.reduce((a,b)=>a.points.length>b.points.length?a:b);
 await evaluate(`document.getElementById('chain').value='all';document.getElementById('chain').dispatchEvent(new Event('change'))`);
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});await evaluate("document.getElementById('save').click()");
 let saved;for(let i=0;i<100;i++){try{saved=JSON.parse(await readFile(out+'/source-contours.json'));break;}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.deepEqual(saved.report,report);const original=JSON.parse(await readFile(process.env.SOURCE_BUNDLE));assert.deepEqual(saved.source.sequence,original.sequence);assert.deepEqual(saved.source.frames,original.frames);
 receipt.groups.push('actual download retains every original PNG and complete native edge/contour report');
 await send('Page.navigate',{url:'about:blank'});await wait("location.href==='about:blank'");await open();await upload('#source',out+'/source-contours.json');await wait("document.getElementById('status').textContent.startsWith('Saved source')");
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await evaluate(`document.getElementById('chain').value='all';document.getElementById('chain').dispatchEvent(new Event('change'));document.getElementById('work').scrollIntoView()`);
 assert.equal(await evaluate("Promise.all([...document.querySelectorAll('#frame image')].map(node=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=node.getAttribute('href');}))).then(values=>values.every(Boolean))"),true);
 const picture=await send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/contour-390.png',Buffer.from(picture.data,'base64'));
 assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
 const bad=structuredClone(saved);bad.report.edgeReport.image.sha256='0'.repeat(64);await writeFile(out+'/bad.json',JSON.stringify(bad));await upload('#source',out+'/bad.json');await wait("document.getElementById('status').textContent.includes('identity differs')");assert.match(await evaluate("document.getElementById('coverage').textContent"),/43 native walks/);
 receipt.groups.push('fresh 390px saved-source replay and wrong-source refusal preserves accepted original/report');
 assert.deepEqual(exceptions,[]);receipt.sandbox=sandbox;receipt.status='pass';
 });}catch(error){receipt.status='failed';receipt.error=error.stack;throw error;}finally{await writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));await new Promise(r=>{server.close(r);server.closeAllConnections();});}
