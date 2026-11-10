import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH);
const files=process.argv.slice(2);if(!files.length)throw Error('Pass original PNG/JPEG paths.');
const out=resolve(process.env.RECEIPT_DIR||'/tmp/photo-corners-inspection');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const reports=[];
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 for(const file of files){
  await page.goto('http://127.0.0.1:'+server.address().port+'/capture');
  await page.locator('#photoFile').setInputFiles(file);await page.locator('#applyCalibration:enabled').waitFor();
  await page.locator('#findPhotoCorners').click();await page.locator('#findPhotoCorners:enabled').waitFor();
  const count=await page.locator('#photoCornerChoices button').count(),status=await page.locator('#photoCornersStatus').innerText();
  if(count)await page.locator('#photoCornerChoices button').first().click();
  await page.locator('#photoCornersStatus').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+basename(file)+'.png',fullPage:true});
  reports.push({file:basename(file),outlines:count,status});
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(out+'/inspection.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));}
