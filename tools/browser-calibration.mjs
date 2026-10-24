// Actual local Chrome receiving. All image/measurement fixtures are authored.
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const out=resolve(process.env.QA_OUTPUT||"docs/receipts/calibration-checks-20261024");await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const base="http://127.0.0.1:"+server.address().port,errors=[],offsite=[];
const report={course:"source-bound independent calibration checks",fixtureClass:"authored coordinates and PNG, not physical validation",tests:[],result:"FAIL"};
let browser;
function record(name){report.tests.push(name);}
const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||"/usr/local/bin/google-chrome",headless:true,
    args:["--no-sandbox","--disable-dev-shm-usage","--no-first-run","--disable-extensions"]});
  report.browser=await browser.version();const page=await browser.newPage();
  function watch(p){p.on("pageerror",e=>errors.push(String(e)));p.on("request",r=>{if(!r.url().startsWith(base+"/")&&!r.url().startsWith("blob:"))offsite.push(r.url());});}
  watch(page);await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
  await page.goto(base+"/",{waitUntil:"networkidle0"});await page.click('a[href="/calibration-checks"]');
  await page.waitForSelector('#resultState[data-state="no-independent-checks"]');
  assert.equal(await page.$eval("#photoControl",e=>getComputedStyle(e).display),"none");record("workbench navigation opens unchecked source and excludes nonexistent photo control");
  await page.click("#exampleGood");assert.equal(await page.$eval("#resultState",e=>e.dataset.state),"compatible-at-checks");
  assert.equal(await page.$$eval("#checkRows tr",r=>r.length),5);assert.match(await page.$eval("#metrics",e=>e.textContent),/25.0%/);
  record("five independent authored coordinates agree; hull extent and task proximity are visible");
  await page.click("#exampleBad");assert.equal(await page.$eval("#resultState",e=>e.dataset.state),"incompatible");
  assert.match(await page.$eval("#metrics",e=>e.textContent),/4.00 mm/);record("interior 4 mm mismatch is detected despite unchanged fitted corners");
  async function fill(values){await page.evaluate(values=>{for(const [id,value]of Object.entries(values)){const e=document.getElementById(id);if(e.type==="checkbox")e.checked=value;else e.value=value;}},values);}
  await fill({checkLabel:"Independent ruler check",pixelX:280,pixelY:190,measuredX:120,measuredY:80,bound:.5,independent:true,evidenceClass:"reported-measurement"});
  await page.click('#checkForm button[type="submit"]');assert.equal(await page.$$eval("#checkRows tr",r=>r.length),6);
  assert.match(await page.$eval("#resultText",e=>e.textContent),/1 reported measurement/);record("manual independent check is added without concealing authored failures");
  await fill({checkLabel:"Fitted corner control",pixelX:40,pixelY:30,measuredX:0,measuredY:0});
  await page.click('#checkForm button[type="submit"]');assert.match(await page.$eval("#resultText",e=>e.textContent),/1 fitted-corner check/);
  assert.match(await page.$eval("#checkRows tr:last-child",e=>e.textContent),/fitted corner/);record("fitted corner is visibly excluded from independent evidence");
  await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==="application/json")window.__download=blob;return create(blob);};});
  await page.click("#exportChecks");const saved=await page.evaluate(async()=>JSON.parse(await window.__download.text()));
  await page.click("#exportSource");const source=await page.evaluate(async()=>JSON.parse(await window.__download.text()));
  assert.equal(saved.checks.length,7);assert.equal(saved.schema,"skill-translator-calibration-checks/v1");
  await writeFile(out+"/checks.json",JSON.stringify(saved));await writeFile(out+"/source.json",JSON.stringify(source));
  await page.click("#clearChecks");assert.equal(await page.$$eval("#checkRows tr",r=>r.length),0);
  await (await page.$("#checksFile")).uploadFile(out+"/checks.json");await page.waitForFunction(()=>document.querySelectorAll("#checkRows tr").length===7);
  assert.equal(await page.$eval("#resultState",e=>e.dataset.state),"incompatible");record("source-bound save/reopen reproduces seven checks and recomputes their findings");
  const forged=structuredClone(saved);forged.sourceReference.widthMm=300;await writeFile(out+"/wrong-checks.json",JSON.stringify(forged));
  await (await page.$("#checksFile")).uploadFile(out+"/wrong-checks.json");await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("different source"));
  assert.equal(await page.$$eval("#checkRows tr",r=>r.length),7);record("mismatched check file is refused without replacing accepted measurements");
  const invalid=structuredClone(source);invalid.source.corners[1]=invalid.source.corners[0];await writeFile(out+"/invalid-source.json",JSON.stringify(invalid));
  await (await page.$("#sourceFile")).uploadFile(out+"/invalid-source.json");await page.waitForFunction(()=>document.querySelector("#error").textContent.length>0);
  assert.equal(await page.$$eval("#checkRows tr",r=>r.length),7);record("invalid source replacement preserves the accepted source and its check ledger");
  await (await page.$("#sourceFile")).uploadFile(out+"/source.json");await page.waitForFunction(()=>document.querySelectorAll("#checkRows tr").length===0);
  assert.equal(await page.$eval("#independent",e=>e.checked),false);assert.equal(await page.$eval("#pixelX",e=>e.value),"");
  await (await page.$("#checksFile")).uploadFile(out+"/checks.json");await page.waitForFunction(()=>document.querySelectorAll("#checkRows tr").length===7);
  record("explicit source reopen clears stale checks and matching saved evidence can be restored");
  await page.evaluate(source=>{
    const text=File.prototype.text;File.prototype.text=function(){if(this.name==="slow.json")return new Promise(ok=>setTimeout(()=>text.call(this).then(ok),250));return text.call(this);};
    const send=value=>{const data=new DataTransfer();data.items.add(new File([JSON.stringify(value.source)],value.name,{type:"application/json"}));const e=document.getElementById("sourceFile");e.files=data.files;e.dispatchEvent(new Event("change",{bubbles:true}));};
    send({name:"slow.json",source:{...source,title:"STALE SOURCE"}});send({name:"new.json",source:{...source,title:"LATEST SOURCE"}});
  },source);
  await page.waitForFunction(()=>document.querySelector("#sourceTitle").textContent==="LATEST SOURCE");await wait(350);
  assert.equal(await page.$eval("#sourceTitle",e=>e.textContent),"LATEST SOURCE");record("deliberately reordered source reads cannot restore stale source identity");
  await page.click("#exampleBad");await page.screenshot({path:out+"/desktop-calibration.png",fullPage:true});
  const png=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=560;canvas.height=390;const c=canvas.getContext("2d");c.fillStyle="#d8d3ba";c.fillRect(0,0,560,390);c.strokeStyle="#354d55";c.lineWidth=2;c.strokeRect(40,30,480,320);for(const [x,y]of [[160,110],[400,110],[400,270],[160,270],[280,190]]){c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.stroke();}return canvas.toDataURL("image/png").split(",")[1];});
  const bytes=Buffer.from(png,"base64"),photo=structuredClone(source);photo.title="Authored photo-backed source";
  photo.source.image={sha256:createHash("sha256").update(bytes).digest("hex"),widthPx:560,heightPx:390,mimeType:"image/png",name:"original.png",pixelCoordinates:"browser-oriented"};
  await writeFile(out+"/renamed.png",bytes);await writeFile(out+"/photo-source.json",JSON.stringify(photo));
  await (await page.$("#sourceFile")).uploadFile(out+"/photo-source.json");await page.waitForFunction(()=>document.querySelector("#sourceTitle").textContent==="Authored photo-backed source");
  await (await page.$("#photoFile")).uploadFile(out+"/renamed.png");await page.waitForSelector("#sourceMap image");
  assert.match(await page.$eval("#photoStatus",e=>e.textContent),/paired by full digest/);record("original PNG is paired through maintained full-hash capture contract; identical renamed bytes are accepted");
  const photoUrl=await page.$eval("#sourceMap image",e=>e.getAttribute("href"));
  const wrong=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=560;c.height=390;return c.toDataURL("image/png").split(",")[1];});
  await writeFile(out+"/wrong.png",Buffer.from(wrong,"base64"));await (await page.$("#photoFile")).uploadFile(out+"/wrong.png");
  await page.waitForFunction(()=>document.querySelector("#error").textContent.includes("does not match"));
  assert.equal(await page.$eval("#sourceMap image",e=>e.getAttribute("href")),photoUrl);record("wrong same-size photo is refused while accepted original pixels remain");
  await page.$eval("#sourceMap",e=>e.scrollIntoView({block:"center"}));
  const position=await page.$eval("#sourceMap",svg=>{const p=svg.createSVGPoint();p.x=160;p.y=110;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
  await page.mouse.click(position.x,position.y);assert.ok(Math.abs(Number(await page.$eval("#pixelX",e=>e.value))-160)<1);
  await fill({checkLabel:"Authored photo coordinate",measuredX:60,measuredY:40,bound:.5,independent:true,evidenceClass:"authored-example"});
  await page.click('#checkForm button[type="submit"]');assert.equal(await page.$eval("#resultState",e=>e.dataset.state),"compatible-at-checks");
  await page.screenshot({path:out+"/photo-calibration.png",fullPage:true});record("clicking paired source pixels supplies coordinates and checks an independently specified position");
  const mobile=await browser.newPage();watch(mobile);await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});
  await mobile.goto(base+"/calibration-checks",{waitUntil:"networkidle0"});await mobile.click("#exampleBad");
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await mobile.screenshot({path:out+"/mobile-calibration.png",fullPage:true});record("390px mobile layout has no document overflow");
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);record("no browser exceptions or offsite requests");report.result="PASS";
}catch(error){report.failure=String(error.stack||error);throw error;}
finally{report.errors=errors;report.offsite=offsite;await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
