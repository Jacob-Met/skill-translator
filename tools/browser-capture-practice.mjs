// Actual Source Studio -> complete-task receiving. Pixels and measurements are
// authored analytic controls, not a physical demonstration or learning claim.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';

const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/capture-practice');
await mkdir(out,{recursive:true});
const server=process.env.BASE_URL?null:createAppServer();
if(server)await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin=process.env.BASE_URL?new URL(process.env.BASE_URL).origin:'http://127.0.0.1:'+server.address().port;
const key='skill-translator-practice-input/v1';
const report={course:'accepted Source Studio annotations -> separate complete-task practice',
  fixture:'Authored PNG and analytic geometry; no physical skill or learning claim',
  serving:server?'createAppServer on an isolated loopback port':'caller-supplied BASE_URL',tests:[],errors:[],offsite:[]};
let browser;
const watched=new WeakSet();
const record=name=>report.tests.push(name);
const watch=page=>{
  if(watched.has(page))return;watched.add(page);
  page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('request',request=>{
    const url=request.url();
    if(!url.startsWith(origin+'/')&&!url.startsWith('blob:')&&url!=='about:blank')report.offsite.push(url);
  });
};
const value=(page,id,v)=>page.$eval('#'+id,(el,next)=>{
  el.value=String(next);el.dispatchEvent(new Event('input',{bubbles:true}));
},v);
const upload=async(page,id,path)=>(await page.$('#'+id)).uploadFile(path);
const disabled=page=>page.$eval('#practiceCapture',el=>el.disabled);
const outcome=page=>page.$eval('#taskOutcome',el=>el.dataset.state);
async function downloads(page){
  await page.evaluate(()=>{
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=blob=>{if(blob.type==='application/json')window.__receivedJSON=blob;return original(blob);};
  });
}
async function exported(page,button){
  await page.bringToFront();
  await page.evaluate(()=>{window.__receivedJSON=null;});
  await page.click('#'+button);
  return page.evaluate(async()=>{
    if(!window.__receivedJSON)throw Error('The requested control did not produce a JSON download.');
    return JSON.parse(await window.__receivedJSON.text());
  });
}
async function originalPixels(page,expectedUrl){
  const observed=await page.evaluate(async()=>{
    const url=document.querySelector('#captureSvg image')?.getAttribute('href');
    const image=new Image();image.src=url;await image.decode();
    return {url,width:image.naturalWidth,height:image.naturalHeight,path:location.pathname};
  });
  assert.deepEqual(observed,{url:expectedUrl,width:600,height:400,path:'/capture'});
}
async function openPractice(page,keyboard=false){
  await page.bringToFront();
  const existing=new Set(browser.targets());
  // The product deliberately detaches the child's opener. Observe a genuinely
  // new browser target, including its transition from about:blank, instead of
  // relying on Puppeteer's parent-page popup event. Handle rejection at creation
  // so a timed-out receiver can never escape while the input action is pending.
  const receiving=browser.waitForTarget(target=>{
    if(existing.has(target)||target.type()!=='page')return false;
    try{const url=new URL(target.url());return url.origin===origin&&url.pathname==='/practice';}
    catch{return false;}
  },{timeout:10000}).then(target=>({target}),error=>({error}));
  const activate=async()=>{
    if(keyboard){await page.focus('#practiceCapture');await page.keyboard.press('Enter');}
    else await page.click('#practiceCapture');
  };
  const [,target]=await Promise.all([activate(),receiving.then(result=>{
    if(result.error)throw Error('No new separate /practice target was observed: '+result.error.message);
    return result.target;
  })]);
  const child=await target.page();
  assert.ok(child,'The new practice target did not provide a page');watch(child);
  await child.bringToFront();await child.waitForSelector('#practiceMarks button');
  assert.equal(new URL(child.url()).pathname,'/practice');
  await downloads(child);
  return child;
}
async function place(page,id,x,y){
  await page.bringToFront();
  await page.click('#practiceMarks button[data-id="'+id+'"]');
  await value(page,'placementX',x);await value(page,'placementY',y);
  await page.click('#placementForm button[type="submit"]');
}
async function reopenStudio(page,json,photo){
  await page.bringToFront();
  await page.$eval('#reopenCaptureForm',el=>{el.parentElement.open=true;});
  await upload(page,'savedAnnotations',json);await upload(page,'savedPhoto',photo);
  await page.click('#reopenCaptureForm button[type="submit"]');
  await page.waitForFunction(()=>document.querySelector('#markCount').textContent.includes('2 source marks'));
}
async function failureDiagnostics(){
  const targets=browser?.targets().filter(target=>target.type()==='page')||[];
  const pages=await Promise.all(targets.map(async target=>{
    const state={url:target.url()};let timer;
    try{
      state.document=await Promise.race([
        target.page().then(page=>page?.evaluate(key=>{
          let input;try{
            const raw=sessionStorage.getItem(key),parsed=raw?JSON.parse(raw):null;
            input={present:raw!==null,title:parsed?.demo?.title,marks:parsed?.demo?.landmarks?.length,
              widthMm:parsed?.widthMm,heightMm:parsed?.heightMm};
          }catch(error){input={error:error.message};}
          return {url:location.href,visible:document.visibilityState,
            actionDisabled:document.querySelector('#practiceCapture')?.disabled,
            status:document.querySelector('#capturePracticeStatus')?.textContent,
            error:document.querySelector('#studioError')?.textContent,
            setup:document.querySelector('#setupLabel')?.textContent,input};
        },key)),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Diagnostic page read timed out')),3000);})
      ]);
    }catch(error){state.diagnosticError=error.message;}finally{clearTimeout(timer);}
    return state;
  }));
  return {pages};
}

try{
  browser=await puppeteer.launch({headless:true,
    executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome',
    args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
  report.browser=await browser.version();
  if(process.platform==='linux'){
    const admission=await browser.newPage();
    const cdp=await admission.createCDPSession();
    try{report.sandbox=await requireChromiumSandbox({send:(method,args)=>cdp.send(method,args)});}
    catch(error){report.sandbox=error.receipt;throw error;}
    finally{await cdp.detach();await admission.close();}
  }
  const studio=await browser.newPage();watch(studio);
  await studio.setViewport({width:1380,height:960,deviceScaleFactor:1});
  await studio.goto(origin+'/capture',{waitUntil:'networkidle0'});
  assert.ok(await studio.$('#practiceCapture'),'Missing accepted-source practice action #practiceCapture');
  assert.equal(await disabled(studio),true);
  await downloads(studio);

  // Reuse the existing capture courses' browser-created, independently hashed
  // PNG pattern. Axis-aligned corners make expected physical targets analytic.
  const png=await studio.evaluate(()=>{
    const c=document.createElement('canvas');c.width=600;c.height=400;
    const x=c.getContext('2d');x.fillStyle='#405047';x.fillRect(0,0,600,400);
    x.fillStyle='#efe1be';x.fillRect(50,40,500,320);
    x.fillStyle='#243b31';x.font='16px sans-serif';x.fillText('AUTHORED PRACTICE CONTROL',135,90);
    x.fillRect(148,158,5,5);x.fillRect(298,198,5,5);
    return c.toDataURL('image/png');
  });
  const bytes=Buffer.from(png.split(',')[1],'base64');
  const photo=out+'/authored-source.png',sourcePath=out+'/accepted-source.json';
  await writeFile(photo,bytes);await writeFile(out+'/invalid.png','Not an image');
  const digest=createHash('sha256').update(bytes).digest('hex');
  await upload(studio,'photoFile',photo);
  await studio.waitForFunction(()=>document.querySelector('#photoIdentity').textContent.includes('600 × 400'));
  assert.equal(await disabled(studio),true);
  await value(studio,'captureTitle','Authored source-to-practice control');
  await value(studio,'captureWidth',100);await value(studio,'captureHeight',80);
  for(const [i,p] of [[50,40],[550,40],[550,360],[50,360]].entries()){
    await value(studio,'cornerX'+i,p[0]);await value(studio,'cornerY'+i,p[1]);
  }
  await studio.click('#applyCalibration');
  assert.match(await studio.$eval('#calibrationStatus',el=>el.textContent),/Calibration applied/);
  assert.equal(await disabled(studio),true);
  record('fresh, photo-only and zero-mark calibration states cannot enter practice');

  for(const mark of [
    {label:'Fixed left guide',x:150,y:160,kind:'edge_offset_mm',edge:'left',tolerance:1},
    {label:'Proportional center',x:300,y:200,kind:'fraction',edge:'left',tolerance:2}
  ]){
    await value(studio,'markX',mark.x);await value(studio,'markY',mark.y);
    await value(studio,'markLabel',mark.label);await studio.select('#markKind',mark.kind);
    if(mark.kind==='edge_offset_mm')await studio.select('#markEdge',mark.edge);
    await value(studio,'markTolerance',mark.tolerance);await studio.click('#addCaptureMark');
  }
  assert.equal(await disabled(studio),false);
  const accepted=await exported(studio,'downloadCapture');
  assert.equal(accepted.landmarks.length,2);
  assert.deepEqual(accepted.source.image,{sha256:digest,widthPx:600,heightPx:400,
    mimeType:'image/png',name:'authored-source.png',pixelCoordinates:'browser-oriented'});
  assert.equal(accepted.landmarks[0].edge,'left');
  assert.deepEqual(accepted.landmarks.map(m=>m.sourcePx),[{x:150,y:160},{x:300,y:200}]);
  await writeFile(sourcePath,JSON.stringify(accepted,null,2));
  const originalUrl=await studio.$eval('#captureSvg image',el=>el.getAttribute('href'));
  record('real local PNG calibration and two distinct accepted source rules retain image identity');

  await value(studio,'captureWidth',120);assert.equal(await disabled(studio),true);
  await studio.click('#revertCalibration');assert.equal(await disabled(studio),false);
  await value(studio,'cornerX0',9000);await studio.click('#applyCalibration');
  assert.match(await studio.$eval('#studioError',el=>el.textContent),/Calibration refused/);
  assert.equal(await disabled(studio),true);await studio.click('#revertCalibration');
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);
  await studio.click('[aria-label="Edit Fixed left guide"]');
  await value(studio,'markX',175);await value(studio,'markLabel','Unsubmitted edit');
  assert.equal(await disabled(studio),true);await studio.click('#cancelMarkEdit');
  assert.equal(await disabled(studio),false);
  await value(studio,'markX',220);await value(studio,'markY',190);
  assert.equal(await disabled(studio),true);
  assert.equal(await studio.$eval('#cancelMarkEdit',el=>el.hidden),false);
  await studio.click('#cancelMarkEdit');assert.equal(await disabled(studio),false);
  await studio.focus('#markX');await studio.keyboard.type('-');
  assert.equal(await studio.$eval('#markX',el=>el.validity.badInput),true);
  assert.equal(await disabled(studio),true);
  assert.equal(await studio.$eval('#cancelMarkEdit',el=>el.hidden),false);
  await studio.click('#cancelMarkEdit');assert.equal(await disabled(studio),false);
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);
  record('dirty and rejected calibration, unsaved mark edits, coordinate drafts and actual numeric badInput do not enter practice');

  await upload(studio,'photoFile',out+'/invalid.png');
  await studio.waitForFunction(()=>document.querySelector('#studioError').textContent.includes('Photo refused'));
  assert.equal(await disabled(studio),false);
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);
  await originalPixels(studio,originalUrl);
  record('malformed replacement preserves accepted marks, available practice action and original pixels');

  // The old tab is independent and retains an actual placement and its own key.
  const previous=JSON.stringify({demo:{...accepted,title:'Older independent practice'},
    widthMm:150,heightMm:120,mirrored:true,showGoals:true},null,3);
  const old=await browser.newPage();watch(old);
  await old.goto(origin+'/capture',{waitUntil:'networkidle0'});
  await old.evaluate(({key,previous})=>sessionStorage.setItem(key,previous),{key,previous});
  await old.goto(origin+'/practice',{waitUntil:'networkidle0'});await downloads(old);
  await place(old,accepted.landmarks[0].id,24,45);
  const oldSource=await exported(old,'savePracticeSource'),oldRound=await exported(old,'savePractice');
  await studio.evaluate(({key,previous})=>{
    sessionStorage.setItem(key,previous);sessionStorage.setItem('capture-practice-unrelated','retain');
  },{key,previous});

  const practice=await openPractice(studio);
  assert.deepEqual(await exported(practice,'savePracticeSource'),accepted);
  assert.equal(await practice.$eval('#practiceWidth',el=>el.value),'100');
  assert.equal(await practice.$eval('#practiceHeight',el=>el.value),'80');
  assert.equal(await practice.$eval('#practiceView',el=>el.value),'standard');
  assert.equal(await practice.$eval('#practiceGoals',el=>el.checked),false);
  assert.equal(await practice.$$eval('.practice-goal',els=>els.length),0);
  assert.equal(await practice.evaluate(()=>window.opener===null),true);
  assert.equal(await studio.evaluate(key=>sessionStorage.getItem(key),key),previous);
  assert.equal(await studio.evaluate(()=>sessionStorage.getItem('capture-practice-unrelated')),'retain');
  await originalPixels(studio,originalUrl);
  const payload=await practice.evaluate(key=>sessionStorage.getItem(key),key);
  assert.equal(/blob:|data:image/.test(payload),false);
  assert.match(await studio.$eval('#capturePracticeStatus',el=>el.textContent),/photo|image|pixels/i);
  record('separate practice receives exact accepted source with hidden standard view; original studio pixels and prior parent key survive');

  await practice.$eval('#setupForm',el=>{el.closest('details').open=true;});
  await value(practice,'practiceWidth',200);await value(practice,'practiceHeight',160);
  await practice.click('#setupForm button[type="submit"]');
  await practice.click('#reviewTask');assert.equal(await outcome(practice),'incomplete');
  // Source is 100x80; fixed-left (20,30) -> (20,60), fraction (.5,.5) -> (100,80).
  const exact=[{id:accepted.landmarks[0].id,x:20,y:60},{id:accepted.landmarks[1].id,x:100,y:80}];
  await place(practice,exact[0].id,24,63);await practice.click('#reviewTask');
  assert.equal(await outcome(practice),'incomplete');
  await place(practice,exact[1].id,104,83);await practice.click('#reviewTask');
  assert.equal(await outcome(practice),'needs-adjustment');
  assert.match(await practice.$eval('#shiftDiagnostic',el=>el.textContent),/4.0 mm across \/ 3.0 mm down/);
  const failed=await exported(practice,'savePractice');
  assert.deepEqual(failed.attempts,exact.map(p=>({id:p.id,xMm:p.x+4,yMm:p.y+3})));
  await practice.click('#retryTask');
  for(const p of exact)await place(practice,p.id,p.x,p.y);
  await practice.click('#reviewTask');assert.equal(await outcome(practice),'passed');
  const saved=await exported(practice,'savePractice');
  assert.equal(saved.round,2);assert.deepEqual(saved.history[0].attempts,failed.attempts);
  assert.deepEqual(saved.attempts,exact.map(p=>({id:p.id,xMm:p.x,yMm:p.y})));
  assert.equal(saved.reference.source.image.sha256,digest);
  assert.deepEqual(saved.reference.target,{widthMm:200,heightMm:160});
  assert.deepEqual(await exported(practice,'savePracticeSource'),accepted);
  assert.equal('passed' in saved,false);
  const sessionPath=out+'/two-round-practice.json';await writeFile(sessionPath,JSON.stringify(saved,null,2));
  await practice.click('#retryTask');await upload(practice,'openPractice',sessionPath);
  await practice.waitForFunction(()=>document.querySelector('#practiceStatus').textContent.includes('Session reopened'));
  assert.equal(await outcome(practice),'in-progress');await practice.click('#reviewTask');
  assert.equal(await outcome(practice),'passed');assert.deepEqual(await exported(practice,'savePractice'),saved);
  record('changed-size analytic placements fail, retain a complete prior round, then pass and recompute identically after actual export/reopen');
  assert.deepEqual(await exported(old,'savePracticeSource'),oldSource);
  assert.deepEqual(await exported(old,'savePractice'),oldRound);
  assert.equal(await old.evaluate(key=>sessionStorage.getItem(key),key),previous);
  record('already-open independent practice source, placement and handoff key remain unchanged');

  // Real handler refusal, with only browser platform failure injected.
  await studio.bringToFront();
  await studio.evaluate(()=>{window.__realOpen=window.open;window.__openCalls=0;window.open=()=>{window.__openCalls++;return null;};});
  await studio.click('#practiceCapture');
  assert.equal(await studio.evaluate(()=>window.__openCalls),1);
  assert.equal(await studio.evaluate(key=>sessionStorage.getItem(key),key),previous);
  assert.match(await studio.$eval('#studioError',el=>el.textContent),/open|popup|pop-up|blocked/i);
  await studio.evaluate(()=>{window.open=window.__realOpen;});
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);await originalPixels(studio,originalUrl);
  record('blocked popup reports failure and restores exact previous parent handoff without losing source pixels');

  await studio.evaluate(key=>{
    window.__realSetItem=Storage.prototype.setItem;window.__realOpen=window.open;window.__openCalls=0;
    Storage.prototype.setItem=function(name,value){
      if(this===sessionStorage&&name===key)throw new DOMException('Authored quota control','QuotaExceededError');
      return window.__realSetItem.call(this,name,value);
    };
    window.open=function(...args){window.__openCalls++;return window.__realOpen.apply(this,args);};
  },key);
  await studio.bringToFront();
  await studio.click('#practiceCapture');
  assert.equal(await studio.evaluate(()=>window.__openCalls),0);
  assert.equal(await studio.evaluate(key=>sessionStorage.getItem(key),key),previous);
  assert.match(await studio.$eval('#studioError',el=>el.textContent),/quota|storage|preserv|open/i);
  await studio.evaluate(()=>{Storage.prototype.setItem=window.__realSetItem;window.open=window.__realOpen;});
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);await originalPixels(studio,originalUrl);
  record('storage quota refusal opens no receiver and leaves prior handoff and accepted source intact');

  // The source remains accepted if a platform failure prevents restoring the
  // previous parent key AFTER opening. The UI must report this partial cleanup,
  // close only its own newly created window and leave independent practice alone.
  await studio.evaluate(({key,previous})=>{
    window.__realSetItem=Storage.prototype.setItem;window.__realOpen=window.open;
    window.__restoreFailureChild=null;
    Storage.prototype.setItem=function(name,value){
      if(this===sessionStorage&&name===key&&value===previous)
        throw new DOMException('Authored restore failure','QuotaExceededError');
      return window.__realSetItem.call(this,name,value);
    };
    window.open=function(...args){
      window.__restoreFailureChild=window.__realOpen.apply(this,args);
      return window.__restoreFailureChild;
    };
  },{key,previous});
  await studio.bringToFront();
  await studio.click('#practiceCapture');
  await studio.waitForFunction(()=>window.__restoreFailureChild?.closed===true);
  assert.match(await studio.$eval('#studioError',el=>el.textContent),/previous browser practice setup could not be restored/i);
  const unrestored=await studio.evaluate(key=>sessionStorage.getItem(key),key);
  assert.notEqual(unrestored,previous);
  assert.deepEqual(JSON.parse(unrestored).demo,accepted);
  assert.equal(old.isClosed(),false);assert.equal(practice.isClosed(),false);
  assert.deepEqual(await exported(old,'savePractice'),oldRound);
  assert.deepEqual(await exported(practice,'savePractice'),saved);
  await studio.evaluate(({key,previous})=>{
    Storage.prototype.setItem=window.__realSetItem;window.open=window.__realOpen;
    sessionStorage.setItem(key,previous);
  },{key,previous});
  assert.deepEqual(await exported(studio,'downloadCapture'),accepted);await originalPixels(studio,originalUrl);
  record('post-open restoration failure reports the unrestored setup and closes only its own new child while preserving independent rounds');

  // Empty-parent-key restoration and keyboard receiving at the narrow viewport.
  await studio.evaluate(key=>sessionStorage.removeItem(key),key);
  await studio.setViewport({width:390,height:844,deviceScaleFactor:1});
  assert.ok(await studio.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'390px Source Studio overflow');
  const mobile=await openPractice(studio,true);await mobile.setViewport({width:390,height:844,deviceScaleFactor:1});
  assert.deepEqual(await exported(mobile,'savePracticeSource'),accepted);
  assert.equal(await studio.evaluate(key=>sessionStorage.getItem(key),key),null);
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'390px practice overflow');
  await mobile.$eval('#practiceSvg',el=>el.focus());
  assert.equal(await mobile.$eval('#practiceSvg',el=>document.activeElement===el),true);
  await mobile.keyboard.press('ArrowRight');
  assert.equal(await mobile.$eval('#placementX',el=>el.value),'51');
  assert.equal(await mobile.$eval('#placementY',el=>el.value),'40');
  await mobile.click('#reviewTask');assert.equal(await outcome(mobile),'incomplete');
  await studio.screenshot({path:out+'/studio-390.png',fullPage:true});
  await mobile.screenshot({path:out+'/practice-390.png',fullPage:true});
  record('390px keyboard action opens exact source, restores absent parent key and permits an incomplete keyboard placement');

  await studio.bringToFront();
  await studio.click('[aria-label="Remove Fixed left guide"]');
  assert.equal(await disabled(studio),false);
  await studio.click('[aria-label="Remove Proportional center"]');
  assert.equal(await disabled(studio),true);
  await reopenStudio(studio,sourcePath,photo);assert.equal(await disabled(studio),false);
  const restored=await openPractice(studio);
  assert.deepEqual(await exported(restored,'savePracticeSource'),accepted);
  record('removing the last mark disables practice; reopening matching saved source restores a usable exact handoff');

  assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);
  record('no observed product page exceptions or offsite requests');report.result='PASS';
}catch(error){
  report.result='FAIL';report.failure={name:error.name,message:error.message,stack:error.stack};
  try{report.failure.diagnostics=await failureDiagnostics();}
  catch(diagnosticError){report.failure.diagnosticError=diagnosticError.message;}
  throw error;
}finally{
  await writeFile(out+'/browser-receipt.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(browser)await browser.close();if(server)await new Promise(ok=>server.close(ok));
}
