import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {inspectRawRuleProposals,createRawRuleProposal,exportRawRuleProposal} from '../src/raw-rule-proposals.mjs';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {RESPONSE_SCHEMA} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA} from '../src/response-demonstrations.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/demonstration-practice-67b9f8');await mkdir(out,{recursive:true});
function png(color){const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;};const chunk=(name,data)=>{const n=Buffer.from(name),s=Buffer.alloc(4),c=Buffer.alloc(4);s.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([n,data])));return Buffer.concat([s,n,data,c]);};const width=210,height=170,header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;const pixels=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let k=0;k<3;k++)pixels[y*(width*3+1)+1+x*3+k]=(color[k]+(x*y)%37)%256;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
const bytes=png([20,120,180]),wrong=png([180,30,90]);await writeFile(out+'/original.png',bytes);await writeFile(out+'/wrong.png',wrong);
const meta={sha256:createHash('sha256').update(bytes).digest('hex'),widthPx:210,heightPx:170,mimeType:'image/png',name:'original.png',pixelCoordinates:'browser-oriented'};
const annotation=(w,h,x,y)=>({title:'Original authored source',provenance:'Authored PNG controls, not physical demonstrations',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],image:meta},landmarks:[{id:'point',label:'Point',kind:'fraction',sourcePx:{x,y},toleranceMm:1}]});
const make=(x=20,y=60,xb=.1,yb=.1)=>({schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:{schema:RESPONSE_SCHEMA,source:annotation(100,80,20,30),landmarkId:'point',coefficientLimit:2,observations:[],target:{widthMm:273,heightMm:119}},demonstrations:[{id:'reference',label:'Additional raw annotation',evidenceClass:'authored-example',annotation:annotation(200,160,x,y),landmarkId:'point',correspondenceConfirmed:true,xBoundMm:xb,yBoundMm:yb}]});
const raw=make(40,30,.001,.001);raw.demonstrations[0].annotation=annotation(200,80,40,30);
await writeFile(out+'/account.json',JSON.stringify(raw));
function loopbackOrigin(value){
  assert(/^http:\/\/127\.0\.0\.1(?::[0-9]{1,5})?\/?$/.test(value),
    'External receiving requires an HTTP 127.0.0.1 origin without credentials, path, query or fragment');
  const url=new URL(value);
  const port=Number(url.port||80);
  assert(Number.isInteger(port)&&port>=1&&port<=65535,'Invalid receiving port');
  return url.origin;
}
const externalURL=process.env.SKILL_RECEIVE_BASE_URL;
const externalOrigin=externalURL===undefined?null:loopbackOrigin(externalURL);
let server;
let base=externalOrigin;
if(externalOrigin===null){server=createAppServer();await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});base='http://127.0.0.1:'+server.address().port;}
const hosting=externalOrigin===null?'receiver self-hosted':'external';
let browser,page,sandboxReceipt;const errors=[],consoleErrors=[],consoleMessages=[],failedResponses=[],tests=[];let faviconProbe,consoleClassification;
const save=async(selector,name)=>{const waiting=page.waitForEvent('download');await page.locator(selector).click();const d=await waiting;await d.saveAs(out+'/'+name+'.json');};
async function practice(height,y,name,source=raw.referenceStudy.source,x=54.6){
 await page.goto(base+'/practice');await page.evaluate(input=>sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify(input)),{demo:source,widthMm:273,heightMm:height});await page.reload();
 await page.locator('#placementX').fill(String(x));await page.locator('#placementY').fill(String(y));await page.locator('#placementForm button[type="submit"]').click();await page.locator('#reviewTask').click();await save('#savePractice',name);
}
async function compare(name,state){await page.goto(base+'/demonstration-practice');await page.locator('#account-file').setInputFiles(out+'/account.json');await page.waitForFunction(()=>!document.querySelector('#session-file').disabled);await page.locator('#session-file').setInputFiles(out+'/'+name+'.json');await page.waitForFunction(s=>document.querySelector('#verdict').dataset.state===s,state);}

// Independent authored fixture relationships: reference (20,30) on 100x80,
// second (40,30) on 200x80. X remains 20% of width; supported Y rules
// preserve top clearance 30, fraction 3/8, or bottom clearance 50.
async function captureTargets(name,height,expectedY,coincident,expectedXByRule={}){
 const expectedRules=Object.keys(expectedY).sort(),numbers=expectedRules.map((_,i)=>String(i+1));
 const previous=page.viewportSize();
 for(const [suffix,width,h] of [['desktop',1440,1000],['390px',390,844]]){
  await page.setViewportSize({width,height:h});
  await page.locator('#comparison').scrollIntoViewIfNeeded();
  const rows=await page.locator('#alternatives .alternative').evaluateAll(els=>els.map(el=>({
   number:el.querySelector('.target-number').textContent,rule:el.querySelector('strong').textContent,
   text:el.querySelector('p').textContent})));
  assert.equal(rows.length,expectedRules.length,'Every conditional explanation remains present');
  assert.deepEqual(rows.map(r=>r.number),numbers);
  assert.deepEqual(rows.map(r=>r.rule).sort(),expectedRules);
  for(const row of rows){
   const match=row.text.match(/Target \(([-\d.]+), ([-\d.]+)\) mm/);
   assert(match,'Retained target coordinates remain readable');
   assert.equal(Number(match[1]),expectedXByRule[row.rule]??54.6,'Independent fixture X for '+row.rule);
   assert.equal(Number(match[2]),Number(expectedY[row.rule].toFixed(3)),row.rule+' independent Y expectation');
  }
  const drawing=await page.locator('#comparison-map').evaluate(svg=>{
   const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
   return {viewBox:svg.getAttribute('viewBox'),box:box(svg),
    rect:[...svg.querySelectorAll('rect:not(.target-map-badge)')].map(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y'),width:+el.getAttribute('width'),height:+el.getAttribute('height')})),
    circles:[...svg.querySelectorAll('circle')].map(el=>({x:+el.getAttribute('cx'),y:+el.getAttribute('cy'),box:box(el)})),
    texts:[...svg.querySelectorAll('text')].map(el=>({text:el.textContent,x:+el.getAttribute('x'),y:+el.getAttribute('y'),box:box(el),font:getComputedStyle(el).fontSize})),
    leaders:[...svg.querySelectorAll('.target-leader')].map(el=>({x1:+el.getAttribute('x1'),y1:+el.getAttribute('y1'),x2:+el.getAttribute('x2'),y2:+el.getAttribute('y2')})),
    badges:[...svg.querySelectorAll('.target-map-badge')].map(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y'),width:+el.getAttribute('width'),height:+el.getAttribute('height'),box:box(el)})),
    labelScale:Math.hypot(svg.getScreenCTM().c,svg.getScreenCTM().d),
    actual:[...svg.querySelectorAll('path')].map(el=>{const b=el.getBBox();return{d:el.getAttribute('d'),box:box(el),bbox:{x:b.x,y:b.y,width:b.width,height:b.height},center:{x:b.x+b.width/2,y:b.y+b.height/2}};})};
  });
  assert.equal(drawing.rect.length,1);assert.equal(drawing.actual.length,1,'Actual placement remains drawn');
  assert.equal(drawing.circles.length,coincident?1:expectedRules.length,'Only mathematically identical predictions share a circle');
  const labels=drawing.texts.filter(t=>/^\d+(,\d+)*$/.test(t.text));
  assert.equal(labels.length,coincident?1:expectedRules.length);
  assert.deepEqual(labels.flatMap(l=>l.text.split(',')).sort(),numbers,'All explanation numbers survive grouping');
  assert.equal(drawing.leaders.length,labels.length,'One explicit leader per annotation');
  assert.equal(drawing.badges.length,labels.length,'Every annotation retains its readable badge');
  const surface=drawing.rect[0];
  // getBBox reports rendering geometry with observed float32-scale rounding.
  // Limit this allowance to bounding-box centres; numeric target/leader checks stay stricter.
  const viewBox=drawing.viewBox.trim().split(/\s+/).map(Number);
  assert(viewBox.length===4&&viewBox.every(Number.isFinite)&&viewBox[2]>0&&viewBox[3]>0);
  const centreRoundoffBound=Math.max(viewBox[2],viewBox[3])*2**-23;
  const expectedActual={x:surface.x+surface.width*(54.6/273),y:surface.y+surface.height*(30/height)};
  drawing.actualCentreCheck={expected:expectedActual,observed:drawing.actual[0].center,
   delta:{x:drawing.actual[0].center.x-expectedActual.x,y:drawing.actual[0].center.y-expectedActual.y},
   boundSvgUnits:centreRoundoffBound,basis:'viewBox maximum extent times 2^-23; bounding-box rendering roundoff only'};
  assert(Math.abs(drawing.actualCentreCheck.delta.x)<=centreRoundoffBound,'Actual marker retains independently authored X within rendering roundoff');
  assert(Math.abs(drawing.actualCentreCheck.delta.y)<=centreRoundoffBound,'Actual marker retains independently authored Y within rendering roundoff');
  for(const label of labels){
   const related=label.text.split(',').map(n=>rows.find(r=>r.number===n));
   const expectedX=surface.x+surface.width*((expectedXByRule[related[0].rule]??54.6)/273);
   const expectedPixelY=surface.y+surface.height*(expectedY[related[0].rule]/height);
   const circle=drawing.circles.find(c=>Math.abs(c.x-expectedX)<1e-7&&Math.abs(c.y-expectedPixelY)<1e-7);
   assert(circle,'Number corresponds to a circle at its independent fixture target');
   const leader=drawing.leaders.find(line=>Math.abs(line.x2-label.x)<1e-7);
   assert(leader,'Annotation has an explicit leader');
   assert(Math.abs(leader.x1-expectedX)<1e-7&&Math.abs(leader.y1-expectedPixelY)<1e-7,
    'Annotation leader returns to its unchanged independent target coordinates');
   const badge=drawing.badges.find(b=>label.x>=b.x&&label.x<=b.x+b.width&&label.y>=b.y&&label.y<=b.y+b.height);
   assert(badge,'Number is inside its own annotation badge');
   assert(leader.x2>=badge.x&&leader.x2<=badge.x+badge.width&&leader.y2>=badge.y&&leader.y2<=badge.y+badge.height,
    'Leader reaches the numbered badge');
   assert(parseFloat(label.font)*drawing.labelScale>=10,'Number font remains at least 10 CSS pixels at the observed viewport');
   assert(label.box.x>=badge.box.x-1&&label.box.x+label.box.width<=badge.box.x+badge.box.width+1,
    'Complete number list fits within the rendered badge');
   assert(label.box.y>=badge.box.y-1&&label.box.y+label.box.height<=badge.box.y+badge.box.height+1,
    'Number text fits vertically within the rendered badge');
   for(const row of related){assert.equal(expectedY[row.rule],expectedY[related[0].rule]);assert.equal(expectedXByRule[row.rule]??54.6,expectedXByRule[related[0].rule]??54.6);}
  }
  for(let i=0;i<labels.length;i++)for(let k=i+1;k<labels.length;k++){
   const a=labels[i].box,b=labels[k].box;
   assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,
    'Separate annotation labels must not overprint');
  }
  for(const badge of drawing.badges){const b=badge.box,m=drawing.box;
   assert(b.x>=m.x&&b.y>=m.y&&b.x+b.width<=m.x+m.width&&b.y+b.height<=m.y+m.height,
    'Annotation badge remains inside the visible map');
  }
  const viewport=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(viewport.scroll<=viewport.width+2,'No page-level horizontal overflow');
  await page.screenshot({path:out+'/'+name+'-'+suffix+'.png',fullPage:true});
  await page.locator('#comparison').screenshot({path:out+'/'+name+'-'+suffix+'-comparison.png'});
  await writeFile(out+'/'+name+'-'+suffix+'.json',JSON.stringify({fixture:{height,expectedY,expectedXByRule,actual:{x:54.6,y:30}},rows,drawing,viewport,
   note:'Coordinates checked; label legibility, overlap and distinction require independent pixel review.'},null,2));
 }
 await page.setViewportSize(previous);
 tests.push(name+': authored coordinate correspondence and desktop/390px pixels retained');
}

try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome-stable',headless:true,chromiumSandbox:true,args:['--disable-dev-shm-usage']});
 const preflight=await browser.newPage();
 let cdp;
 try{
  cdp=await preflight.context().newCDPSession(preflight);
  sandboxReceipt=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});
 }catch(error){sandboxReceipt=error.receipt??{admitted:false,failure:String(error)};throw error;}
 finally{
  try{await writeFile(out+'/sandbox-receipt.json',JSON.stringify(sandboxReceipt,null,2)+'\n');}
  finally{try{if(cdp)await cdp.detach();}finally{await preflight.close();}}
 }
 page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{const entry={type:message.type(),text:message.text(),location:message.location()};consoleMessages.push(entry);if(entry.type==='error')consoleErrors.push(entry);});page.on('response',response=>{if(response.status()>=400)failedResponses.push({url:response.url(),status:response.status(),resourceType:response.request().resourceType()});});page.setDefaultTimeout(10000);
 await practice(80,30,'all');await compare('all','within-all');assert.equal(await page.locator('#alternatives p').count(),3);tests.push('actual maintained practice agrees with all three unresolved demonstrated rules');
 await captureTargets('coincident-all3',80,{top:30,fraction:30,bottom:30},true);
 await practice(119,30,'some');await compare('some','within-some');assert.match(await page.locator('#original-score').textContent(),/outside tolerance/);tests.push('changed target distinguishes surviving rules while original failed score remains');
 await captureTargets('separated-some',119,{top:30,fraction:44.625,bottom:69},false);
 await page.locator('#inspection').selectOption('extra:reference');await page.locator('#image-file').setInputFiles(out+'/original.png');await page.waitForFunction(()=>document.querySelector('#image-status').textContent.includes('Pixels reattached locally'));
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await save('#save','comparison');
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#account-file').setInputFiles(out+'/comparison.json');await page.waitForFunction(()=>document.querySelector('#verdict').dataset.state==='within-some');await page.locator('#image-file').setInputFiles(out+'/original.png');await page.screenshot({path:out+'/narrow.png',fullPage:true});tests.push('source-only saved comparison recomputes with actual placements and original pixels at390px');
 await page.locator('#account-file').setInputFiles(out+'/account.json');assert.equal(await page.locator('#comparison').isVisible(),false);tests.push('replacement evidence retires the actual comparison');
 await practice(119,0,'none');await compare('none','within-none');tests.push('actual wrong placement cannot report conditional agreement');
 await page.goto(base+'/practice');await page.locator('#openPractice').setInputFiles(out+'/none.json');await page.waitForFunction(()=>document.querySelector('#practiceStatus').textContent.includes('Session reopened'));await page.locator('#retryTask').click();await save('#savePractice','missing');await compare('missing','missing-placement');await page.locator('#round').selectOption('1');await page.waitForFunction(()=>document.querySelector('#verdict').dataset.state==='within-none');tests.push('fresh missing round stays unscored and original actual prior round remains selectable');
 const changed=structuredClone(raw);changed.referenceStudy.source.provenance='Foreign source';await writeFile(out+'/foreign.json',JSON.stringify(changed));await page.locator('#account-file').setInputFiles(out+'/foreign.json');await page.waitForFunction(()=>!document.querySelector('#session-file').disabled);await page.locator('#session-file').setInputFiles(out+'/some.json');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import refused'));assert.equal(await page.locator('#comparison').isVisible(),false);tests.push('foreign source session cannot supply an apparently valid comparison');
 const unique=make(),proposal=createRawRuleProposal(unique);await writeFile(out+'/proposal.json',JSON.stringify(exportRawRuleProposal(unique)));await practice(119,44.625,'unique',proposal.source,20);await page.locator('a[href="/demonstration-practice"]').click();await page.locator('#account-file').setInputFiles(out+'/proposal.json');await page.waitForFunction(()=>!document.querySelector('#session-file').disabled);await page.locator('#session-file').setInputFiles(out+'/unique.json');await page.waitForFunction(()=>document.querySelector('#verdict').dataset.state==='within-all');assert.match(await page.locator('#original-score').textContent(),/One demonstrated relationship/);tests.push('existing saved raw proposal and actual inferred-source practice replay without manual unwrapping');
 await page.evaluate(()=>{const old=File.prototype.text;File.prototype.text=function(){return this.name==='unique.json'?old.call(this).then(text=>new Promise(resolve=>window.__release=()=>resolve(text))):old.call(this);};});await page.locator('#session-file').setInputFiles(out+'/unique.json');await page.waitForFunction(()=>typeof window.__release==='function');await page.locator('#account-file').setInputFiles(out+'/account.json');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original demonstration account accepted'));await page.evaluate(async()=>{window.__release();await new Promise(resolve=>setTimeout(resolve,0));});assert.equal(await page.locator('#comparison').isVisible(),false);tests.push('new accepted source retires an older pending practice-file read');
 await practice(80.02,30,'near-coincident');await compare('near-coincident','within-all');
 await captureTargets('near-coincident-all3',80.02,{top:30,fraction:30.0075,bottom:30.019999999999996},false);
 // Maintained raw-rule-proposals test establishes unchanged-size evidence retains five rules.
 const five=make();five.demonstrations[0].annotation=annotation(100,80,20,30);
 assert.equal(inspectRawRuleProposals(five).compatibleRules.length,5,'Actual model admits five authored alternatives');
 await writeFile(out+'/five-account.json',JSON.stringify(five));
 await practice(119,30,'five-capacity',five.referenceStudy.source);
 await page.goto(base+'/demonstration-practice');await page.locator('#account-file').setInputFiles(out+'/five-account.json');
 await page.waitForFunction(()=>!document.querySelector('#session-file').disabled);
 await page.locator('#session-file').setInputFiles(out+'/five-capacity.json');
 await page.waitForFunction(()=>document.querySelector('#verdict').dataset.state==='within-some');
 await captureTargets('five-distinct-capacity',119,{fraction:44.625,left:44.625,right:44.625,top:30,bottom:69},false,{fraction:54.6,left:20,right:193,top:54.6,bottom:54.6});
 // Chromium may automatically request an absent favicon; this is not a product script or stylesheet.
 // Retain every console entry; exempt only this exact URL/message with an actual 404 response.
 const faviconURL=base+'/favicon.ico';
 const faviconResponse=await fetch(faviconURL,{redirect:'error',signal:AbortSignal.timeout(5000)});
 faviconProbe={url:faviconURL,status:faviconResponse.status,contentType:faviconResponse.headers.get('content-type')};
 await faviconResponse.arrayBuffer();
 const faviconMessage='Failed to load resource: the server responded with a status of 404 (Not Found)';
 const knownFavicon=entry=>entry.text===faviconMessage&&entry.location?.url===faviconURL&&faviconProbe.status===404;
 consoleClassification=consoleErrors.map(entry=>({entry,classification:knownFavicon(entry)?'browser-generated favicon 404 (recorded, nonfatal)':'fatal console error'}));
 await writeFile(out+'/console-receipt.json',JSON.stringify({consoleMessages,consoleErrors,failedResponses,faviconProbe,consoleClassification},null,2));
 assert.deepEqual(errors,[]);
 assert.deepEqual(consoleErrors.filter(entry=>!knownFavicon(entry)),[]);
 assert.deepEqual(failedResponses.filter(response=>!(response.url===faviconURL&&response.status===404&&faviconProbe.status===404&&response.resourceType!=='script'&&response.resourceType!=='stylesheet')),[]);
await writeFile(out+'/browser.json',JSON.stringify({result:'PASS',hosting,base_url:base,chromiumSandbox:true,sandboxReceipt,uid:process.getuid(),tests,errors,consoleErrors,consoleMessages,failedResponses,faviconProbe,consoleClassification},null,2));console.log(JSON.stringify({result:'PASS',hosting,base_url:base,tests}));
}catch(e){console.error(JSON.stringify({hosting,base_url:base,tests,errors,consoleErrors,consoleMessages,failedResponses,faviconProbe,consoleClassification,sandboxReceipt,status:page?await page.locator('#status').textContent().catch(()=>''):'product page not opened',verdict:page?await page.locator('#verdict').textContent().catch(()=> ''):''}));throw e;}finally{try{if(browser)await browser.close();}finally{if(server?.listening)await new Promise(ok=>server.close(ok));}}
