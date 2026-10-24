// Real Chrome behavior check. PUPPETEER_PATH points to an existing QA installation.
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
import {demonstration} from "../src/demo.mjs";
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const server=createAppServer();
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port;
const out=resolve("docs/receipts/task-space-20261024");
await mkdir(out,{recursive:true});
let browser;
const pageErrors=[],offsite=[];
const report={course:"actual Chrome task-space interaction",
  tests:[],source:"authored synthetic 2D geometry",browser:null};
function record(name){report.tests.push(name);}
function watch(page){
  page.on("pageerror",e=>pageErrors.push(String(e)));
  page.on("request",r=>{if(!r.url().startsWith(url+"/"))offsite.push(r.url());});
}
try{
  browser=await puppeteer.launch({
    executablePath:process.env.CHROME_BINARY||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless:true,args:["--no-first-run","--disable-extensions","--no-default-browser-check"]
  });
  report.browser=await browser.version();
  const page=await browser.newPage();watch(page);
  await page.setViewport({width:1380,height:960,deviceScaleFactor:1});
  await page.goto(url+"/",{waitUntil:"networkidle0"});
  await page.waitForSelector("#targetSvg .goal");
  assert.equal(await page.$$eval("#markChoices button",els=>els.length),3);
  assert.equal(await page.$$eval("#targetSvg .goal",els=>els.length),3);
  record("authored source and three computed target marks render in Chrome");
  await page.click("#check");
  assert.match(await page.$eval("#evaluation",el=>el.textContent),/NEEDS ADJUSTMENT/);
  record("incorrect initial learner mark produces tolerance refusal");
  await page.$eval("#widthMm",el=>{el.value="420";el.dispatchEvent(new Event("change",{bubbles:true}));});
  await page.$eval("#heightMm",el=>{el.value="90";el.dispatchEvent(new Event("change",{bubbles:true}));});
  await page.select("#handed","mirrored");
  await page.click("#markChoices button:nth-child(2)");
  const altBefore=await page.$eval("#alternativeOutcome",el=>el.textContent);
  assert.match(altBefore,/Predicted separation:/);
  assert.equal(await page.$$eval("#targetSvg .alternative-goal",els=>els.length),1);
  const firstAlt=await page.$eval("#alternateRule",el=>el.value);
  assert.equal(firstAlt,"left");
  await page.select("#alternateRule","right");
  const altAfter=await page.$eval("#alternativeOutcome",el=>el.textContent);
  assert.notEqual(altAfter,altBefore);
  assert.match(await page.$eval("#variationIdea",el=>el.textContent),
    /Hypothetical distinguishing demonstration/);
  record("competing authored task interpretations produce distinct, inspectable geometric predictions");
  await page.$eval("#targetSvg",el=>el.scrollIntoView({block:"center"}));
  const loc=await page.$eval("#targetSvg .goal.selected",el=>{
    const svg=el.ownerSVGElement,p=svg.createSVGPoint();
    p.x=Number(el.getAttribute("cx"));p.y=Number(el.getAttribute("cy"));
    const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
  });
  await page.mouse.click(loc.x,loc.y);
  await page.click("#check");
  assert.match(await page.$eval("#evaluation",el=>el.textContent),/WITHIN TOLERANCE/);
  record("mirrored 420x90 target accepts accurate physical placement");
  await page.evaluate(()=>document.querySelector("#targetSvg").focus());
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");
  await page.click("#check");
  assert.match(await page.$eval("#evaluation",el=>el.textContent),/NEEDS ADJUSTMENT/);
  record("keyboard nudge in mirrored view produces measured error");
  await page.$eval("#showGoal",el=>el.click());
  assert.equal(await page.$$eval("#targetSvg .goal",els=>els.length),0);
  await page.$eval("#showGoal",el=>el.click());
  assert.equal(await page.$$eval("#targetSvg .goal",els=>els.length),3);
  record("practice toggle hides and restores source-backed targets");
  await page.screenshot({path:out+"/desktop.png",fullPage:true});
  const bad=structuredClone(demonstration);
  bad.title="Invalid imported sample";bad.source.corners[1]=bad.source.corners[0];
  await writeFile(out+"/bad-input.json",JSON.stringify(bad));
  const input=await page.$("#demoFile");
  await input.uploadFile(out+"/bad-input.json");
  assert.match(await page.$eval("#error",el=>el.textContent),/Source rejected/);
  assert.equal(await page.$$eval("#markChoices button",els=>els.length),3);
  record("invalid imported calibration rejected without losing the previous sample");
  const good=structuredClone(demonstration);good.title="Custom imported authored sample";
  await writeFile(out+"/valid-input.json",JSON.stringify(good));
  await input.uploadFile(out+"/valid-input.json");
  assert.match(await page.$eval("#demoLabel",el=>el.textContent),/Custom imported/);
  record("custom locally imported demonstration accepted");
  await page.$eval("#sourceSvg",el=>el.scrollIntoView({block:"center"}));
  const sourceClick=await page.$eval("#sourceSvg",el=>{
    const p=el.createSVGPoint();p.x=330;p.y=240;
    const q=p.matrixTransform(el.getScreenCTM());return{x:q.x,y:q.y};
  });
  await page.mouse.click(sourceClick.x,sourceClick.y);
  assert.ok(Number(await page.$eval("#sourceX",el=>el.value))>0);
  assert.equal(await page.$$eval("#sourceSvg .source-draft",els=>els.length),1);
  record("source click captures a provisional pixel annotation inside the page");
  await page.select("#annotationKind","edge_offset_mm");
  await page.select("#annotationEdge","right");
  await page.$eval("#annotationLabel",el=>{el.value="Authored right-edge guide";});
  await page.$eval("#annotationTolerance",el=>{el.value="2.5";});
  await page.click('#authorForm button[type="submit"]');
  assert.equal(await page.$$eval("#markChoices button",els=>els.length),4);
  assert.match(await page.$eval("#rule",el=>el.textContent),/FIXED CLEARANCE/);
  assert.match(await page.$eval("#annotationStatus",el=>el.textContent),/saved locally/);
  record("authored physical-edge mark joins source, target and rule inspector");
  await page.screenshot({path:out+"/authored-mark.png",fullPage:true});
  await page.$eval("#sourceX",el=>{el.value="9000";el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.$eval("#sourceY",el=>{el.value="9000";el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.click('#authorForm button[type="submit"]');
  assert.match(await page.$eval("#error",el=>el.textContent),/valid source pixel coordinates/);
  assert.equal(await page.$$eval("#markChoices button",els=>els.length),4);
  record("out-of-frame authoring attempt is refused without mutating annotations");
  await page.evaluate(()=>{
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=(blob)=>{window.__sourceDownloadBlob=blob;return original(blob);};
  });
  await page.click("#downloadSource");
  const authored=await page.evaluate(async()=>JSON.parse(await window.__sourceDownloadBlob.text()));
  assert.equal(authored.landmarks.length,4);
  assert.equal(authored.landmarks.at(-1).kind,"edge_offset_mm");
  assert.equal(authored.landmarks.at(-1).edge,"right");
  assert.equal(authored.landmarks.at(-1).toleranceMm,2.5);
  await writeFile(out+"/authored-source.json",JSON.stringify(authored,null,2));
  record("downloaded local source JSON retains authored landmark, edge and tolerance");
  const mobile=await browser.newPage();watch(mobile);
  await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});
  await mobile.goto(url+"/",{waitUntil:"networkidle0"});
  await mobile.waitForSelector("#targetSvg .goal");
  const widths=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,
    inner:window.innerWidth}));
  assert.ok(widths.scroll<=widths.inner+2,"Mobile overflow "+JSON.stringify(widths));
  await mobile.screenshot({path:out+"/mobile-390.png",fullPage:true});
  record("390px mobile view renders without horizontal overflow");
  assert.deepEqual(pageErrors,[]);assert.deepEqual(offsite,[]);
  record("no page exceptions or offsite requests");
  report.result="PASS";
  console.log(JSON.stringify(report,null,2));
}finally{
  report.errors=pageErrors;report.offsite=offsite;
  await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
