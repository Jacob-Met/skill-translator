import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH);
const out=resolve(process.env.RECEIPT_DIR||'/tmp/photo-corners-receipt');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,receipt={result:'FAIL',checks:[],errors:[]};
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY});
 const security=await browser.newPage(),cdp=await security.context().newCDPSession(security);
 receipt.sandbox=await requireChromiumSandbox({send:(m,p)=>cdp.send(m,p)});await cdp.detach();await security.close();
 const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,recordVideo:{dir:out+'/video',size:{width:1440,height:1050}}});
 const page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));
 await page.goto(origin+'/capture');
 const controls=await page.evaluate(()=>{
  function png(kind){
   const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1000;const c=canvas.getContext('2d');
   c.fillStyle=kind==='dark'?'#e1dfd7':'#393d39';c.fillRect(0,0,1400,1000);
   const polygon=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
   if(kind==='two'){polygon([[90,140],[610,140],[610,850],[90,850]],'#e5dcc3');polygon([[800,240],[1300,240],[1300,780],[800,780]],'#deddd4');}
   if(kind==='single'||kind==='dark'){polygon([[180,140],[1220,230],[1160,830],[130,770]],kind==='dark'?'#393d39':'#e5dcc3');c.fillStyle=kind==='dark'?'#ddd':'#333';c.fillRect(650,470,22,22);}
   if(kind==='triangle')polygon([[200,150],[1250,250],[700,850]],'#eee');
   return canvas.toDataURL('image/png').split(',')[1];
  }
  return Object.fromEntries(['single','two','dark','triangle','uniform'].map(k=>[k,png(k)]));
 });
 for(const [name,data] of Object.entries(controls))await writeFile(out+'/'+name+'.png',Buffer.from(data,'base64'));
 const choose=async(name,p=page)=>{await p.locator('#photoFile').setInputFiles(out+'/'+name+'.png');await p.locator('#applyCalibration:enabled').waitFor();};
 const scan=async(p=page)=>{await p.locator('#findPhotoCorners').click();await p.locator('#findPhotoCorners:enabled').waitFor();};
 const fields=async(p=page)=>p.locator('#cornerRows input').evaluateAll(nodes=>nodes.map(n=>n.value));
 await choose('single');await page.locator('#captureWidth').fill('320');await page.locator('#captureHeight').fill('210');await scan();
 assert.equal(await page.locator('#photoCornerChoices button').count(),1);assert.deepEqual(await fields(),Array(8).fill(''));assert.equal(await page.locator('#usePhotoCorners').isDisabled(),true);
 await page.locator('[data-outline="outline-1"]').click();await page.locator('#photoCornersStatus').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/desktop-preview.png',fullPage:false});
 await page.locator('#usePhotoCorners').click();const draft=(await fields()).map(Number);assert.equal(await page.locator('#captureWidth').inputValue(),'320');assert.equal(await page.locator('#captureHeight').inputValue(),'210');
 const expected=[180,140,1220,230,1160,830,130,770];for(let i=0;i<8;i++)assert.ok(Math.abs(draft[i]-expected[i])<5,'Original coordinate '+i+': '+draft[i]);
 assert.equal(await page.locator('#addCaptureMark').isDisabled(),true);
 await page.locator('#cornerX0').fill(String(draft[0]+1));await page.locator('#applyCalibration').click();
 await page.locator('#markX').fill('660');await page.locator('#markY').fill('480');await page.locator('#markLabel').fill('Bookbinding alignment');await page.locator('#addCaptureMark').click();
 assert.match(await page.locator('#markCount').textContent(),/1 source mark/);
 const jsonDownload=page.waitForEvent('download');await page.locator('#downloadCapture').click();const json=await jsonDownload;await json.saveAs(out+'/accepted-source.json');const accepted=JSON.parse(await readFile(out+'/accepted-source.json','utf8'));
 assert.equal(accepted.source.widthMm,320);assert.equal(accepted.source.heightMm,210);assert.equal(accepted.source.corners[0].x,draft[0]+1);assert.equal(accepted.source.calibrationDraftEvidence.format,'skill-translator.photo-corners/v1');assert.ok(['global','local-contrast'].includes(accepted.source.calibrationDraftEvidence.analysis.settings.method));
 const download=page.waitForEvent('download');await page.locator('#downloadSourcePackage').click();await(await download).saveAs(out+'/source.stsource');
 const popup=context.waitForEvent('page');await page.locator('#practiceCapture').click();const practice=await popup;await practice.waitForURL('**/practice');await practice.waitForLoadState();assert.match(await practice.locator('body').innerText(),/Bookbinding alignment/);await practice.screenshot({path:out+'/practice.png'});await practice.close();
 receipt.checks.push('Opaque 1400×1000 authored original → 1024 preview → original-pixel proposal → explicit choice → corrected 320×210 mm calibration → mark → JSON, editable package and practice.');
 const reopened=await context.newPage();await reopened.goto(origin+'/capture');await reopened.locator('#capturePackageForm').evaluate(n=>n.closest('details').open=true);await reopened.locator('#savedSourcePackage').setInputFiles(out+'/source.stsource');await reopened.locator('#capturePackageForm button').click();await reopened.locator('#markCount').filter({hasText:'1 source mark'}).waitFor();assert.equal(Number(await reopened.locator('#cornerX0').inputValue()),draft[0]+1);await reopened.close();receipt.checks.push('Downloaded source package reopened with corrected corners, original image and retained mark.');
 await choose('two');await scan();assert.equal(await page.locator('#photoCornerChoices button').count(),2);await page.locator('[data-outline="outline-2"]').click();await page.locator('#rotatePhotoCorners').click();await page.locator('#usePhotoCorners').click();const rotated=(await fields()).map(Number);assert.ok(rotated[0]>1250&&rotated[1]<300);receipt.checks.push('Two workpieces remain alternatives, choice 2 and rotated physical labels reach editable fields.');
 await choose('dark');await scan();assert.equal(await page.locator('#photoCornerChoices button').count(),1);receipt.checks.push('Dark workpiece on bright background also yields a selectable outline.');
 await choose('triangle');await scan();assert.equal(await page.locator('#photoCornerChoices button').count(),0);assert.match(await page.locator('#photoCornersStatus').textContent(),/No complete/);
 await choose('uniform');await scan();assert.equal(await page.locator('#photoCornerChoices button').count(),0);receipt.checks.push('Triangle and uniform originals preserve explicit no-proposal outcome.');
 await choose('single');await scan();await page.locator('[data-outline="outline-1"]').click();await page.locator('#closePhotoCornerInspector').click();await page.locator('#cornerX0').fill('25');assert.equal(await page.locator('#photoCornerChoices button').count(),0);assert.equal(await page.locator('#usePhotoCorners').isDisabled(),true);assert.equal(await page.locator('#cornerX0').inputValue(),'25');receipt.checks.push('Manual corner edit retires the prior proposal without overwriting the edit.');
 await choose('two');await scan();await page.setViewportSize({width:390,height:844});await page.locator('[data-outline="outline-1"]').click();await page.locator('#photoCornersStatus').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/phone-preview.png',fullPage:false});receipt.checks.push('390-pixel viewport has no horizontal overflow and outline controls remain usable.');
 assert.deepEqual(receipt.errors,[]);receipt.result='PASS';receipt.originalCoordinates=draft;receipt.source={width:1400,height:1000,evidence:'authored controls, not real-photo accuracy'};
 await context.close();
} catch(error){receipt.failure=error.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));}
