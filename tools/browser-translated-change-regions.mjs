// Actual encoded sources; authored image changes do not establish physical actions.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.RECEIPT_DIR||'/tmp/skill-translated-region-receiving');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt={result:'FAIL',tests:[],errors:[],fixture:'Two independent authored320×240lossless sources, sampled160×120. Combined interval pan(+12,-8sampledpixels)+brightness18+20×16localpatch; separate flat5×5appearance interval tests all81equallybest radius4shifts.',limits:['Authored image change, not physical correspondence or skill accuracy']};
const waitText=async(page,id,text)=>page.locator('#'+id).filter({hasText:text}).waitFor({state:'visible',timeout:90000});
async function openSource(page,name){
 await page.goto(origin+'/sequence');await page.locator('#clip-file').setInputFiles(`${out}/${name}.webm`);await waitText(page,'status','Original clip ready');
 await page.locator('#visual-scan summary').click();await page.locator('#scan-from').fill('.1');await page.locator('#scan-until').fill('1.1');await page.locator('#scan-count').fill('2');
 await page.locator('#scan-start').click();await waitText(page,'scan-status','Scan ready');
}
const pane=(page,radius)=>page.locator(`.scan-interval[data-index="0"] .scan-translation[data-radius="${radius}"] details[data-shift-regions]`);
async function counts(details){return details.evaluate(d=>({everyReference:Number(d.dataset.everyReference),someReference:Number(d.dataset.someReference),everyLater:Number(d.dataset.everyLater),someLater:Number(d.dataset.someLater)}));}
async function boxes(details,frame,certainty){return details.locator(`[data-shift-frame="${frame}"][data-shift-certainty="${certainty}"][data-shift-bbox]`).evaluateAll(rows=>rows.map(row=>row.dataset.shiftBbox.split(',').map(Number)));}
async function captureFigures(details,label){
 for(const frame of ['earlier','later']){
  const canvas=details.locator(`canvas[data-shift-frame="${frame}"]`);
  const figure=canvas.locator('..');
  await figure.scrollIntoViewIfNeeded();
  await figure.screenshot({path:`${out}/${label}-${frame}-figure.png`});
  await canvas.scrollIntoViewIfNeeded();
  await canvas.screenshot({path:`${out}/${label}-${frame}-canvas.png`});
 }
}
let browser;
try{
 let state=378918;const texture=new Uint8Array(160*120*3);
 for(let i=0;i<texture.length;i+=3){state=(Math.imul(state,1664525)+1013904223)>>>0;const value=35+state%160;texture.fill(value,i,i+3);}
 for(const variant of ['combined','flat']){
  for(let frame=0;frame<2;frame++){
   const small=Buffer.alloc(160*120*3);
   for(let y=0;y<120;y++)for(let x=0;x<160;x++){
    const target=(y*160+x)*3;
    if(variant==='flat'){small.fill(60,target,target+3);if(frame===1&&x>=80&&x<85&&y>=60&&y<65)small.fill(180,target,target+3);continue;}
    const sx=x-(frame?12:0),sy=y+(frame?8:0);
    for(let c=0;c<3;c++)small[target+c]=(sx<0||sx>=160||sy<0||sy>=120?55:texture[(sy*160+sx)*3+c])+(frame?18:0);
    if(frame===1&&x>=80&&x<100&&y>=42&&y<58)small.fill(245,target,target+3);
   }
   const rgb=Buffer.alloc(320*240*3);for(let y=0;y<240;y++)for(let x=0;x<320;x++){const src=(Math.floor(y/2)*160+Math.floor(x/2))*3,dst=(y*320+x)*3;for(let c=0;c<3;c++)rgb[dst+c]=small[src+c];}
   await writeFile(`${out}/${variant}-${frame}.ppm`,Buffer.concat([Buffer.from('P6\n320 240\n255\n'),rgb]));
  }
  const encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','1','-i',`${out}/${variant}-%d.ppm`,'-vf','fps=8','-c:v','libvpx-vp9','-lossless','1',`${out}/${variant}.webm`],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);
 }
 receipt.sourceSha256=hash(await readFile(out+'/combined.webm'));receipt.flatSha256=hash(await readFile(out+'/flat.webm'));
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--allow-chrome-scheme-url'],executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome'});
 receipt.browser=browser.version();const admission=await browser.newPage();await admission.goto('chrome://sandbox/');receipt.sandbox=await admission.locator('body').innerText();assert.match(receipt.sandbox,/Layer 1 Sandbox\s+(Namespace|SUID)/);assert.match(receipt.sandbox,/Seccomp-BPF sandbox\s+Yes/);await admission.close();
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.on('pageerror',e=>receipt.errors.push(String(e)));
 await openSource(page,'combined');
 receipt.unalignedText=await page.locator('.scan-interval[data-index="0"] .scan-measures').first().innerText();
 const fraction=Number(receipt.unalignedText.match(/([\d.]+)% of sampled pixels/)[1]);assert.ok(fraction>70,receipt.unalignedText);
 await page.locator('#scan-order').selectOption('wideTranslationAdjustedChange');await waitText(page,'scan-translation-summary','Image-shift comparison ready');
 const wide=pane(page,16);await wide.waitFor();assert.equal(await wide.locator('canvas').count(),0);
 const narrow=pane(page,4);await narrow.waitFor();assert.equal(await narrow.locator('canvas').count(),0);
 assert.match(await page.locator('.scan-translation[data-radius="16"]').innerText(),/x \+12, y (?:-|−)8/);
 await wide.locator(':scope > summary').focus();await page.keyboard.press('Enter');await wide.locator('canvas[data-shift-frame="earlier"]').waitFor();
 receipt.combinedCounts=await counts(wide);assert.deepEqual(receipt.combinedCounts,{everyReference:320,someReference:320,everyLater:320,someLater:320});
 assert.deepEqual(await boxes(wide,'earlier','every'),[[68,50,88,66]]);assert.deepEqual(await boxes(wide,'later','every'),[[80,42,100,58]]);
 receipt.combinedBoxes={earlier:await boxes(wide,'earlier','every'),later:await boxes(wide,'later','every')};
 assert.deepEqual(await wide.locator('canvas').evaluateAll(cs=>cs.map(c=>[c.width,c.height])),[[160,120],[160,120]]);
 assert.equal(await narrow.locator('canvas').count(),0);
 await page.locator('#visual-scan').screenshot({path:out+'/combined-regions-desktop.png'});
 await captureFigures(wide,'combined-desktop');
 receipt.tests.push('Same actual interval combines largepan, brightness and patch: unaligned change>70%, wide fit unique(+12,-8), exact320pixelpatch boxes mapped into each originalsample; canvases lazy and narrow evidence retained');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#visual-scan').screenshot({path:out+'/combined-regions-narrow.png'});
 await captureFigures(wide,'combined-narrow');
 for(const [index,label]of [[0,'Before combined image change'],[1,'After combined image change']]){
  await page.locator('.scan-interval[data-index="0"] button[data-sample]').nth(index).click();await page.locator('#capture-moment:enabled').waitFor();await page.locator('#moment-label').fill(label);await page.locator('#capture-moment').click();await waitText(page,'status','Retained '+label);
 }
 assert.deepEqual(await page.locator('.moment-card img').evaluateAll(xs=>xs.map(x=>[x.naturalWidth,x.naturalHeight])),[[320,240],[320,240]]);
 await page.locator('#step-title').fill('Compare aligned patch evidence');await page.locator('#step-intent').fill('Inspect original retained pixels without inferring physical correspondence');await page.locator('#save-step').click();await waitText(page,'status','Authored step saved');
 const pending=page.waitForEvent('download');await page.locator('#export-sequence').click();await(await pending).saveAs(out+'/sequence.json');const saved=JSON.parse(await readFile(out+'/sequence.json','utf8'));assert.equal(saved.sequence.clip.sha256,receipt.sourceSha256);
 for(let i=0;i<saved.frames.length;i++)assert.equal(hash(Buffer.from(saved.frames[i].pngBase64,'base64')),saved.sequence.moments[i].image.sha256);
 const fresh=await browser.newPage();await fresh.goto(origin+'/sequence');await fresh.locator('#sequence-file').setInputFiles(out+'/sequence.json');await waitText(fresh,'status','Reopened 2 verified');assert.equal(await fresh.locator('#step-detail h3').textContent(),'Compare aligned patch evidence');await fresh.close();
 receipt.tests.push('Original fullresolution capture, download and fresh verified reopen preserve source and PNGhashes;390pxlayout and keyboard expansion inspected');
 await page.locator('#clear-sequence').click();await openSource(page,'flat');await page.locator('#scan-order').selectOption('translationAdjustedChange');await waitText(page,'scan-translation-summary','Image-shift comparison ready');
 const ambiguous=pane(page,4);await ambiguous.locator(':scope > summary').click();await ambiguous.locator('canvas').first().waitFor();receipt.ambiguousCounts=await counts(ambiguous);
 assert.deepEqual(receipt.ambiguousCounts,{everyReference:0,someReference:169,everyLater:25,someLater:25});assert.deepEqual(await boxes(ambiguous,'earlier','every'),[]);assert.deepEqual(await boxes(ambiguous,'earlier','some'),[[76,56,89,69]]);
 assert.match(await page.locator('.scan-translation[data-radius="4"]').innerText(),/81 equally best image shifts/);await page.locator('#visual-scan').screenshot({path:out+'/ambiguous-regions.png'});
 await captureFigures(ambiguous,'ambiguous-narrow');
 receipt.tests.push('Independent flat5×5appearance retains all81shift alternatives: referenceevery0/some169, laterevery25/some25; prior unique-fit regions retired');
 await page.locator('#clip-file').setInputFiles(out+'/combined.webm');
 await waitText(page,'status','This clip does not match the original demonstration. Choose the original file or start a new sequence.');
 assert.deepEqual(await counts(pane(page,4)),receipt.ambiguousCounts);
 assert.equal(await pane(page,4).evaluate(d=>d.open),true);
 receipt.tests.push('Wrong-source replacement is refused and the accepted original region result remains intact');
 await page.locator('#clear-sequence').click();await page.locator('#clip-file').setInputFiles(out+'/combined.webm');await waitText(page,'status','Original clip ready');
 assert.equal(await page.locator('details[data-shift-regions]').count(),0);
 receipt.tests.push('Explicit clear followed by a new source retires all previous region views');
 await page.locator('#clear-sequence').click();await openSource(page,'combined');await page.evaluate(()=>{const s=document.querySelector('#scan-order');s.value='wideTranslationAdjustedChange';s.dispatchEvent(new Event('change'));document.querySelector('#clear-sequence').click();});await page.waitForTimeout(350);
 assert.equal(await page.locator('#scan-results').isVisible(),false);assert.equal(await page.locator('details[data-shift-regions]').count(),0);receipt.tests.push('Clear during real pending comparison retires all source-bound region results');
 assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await writeFile(out+'/browser-receipt.json',JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(receipt,null,2));}
