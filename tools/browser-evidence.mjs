// Actual browser receiving for the observation -> contradiction -> next-test loop.
// The analytic fixture is authored geometry, never physical demonstration evidence.
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
const server=createAppServer();
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port;
const out=resolve(process.env.QA_OUTPUT||"docs/receipts/rule-evidence-20261024");
await mkdir(out,{recursive:true});
const fixture={title:"Authored analytic sheet",provenance:"Authored analytic controls; no physical experiment",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:"guide",label:"Guide",kind:"edge_offset_mm",edge:"left",sourcePx:{x:20,y:30},toleranceMm:50}]};
const sourcePath=out+"/analytic-source.json";
await writeFile(sourcePath,JSON.stringify(fixture));
const errors=[],offsite=[],report={course:"additional-demonstration evidence loop",evidence:"authored analytic controls",tests:[]};
const record=name=>report.tests.push(name);
let browser;
function watch(page){
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!r.url().startsWith(url+"/")&&!r.url().startsWith("blob:"))offsite.push(r.url());});
}
try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless:true,args:["--no-first-run","--disable-extensions","--no-default-browser-check"]});
  report.browser=await browser.version();
  const page=await browser.newPage();watch(page);
  await page.setViewport({width:1380,height:960,deviceScaleFactor:1});
  await page.goto(url+"/",{waitUntil:"networkidle0"});
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"no-evidence");
  assert.equal(await page.$$eval("#candidateCards .untested",els=>els.length),5);
  record("source does not automatically count as a discriminating demonstration");
  await (await page.$("#demoFile")).uploadFile(sourcePath);
  await page.waitForFunction(()=>document.getElementById("demoLabel").textContent.includes("Authored analytic sheet"));
  const enter=async(fields)=>{
    await page.evaluate(values=>{
      for(const [id,value] of Object.entries(values))document.getElementById(id).value=String(value);
      document.getElementById("observationForm").requestSubmit();
    },{obsLabel:"Authored fixed-left trial",obsClass:"authored-example",obsWidth:200,obsHeight:160,
      obsX:20,obsY:60,obsUncertainty:0.5,...fields});
  };
  await enter();
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  assert.deepEqual(await page.$$eval("#candidateCards .compatible",els=>els.map(e=>e.dataset.rule)),["left"]);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),1);
  assert.equal(await page.$$eval("#evidenceSvg .measurement-bound",els=>els.length),1);
  record("entered dimensions and mark select only the analytically compatible fixed-left rule");
  await enter({obsLabel:"Authored unfamiliar sheet",obsWidth:300,obsHeight:240,obsX:20,obsY:90});
  assert.equal(await page.$$eval("#candidateCards .compatible",els=>els.length),1);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),2);
  record("a second unfamiliar sheet tests the same rule without refitting");
  await enter({obsLabel:"Authored conflicting result",obsX:40});
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"none-compatible");
  assert.match(await page.$eval("#evidenceProposal",e=>e.textContent),/Review contradictory/);
  await page.click('button[aria-label="Remove Authored conflicting result"]');
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  record("contradictory evidence eliminates every candidate; removing that record restores support");
  await page.evaluate(()=>{
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=blob=>{window.__evidenceDownload=blob;return original(blob);};
  });
  await page.click("#exportObservations");
  const bundle=await page.evaluate(async()=>JSON.parse(await window.__evidenceDownload.text()));
  assert.equal(bundle.observations.length,2);
  assert.equal(bundle.observations[0].sourceReference.landmark.sourcePx.x,20);
  assert.equal(bundle.observations[0].evidenceClass,"authored-example");
  assert.equal(bundle.observations[0].uncertaintyMm,0.5);
  const savedPath=out+"/saved-observations.json";
  await writeFile(savedPath,JSON.stringify(bundle,null,2));
  record("actual downloaded JSON retains observation origin, source anchor and measurement radius");
  const changed=structuredClone(bundle);changed.observations[0].sourceReference.landmark.sourcePx.x=21;
  await writeFile(out+"/wrong-source.json",JSON.stringify(changed));
  await (await page.$("#observationFile")).uploadFile(out+"/wrong-source.json");
  await page.waitForFunction(()=>document.getElementById("error").textContent.includes("source reference differs"));
  assert.match(await page.$eval("#error",e=>e.textContent),/source reference differs/);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),2);
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  record("mismatched-source evidence import is refused without damaging prior observations");
  await page.click('button[aria-label="Remove Authored unfamiliar sheet"]');
  await page.click('button[aria-label="Remove Authored fixed-left trial"]');
  await enter({obsLabel:"Authored same-size ambiguity",obsWidth:100,obsHeight:80,obsX:20,obsY:30});
  assert.equal(await page.$$eval("#candidateCards .compatible",els=>els.length),5);
  assert.match(await page.$eval("#evidenceProposal",e=>e.textContent),/10 of 10/);
  await page.$eval("#planUncertainty",e=>{e.value="1000";e.dispatchEvent(new Event("input",{bubbles:true}));});
  assert.match(await page.$eval("#evidenceProposal",e=>e.textContent),/None of the tested/);
  record("same-size ambiguity remains visible and the proposed test respects measurement precision");
  await (await page.$("#observationFile")).uploadFile(savedPath);
  await page.waitForFunction(()=>document.querySelectorAll("#observationRows tr").length===2);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),2);
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  await page.click("#observationRows tr:first-child .observation-link");
  assert.match(await page.$eval("#observationView",e=>e.textContent),/Authored fixed-left trial/);
  record("saved evidence reopens transactionally and each source selects its visual comparison");
  const badSource=structuredClone(fixture);badSource.source.corners[1]=badSource.source.corners[0];
  await writeFile(out+"/bad-source.json",JSON.stringify(badSource));
  await (await page.$("#demoFile")).uploadFile(out+"/bad-source.json");
  await page.waitForFunction(()=>document.getElementById("error").textContent.includes("Source rejected"));
  assert.match(await page.$eval("#error",e=>e.textContent),/Source rejected/);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),2);
  record("a refused source replacement preserves the evidence attached to the prior source");
  const badImage=structuredClone(fixture);badImage.source.image={sha256:"invalid",widthPx:100,heightPx:80};
  await writeFile(out+"/bad-image-source.json",JSON.stringify(badImage));
  await (await page.$("#demoFile")).uploadFile(out+"/bad-image-source.json");
  await page.waitForFunction(()=>document.getElementById("error").textContent.includes("Source image needs its SHA-256 identity"));
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),2);
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  record("malformed source-image identity is refused before replacing the current source or evidence");
  await page.$eval("#planUncertainty",e=>{e.value="2";e.dispatchEvent(new Event("input",{bubbles:true}));});
  await (await page.$("#evidenceLab")).screenshot({path:out+"/desktop-evidence.png"});
  const mobile=await browser.newPage();watch(mobile);
  await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});
  await mobile.goto(url+"/",{waitUntil:"networkidle0"});
  await (await mobile.$("#demoFile")).uploadFile(sourcePath);
  await mobile.waitForFunction(()=>document.getElementById("demoLabel").textContent.includes("Authored analytic sheet"));
  await (await mobile.$("#observationFile")).uploadFile(savedPath);
  await mobile.waitForFunction(()=>document.querySelectorAll("#observationRows tr").length===2);
  assert.equal(await mobile.$eval("#evidenceSummary",e=>e.dataset.status),"single-compatible");
  const width=await mobile.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(width.page<=width.viewport+2,JSON.stringify(width));
  await (await mobile.$("#evidenceLab")).screenshot({path:out+"/mobile-evidence.png"});
  record("fresh 390px browser reopens source and evidence without document overflow");
  const newSource=structuredClone(fixture);newSource.source.widthMm=101;
  await writeFile(out+"/new-source.json",JSON.stringify(newSource));
  await (await page.$("#demoFile")).uploadFile(out+"/new-source.json");
  await page.waitForFunction(()=>document.getElementById("evidenceSummary").dataset.status==="no-evidence");
  assert.equal(await page.$eval("#evidenceSummary",e=>e.dataset.status),"no-evidence");
  await (await page.$("#observationFile")).uploadFile(savedPath);
  await page.waitForFunction(()=>document.getElementById("error").textContent.includes("source reference differs"));
  assert.match(await page.$eval("#error",e=>e.textContent),/source reference differs/);
  assert.equal(await page.$$eval("#observationRows tr",els=>els.length),0);
  record("replacing the source clears prior evidence and rejects stale-source replay");
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
  record("no observed browser exception or offsite request");
  report.result="PASS";console.log(JSON.stringify(report,null,2));
}finally{
  report.errors=errors;report.offsite=offsite;
  await writeFile(out+"/browser-receipt.json",JSON.stringify(report,null,2)+"\n");
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
