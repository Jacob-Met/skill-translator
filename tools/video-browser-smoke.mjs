// Generates an original four-frame clip with FFmpeg and receives selected
// frames through the actual local browser UI. No external footage is required.
import {createRequire} from "node:module";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const out=resolve(process.env.RECEIPT_DIR||"docs/receipts/video-source-20261024");await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port,errors=[],offsite=[],tests=[];
const report={fixture:"original authored four-frame clip; no physical demonstration claim"};let browser;
const record=name=>tests.push(name);
async function field(page,id,value,event="input"){await page.$eval("#"+id,(el,{value,event})=>{el.value=String(value);el.dispatchEvent(new Event(event,{bubbles:true}));},{value,event});}
async function upload(page,id,path){await (await page.$("#"+id)).uploadFile(path);}
async function pixels(page,x,y){return page.$eval("#captureSvg image",async(el,{x,y})=>{const image=new Image();image.src=el.getAttribute("href");await image.decode();const canvas=document.createElement("canvas");canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);return [...ctx.getImageData(x,y,1,1).data];},{x,y});}
try{
  browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||"/usr/bin/google-chrome",args:["--no-first-run","--disable-extensions","--no-default-browser-check"]});report.browser=await browser.version();
  const page=await browser.newPage();page.on("pageerror",error=>errors.push(String(error)));page.on("request",r=>{const url=new URL(r.url());if(["http:","https:","ws:","wss:"].includes(url.protocol)&&url.origin!==origin)offsite.push(r.url());});
  await page.setViewport({width:1380,height:960});await page.goto(origin+"/capture",{waitUntil:"networkidle0"});
  const frames=await page.evaluate(()=>Array.from({length:4},(_,i)=>{
    const canvas=document.createElement("canvas");canvas.width=640;canvas.height=360;const c=canvas.getContext("2d");c.fillStyle="#312e28";c.fillRect(0,0,640,360);c.fillStyle="#eee1c1";c.fillRect(60,40,520,280);
    c.fillStyle="#264736";c.font="18px sans-serif";c.fillText("AUTHORED TIMING FIXTURE / "+i,110,100);
    c.fillStyle=i<2?"#e02020":"#2030df";c.fillRect(i<2?110:410,160,30,30);return canvas.toDataURL("image/png");
  }));
  for(const [i,data] of frames.entries())await writeFile(out+"/frame-"+i+".png",Buffer.from(data.split(",")[1],"base64"));
  const ffmpeg=spawnSync(process.env.FFMPEG_BINARY||"ffmpeg",["-y","-loglevel","error","-framerate","2","-i",out+"/frame-%d.png","-c:v","libvpx-vp9","-pix_fmt","yuv420p","-r","2",out+"/authored-clip.webm"],{encoding:"utf8"});assert.equal(ffmpeg.status,0,ffmpeg.stderr||ffmpeg.error?.message);
  const mp4=spawnSync(process.env.FFMPEG_BINARY||"ffmpeg",["-y","-loglevel","error","-framerate","2","-i",out+"/frame-%d.png","-c:v","libx264","-pix_fmt","yuv420p","-r","2","-movflags","+faststart",out+"/authored-clip.mp4"],{encoding:"utf8"});assert.equal(mp4.status,0,mp4.stderr||mp4.error?.message);
  const clipBytes=await readFile(out+"/authored-clip.webm"),clipDigest=createHash("sha256").update(clipBytes).digest("hex");await writeFile(out+"/invalid.webm","not a video");
  await page.click("#videoSourcePanel summary");await upload(page,"videoFile",out+"/authored-clip.webm");await page.waitForFunction(()=>document.querySelector("#videoStatus").textContent.includes("original clip identified"));await page.waitForFunction(()=>!document.querySelector("#captureFrame").disabled);
  await field(page,"videoTime",.25,"change");await page.waitForFunction(()=>!document.querySelector("#clipPlayer video").seeking&&!document.querySelector("#captureFrame").disabled);await page.click("#captureFrame");
  await page.waitForFunction(()=>document.querySelector("#videoStatus").textContent.includes("Frame captured"),{timeout:12000});assert.match(await page.$eval("#videoStatus",el=>el.textContent),/requested 0.250 s · presented 0.000 s/);
  const red=await pixels(page,115,165);assert.ok(red[0]>150&&red[1]<100&&red[2]<100,JSON.stringify(red));record("first selected moment uses actual red-frame pixels and reports distinct requested/presented time");
  const firstIdentity=await page.$eval("#photoIdentity",el=>el.textContent);
  await upload(page,"videoFile",out+"/invalid.webm");await page.waitForFunction(()=>document.querySelector("#studioError").textContent.includes("Clip refused"));assert.equal(await page.$eval("#photoIdentity",el=>el.textContent),firstIdentity);assert.ok((await pixels(page,115,165))[0]>150);record("corrupt replacement clip preserves the accepted source and original usable video");
  await field(page,"videoTime",2,"change");assert.match(await page.$eval("#studioError",el=>el.textContent),/end of the clip/);assert.equal(await page.$eval("#photoIdentity",el=>el.textContent),firstIdentity);
  await field(page,"videoTime",1.25,"change");await page.waitForFunction(()=>!document.querySelector("#clipPlayer video").seeking&&!document.querySelector("#captureFrame").disabled);await page.click("#captureFrame");
  await page.waitForFunction(()=>document.querySelector("#videoStatus").textContent.includes("presented 1.000 s"),{timeout:12000});const blue=await pixels(page,415,165);assert.ok(blue[2]>150&&blue[0]<100&&blue[1]<100,JSON.stringify(blue));assert.notEqual(await page.$eval("#photoIdentity",el=>el.textContent),firstIdentity);record("changed-time input selects the known blue frame; invalid endpoint cannot replace the source");
  for(const [i,p] of [[60,40],[580,40],[580,320],[60,320]].entries()){await field(page,"cornerX"+i,p[0]);await field(page,"cornerY"+i,p[1]);}
  await page.click("#applyCalibration");await field(page,"markX",415);await field(page,"markY",165);await field(page,"markLabel","Blue alignment guide");await page.click("#addCaptureMark");assert.match(await page.$eval("#markCount",el=>el.textContent),/1 source mark/);
  await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==="application/json")window.__annotations=blob;if(blob.type==="image/png")window.__frame=blob;return create(blob);};});
  await page.click("#downloadCapture");await page.click("#downloadFrame");
  const exported=await page.evaluate(async()=>({demo:JSON.parse(await window.__annotations.text()),png:[...new Uint8Array(await window.__frame.arrayBuffer())]}));
  const frameBytes=Buffer.from(exported.png),frameDigest=createHash("sha256").update(frameBytes).digest("hex");
  assert.equal(exported.demo.source.origin.clip.sha256,clipDigest);assert.equal(exported.demo.source.origin.mediaTimeSeconds,1);assert.equal(exported.demo.source.origin.requestedTimeSeconds,1.25);assert.equal(exported.demo.source.image.sha256,frameDigest);assert.equal(exported.demo.source.origin.frameSha256,frameDigest);
  await writeFile(out+"/selected-frame.png",frameBytes);await writeFile(out+"/selected-frame.json",JSON.stringify(exported.demo));record("annotation export binds original clip bytes, reported frame time and independently hashed extracted PNG");
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+"/video-studio.png",fullPage:true});
  await page.goto(origin+"/",{waitUntil:"networkidle0"});await upload(page,"demoFile",out+"/selected-frame.json");await page.waitForFunction(()=>document.querySelectorAll("#markChoices button").length===1);await upload(page,"sourcePhoto",out+"/selected-frame.png");await page.waitForSelector("#sourceSvg image");assert.match(await page.$eval("#sourcePhotoStatus",el=>el.textContent),/Original pixels paired/);record("extracted frame and annotations reopen in the maintained workbench with exact image pairing");
  const paired=await page.$eval("#sourceSvg image",el=>el.getAttribute("href")),wrong=structuredClone(exported.demo);wrong.source.origin.frameSha256="0".repeat(64);await writeFile(out+"/wrong-frame-link.json",JSON.stringify(wrong));await upload(page,"demoFile",out+"/wrong-frame-link.json");await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("video frame record does not match"));assert.equal(await page.$eval("#sourceSvg image",el=>el.getAttribute("href")),paired);record("a changed frame record is refused on source import while accepted image pairing remains");
  await page.goto(origin+"/capture",{waitUntil:"networkidle0"});await upload(page,"photoFile",out+"/frame-0.png");await page.waitForFunction(()=>document.querySelector("#photoIdentity").textContent.includes("640 × 360"));assert.equal(await page.$eval("#sourceBadge",el=>el.textContent),"LOCAL FILE");assert.equal(await page.$eval("#downloadFrame",el=>el.disabled),true);
  await page.click("#videoSourcePanel summary");await upload(page,"videoFile",out+"/authored-clip.mp4");await page.waitForFunction(()=>document.querySelector("#videoStatus").textContent.includes("original clip identified"));await field(page,"videoTime",1.25,"change");await page.waitForFunction(()=>!document.querySelector("#captureFrame").disabled);await page.click("#captureFrame");await page.waitForFunction(()=>document.querySelector("#videoStatus").textContent.includes("presented 1.000 s"),{timeout:12000});assert.ok((await pixels(page,415,165))[2]>150);record("an MP4 decoder supplies the same known selected-frame pixels and reported timing");
  await page.evaluate(()=>{window.__originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){return window.__originalToBlob.call(this,blob=>{window.__releaseOldFrame=()=>callback(blob);},...args);};});
  await page.click("#captureFrame");await page.waitForFunction(()=>typeof window.__releaseOldFrame==="function");await upload(page,"photoFile",out+"/frame-0.png");await page.waitForFunction(()=>document.querySelector("#sourceBadge").textContent==="LOCAL FILE");
  const newestPhoto=await page.$eval("#photoIdentity",el=>el.textContent);await page.evaluate(async()=>{HTMLCanvasElement.prototype.toBlob=window.__originalToBlob;window.__releaseOldFrame();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.equal(await page.$eval("#photoIdentity",el=>el.textContent),newestPhoto);assert.equal(await page.$eval("#downloadFrame",el=>el.disabled),true);assert.ok((await pixels(page,115,165))[0]>150);record("a newer source photo cancels delayed PNG encoding and the older frame cannot replace it");
  await page.setViewport({width:390,height:844});const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(width.scroll<=width.width+2,JSON.stringify(width));record("ordinary source photos remain available and the expanded video controls fit 390px");
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);record("no page exceptions or offsite requests");report.result="PASS";
}finally{
  report.tests=tests;report.errors=errors;report.offsite=offsite;await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");if(browser)await browser.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify(report,null,2));
}
