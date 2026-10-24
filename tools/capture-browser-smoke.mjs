// Receiving test: creates its own labeled bitmap fixture, then uses actual file
// selectors, SVG clicks, calibration controls, exports and original-image pairing.
import {createRequire} from "node:module";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
import {demonstration} from "../src/demo.mjs";
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const out=resolve(process.env.RECEIPT_DIR||"docs/receipts/source-capture-20261024");
await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port;
let browser;const errors=[],offsite=[],groups=[];
const report={course:"source photo calibration and maintained workbench receiving",fixture:"original authored bitmap; not a physical craft demonstration"};
const record=name=>groups.push(name);
async function value(page,id,value){await page.$eval("#"+id,(el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));},value);}
async function svgClick(page,id,x,y){await page.$eval("#"+id,el=>el.scrollIntoView({block:"center"}));const p=await page.$eval("#"+id,(el,p)=>{const v=el.createSVGPoint();v.x=p.x;v.y=p.y;const s=v.matrixTransform(el.getScreenCTM());return{x:s.x,y:s.y};},{x,y});await page.mouse.click(p.x,p.y);}
async function upload(page,id,path){const input=await page.$("#"+id);await input.uploadFile(path);}
function watch(page){page.on("pageerror",e=>errors.push(String(e)));page.on("request",r=>{if(!r.url().startsWith(origin+"/")&&!r.url().startsWith("blob:"))offsite.push(r.url());});}
try{
  browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||"/usr/bin/google-chrome",args:["--no-first-run","--disable-extensions","--no-default-browser-check"]});
  report.browser=await browser.version();const page=await browser.newPage();watch(page);
  await page.setViewport({width:1380,height:960,deviceScaleFactor:1});await page.goto(origin+"/capture",{waitUntil:"networkidle0"});
  assert.equal(await page.$eval("#downloadCapture",el=>el.disabled),true);
  const fixture=await page.evaluate(()=>{
    const c=document.createElement("canvas");c.width=800;c.height=550;const x=c.getContext("2d");
    x.fillStyle="#463d32";x.fillRect(0,0,800,550);x.fillStyle="#ece1c0";x.beginPath();x.moveTo(100,70);x.lineTo(700,100);x.lineTo(660,480);x.lineTo(80,440);x.closePath();x.fill();
    x.fillStyle="#2c4d39";x.font="20px sans-serif";x.fillText("AUTHORED TEST IMAGE",220,180);x.fillRect(135,250,5,5);x.fillStyle="#725f49";x.fillRect(330,320,85,3);
    const png=c.toDataURL("image/png"),jpeg=c.toDataURL("image/jpeg");x.fillStyle="#e44832";x.fillRect(0,0,40,40);return {png,jpeg,wrong:c.toDataURL("image/png")};
  });
  for(const [key,data] of Object.entries(fixture))await writeFile(out+"/"+key+(key==="jpeg"?".jpg":".png"),Buffer.from(data.split(",")[1],"base64"));
  // Original JPEG plus a minimal authored EXIF orientation=6 entry. This
  // exercises real browser-oriented dimensions for ordinary rotated photos.
  const jpeg=await readFile(out+"/jpeg.jpg");
  const exif=Buffer.from([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
  await writeFile(out+"/rotated.jpg",Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)]));
  await writeFile(out+"/invalid.png","this is not an image");
  await upload(page,"photoFile",out+"/png.png");await page.waitForFunction(()=>document.querySelector("#photoIdentity").textContent.includes("800 × 550"));
  const identity=await page.$eval("#photoIdentity",el=>el.textContent);
  await upload(page,"photoFile",out+"/invalid.png");await page.waitForFunction(()=>document.querySelector("#studioError").textContent.includes("Photo refused"));
  assert.equal(await page.$eval("#photoIdentity",el=>el.textContent),identity);record("decoded local PNG shown; malformed replacement preserves accepted pixels");
  for(const p of [[100,70],[700,100],[660,480],[80,440]])await svgClick(page,"captureSvg",...p);
  await page.click("#applyCalibration");assert.match(await page.$eval("#calibrationStatus",el=>el.textContent),/Calibration applied/);
  await page.select("#markKind","edge_offset_mm");await page.select("#markEdge","left");await value(page,"markLabel","Observed guide mark");
  await svgClick(page,"captureSvg",135,250);await page.click("#addCaptureMark");assert.match(await page.$eval("#markCount",el=>el.textContent),/1 source mark/);
  record("actual pointer-selected corners calibrate a skewed photo and retain a human-authored edge mark");
  await value(page,"markX",799);await value(page,"markY",549);await page.click("#addCaptureMark");assert.match(await page.$eval("#studioError",el=>el.textContent),/outside/);assert.match(await page.$eval("#markCount",el=>el.textContent),/1 source mark/);
  await value(page,"cornerX0",9000);assert.equal(await page.$eval("#addCaptureMark",el=>el.disabled),true);assert.equal(await page.$eval("#downloadCapture",el=>el.disabled),true);
  await page.click("#applyCalibration");assert.match(await page.$eval("#studioError",el=>el.textContent),/inside/);await page.click("#revertCalibration");assert.equal(await page.$eval("#downloadCapture",el=>el.disabled),false);
  await value(page,"captureWidth",0);await page.click("#applyCalibration");assert.match(await page.$eval("#studioError",el=>el.textContent),/dimensions/);await page.click("#revertCalibration");
  record("invalid marks/calibration preserve prior work and draft edits cannot be exported as accepted calibration");
  await page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==="application/json")window.__captureBlob=blob;return original(blob);};});
  await page.click("#downloadCapture");const demo=await page.evaluate(async()=>JSON.parse(await window.__captureBlob.text()));
  const digest=createHash("sha256").update(await readFile(out+"/png.png")).digest("hex");
  assert.equal(demo.source.image.sha256,digest);assert.equal(demo.source.image.widthPx,800);assert.equal(demo.landmarks.length,1);assert.equal(demo.landmarks[0].edge,"left");assert.equal(JSON.stringify(demo).includes("data:image"),false);
  await writeFile(out+"/capture.json",JSON.stringify(demo));await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+"/studio-desktop.png",fullPage:true});
  record("downloaded annotations match independently hashed image bytes without embedding the photo");
  await page.goto(origin+"/",{waitUntil:"networkidle0"});await upload(page,"demoFile",out+"/capture.json");await page.waitForFunction(()=>document.querySelectorAll("#markChoices button").length===1);
  assert.equal(await page.$$eval("#sourceSvg image",els=>els.length),0);
  await upload(page,"sourcePhoto",out+"/wrong.png");await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("does not match"));assert.equal(await page.$$eval("#sourceSvg image",els=>els.length),0);
  await upload(page,"sourcePhoto",out+"/png.png");await page.waitForSelector("#sourceSvg image");assert.match(await page.$eval("#sourcePhotoStatus",el=>el.textContent),/Original pixels paired/);
  const originalUrl=await page.$eval("#sourceSvg image",el=>el.getAttribute("href"));
  await upload(page,"sourcePhoto",out+"/wrong.png");await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("does not match"));assert.equal(await page.$eval("#sourceSvg image",el=>el.getAttribute("href")),originalUrl);
  record("maintained workbench imports captured marks, requires exact original pixels and preserves correct pairing on mismatch");
  const invalid=structuredClone(demo);invalid.source.image.sha256="bad";await writeFile(out+"/invalid-source.json",JSON.stringify(invalid));await upload(page,"demoFile",out+"/invalid-source.json");await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("Source rejected"));assert.equal(await page.$eval("#sourceSvg image",el=>el.getAttribute("href")),originalUrl);
  await upload(page,"sourcePhoto",out+"/png.png");await page.waitForFunction(()=>document.querySelector("#error").hidden);await page.screenshot({path:out+"/workbench-photo.png",fullPage:true});
  await writeFile(out+"/legacy-source.json",JSON.stringify(demonstration));await upload(page,"demoFile",out+"/legacy-source.json");await page.waitForFunction(()=>document.querySelectorAll("#markChoices button").length===3);assert.equal(await page.$$eval("#sourceSvg image",els=>els.length),0);
  record("malformed source metadata is transactional; legacy authored source imports remove stale photo pairing");
  await page.evaluate(({older,newer})=>{
    const input=document.querySelector("#demoFile");
    const first=new File([JSON.stringify(older)],"slow-old.json",{type:"application/json"});
    first.text=()=>new Promise(resolve=>{window.__resolveOldImport=()=>resolve(JSON.stringify(older));});
    const a=new DataTransfer();a.items.add(first);input.files=a.files;input.dispatchEvent(new Event("change"));
    const b=new DataTransfer();b.items.add(new File([JSON.stringify(newer)],"newer.json",{type:"application/json"}));input.files=b.files;input.dispatchEvent(new Event("change"));
  },{older:demo,newer:{...demonstration,title:"Newest selected demonstration"}});
  await page.waitForFunction(()=>document.querySelector("#demoLabel").textContent.includes("Newest selected"));
  await page.evaluate(async()=>{window.__resolveOldImport();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.match(await page.$eval("#demoLabel",el=>el.textContent),/Newest selected/);assert.equal(await page.$$eval("#sourceSvg image",els=>els.length),0);
  record("a slower prior source import cannot replace a newer source or its image-pairing state");
  await page.goto(origin+"/capture",{waitUntil:"networkidle0"});await upload(page,"photoFile",out+"/jpeg.jpg");await page.waitForFunction(()=>document.querySelector("#photoIdentity").textContent.includes("800 × 550"));
  for(const [i,p] of [[100,70],[700,100],[660,480],[80,440]].entries()){await value(page,"cornerX"+i,p[0]);await value(page,"cornerY"+i,p[1]);}
  await page.click("#applyCalibration");assert.match(await page.$eval("#calibrationStatus",el=>el.textContent),/Calibration applied/);record("JPEG decoding and numeric keyboard corner authoring use the same calibrated contract");
  await upload(page,"photoFile",out+"/rotated.jpg");await page.waitForFunction(()=>document.querySelector("#photoIdentity").textContent.includes("550 × 800"));assert.equal(await page.$eval("#captureSvg",el=>el.getAttribute("viewBox")),"0 0 550 800");record("EXIF-rotated JPEG uses displayed orientation for source pixel coordinates");
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(sizes.scroll<=sizes.width+2,JSON.stringify(sizes));await page.screenshot({path:out+"/studio-mobile.png",fullPage:true});record("390px source studio has no horizontal overflow");
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);record("no page exceptions or offsite requests");report.result="PASS";
}finally{
  report.tests=groups;report.errors=errors;report.offsite=offsite;await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");
  if(browser)await browser.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify(report,null,2));
}
