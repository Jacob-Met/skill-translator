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
