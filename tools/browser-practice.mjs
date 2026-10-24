// Actual browser course. All placements and source pixels are authored controls.
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const server=createAppServer();await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port,out=resolve(process.env.QA_OUTPUT||"docs/receipts/task-practice-20261024");await mkdir(out,{recursive:true});
const fixture={title:"Authored complete-task control",provenance:"Authored complete-task control",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:"left",label:"Left guide",kind:"edge_offset_mm",edge:"left",sourcePx:{x:20,y:20},toleranceMm:1},
    {id:"center",label:"Center",kind:"fraction",sourcePx:{x:50,y:40},toleranceMm:2},
    {id:"top",label:"Top guide",kind:"edge_offset_mm",edge:"top",sourcePx:{x:75,y:10},toleranceMm:1}]};
const exact=[{id:"left",x:20,y:40},{id:"center",x:100,y:80},{id:"top",x:150,y:10}];
const sourcePath=out+"/source.json";await writeFile(sourcePath,JSON.stringify(fixture));
const errors=[],offsite=[],report={course:"complete landmark task practice",evidence:"authored analytic controls",tests:[]};
let browser;const record=name=>report.tests.push(name);
function watch(p){p.on("pageerror",e=>errors.push(String(e)));p.on("request",r=>{if(!r.url().startsWith(url+"/")&&!r.url().startsWith("blob:"))offsite.push(r.url());});}
const state=p=>p.$eval("#taskOutcome",e=>e.dataset.state);
const count=p=>p.$$eval(".placed-point",els=>els.length);
try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--no-first-run","--disable-extensions","--no-default-browser-check"]});report.browser=await browser.version();
  const page=await browser.newPage();watch(page);await page.setViewport({width:1380,height:960,deviceScaleFactor:1});
  await page.goto(url+"/",{waitUntil:"networkidle0"});await(await page.$("#demoFile")).uploadFile(sourcePath);
  await page.waitForFunction(()=>document.getElementById("demoLabel").textContent.includes("Authored complete-task control"));
  await page.evaluate(()=>{document.getElementById("widthMm").value="200";document.getElementById("heightMm").value="160";document.getElementById("widthMm").dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("handed").value="mirrored";document.getElementById("showGoal").checked=false;});
  await Promise.all([page.waitForNavigation({waitUntil:"networkidle0"}),page.click("#practiceTask")]);await page.waitForSelector("#practiceMarks button");
  assert.equal(new URL(page.url()).pathname,"/practice");assert.match(await page.$eval("#setupLabel",e=>e.textContent),/Authored complete-task control · 200 × 160/);assert.equal(await page.$eval("#practiceView",e=>e.value),"mirrored");assert.equal(await page.$$eval(".practice-goal",els=>els.length),0);
  record("workbench transfers source, dimensions and hidden mirrored view into complete-task practice");
  await page.click("#reviewTask");assert.equal(await state(page),"incomplete");assert.equal(await count(page),0);
  const place=async(p,dx=0,dy=0)=>{await page.click('#practiceMarks button[data-id="'+p.id+'"]');await page.evaluate(v=>{document.getElementById("placementX").value=v.x;document.getElementById("placementY").value=v.y;document.getElementById("placementForm").requestSubmit();},{x:String(p.x+dx),y:String(p.y+dy)});};
  await place(exact[0],4,3);await page.click("#reviewTask");assert.equal(await state(page),"incomplete");record("empty and partial actual placement sets remain incomplete");
  await place(exact[1],4,3);await place(exact[2],4,3);await page.click("#reviewTask");assert.equal(await state(page),"needs-adjustment");assert.equal(await count(page),3);
  assert.match(await page.$eval("#shiftDiagnostic",e=>e.textContent),/4.0 mm across \/ 3.0 mm down/);assert.match(await page.$eval("#shiftDiagnostic",e=>e.textContent),/would leave 0.0 mm/);assert.equal(await page.$$eval(".practice-goal",els=>els.length),0);
  record("retained whole-set failure exposes shared displacement without applying a correction");await page.screenshot({path:out+"/desktop-review.png",fullPage:true});
  const x=await page.$eval("#placementX",e=>e.value);await page.select("#practiceView","standard");assert.equal(await page.$eval("#placementX",e=>e.value),x);
  await page.select("#practiceView","mirrored");await page.evaluate(()=>document.getElementById("practiceSvg").focus());await page.keyboard.press("ArrowRight");assert.equal(Number(await page.$eval("#placementX",e=>e.value)),153);assert.equal(await count(page),3);await place(exact[2],4,3);record("mirrored keyboard adjustment preserves other marks and physical coordinates");
  const bad=structuredClone(fixture);bad.source.corners[1]=bad.source.corners[0];await writeFile(out+"/bad-source.json",JSON.stringify(bad));await(await page.$("#practiceSource")).uploadFile(out+"/bad-source.json");await page.waitForFunction(()=>document.getElementById("practiceError").textContent.includes("Source refused"));assert.equal(await count(page),3);record("invalid source import retains every existing placement");
  await page.click("#retryTask");assert.equal(await count(page),0);assert.match(await page.$eval("#roundLabel",e=>e.textContent),/02/);assert.match(await page.$eval("#historyRows",e=>e.textContent),/Needs adjustment/);
  for(const p of exact)await place(p);await page.click("#reviewTask");assert.equal(await state(page),"passed");record("retry archives the failed round and a genuinely corrected full round passes");
  await page.evaluate(()=>{const old=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__download=b;return old(b);};});await page.click("#savePractice");const saved=await page.evaluate(async()=>JSON.parse(await window.__download.text()));
  assert.equal(saved.round,2);assert.equal(saved.history[0].attempts[0].xMm,24);assert.equal(saved.attempts.find(a=>a.id==="left").xMm,20);assert.equal("passed" in saved,false);const sessionPath=out+"/session.json";await writeFile(sessionPath,JSON.stringify(saved,null,2));record("actual download retains original and corrected placements, not fabricated verdicts");
  const stale=structuredClone(saved);stale.reference.target.widthMm=201;await writeFile(out+"/stale.json",JSON.stringify(stale));await(await page.$("#openPractice")).uploadFile(out+"/stale.json");await page.waitForFunction(()=>document.getElementById("practiceError").textContent.includes("target dimensions differ"));assert.equal(await count(page),3);assert.equal(await state(page),"passed");record("mismatched setup import refuses stale evidence without damaging the current round");
  await page.click("#retryTask");await(await page.$("#openPractice")).uploadFile(sessionPath);await page.waitForFunction(()=>document.getElementById("practiceStatus").textContent.includes("Session reopened"));assert.equal(await state(page),"in-progress");await page.click("#reviewTask");assert.equal(await state(page),"passed");record("reopened session recomputes outcomes from saved placements");
  const mobile=await browser.newPage();watch(mobile);await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});await mobile.goto(url+"/practice",{waitUntil:"networkidle0"});
  await mobile.evaluate(()=>{document.getElementById("practiceWidth").value="200";document.getElementById("practiceHeight").value="160";document.getElementById("setupForm").requestSubmit();});await(await mobile.$("#practiceSource")).uploadFile(sourcePath);await mobile.waitForFunction(()=>document.getElementById("setupLabel").textContent.includes("Authored complete-task control"));await(await mobile.$("#openPractice")).uploadFile(sessionPath);await mobile.waitForFunction(()=>document.getElementById("practiceStatus").textContent.includes("Session reopened"));await mobile.click("#reviewTask");assert.equal(await state(mobile),"passed");
  const width=await mobile.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(width.page<=width.viewport+2,JSON.stringify(width));await mobile.screenshot({path:out+"/mobile-practice.png",fullPage:true});record("fresh mobile browser reopens and reviews complete task with no horizontal overflow");
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);record("no browser exceptions or offsite requests");report.result="PASS";console.log(JSON.stringify(report,null,2));
}finally{report.errors=errors;report.offsite=offsite;await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
