// Actual receiver: authored raw practice -> condition-set UI -> download/reopen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createPractice,placePractice,retryPractice} from '../src/practice.mjs';
import {createConditionSet,importConditionSet} from '../src/condition-set.mjs';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const output=resolve(process.env.QA_OUTPUT||'/tmp/condition-changes-receiving');await mkdir(output,{recursive:true});
const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[[20,50],[50,50],[50,80]].map(([x,y],i)=>({id:'m'+i,label:'M'+i,kind:'fraction',toleranceMm:2,sourcePx:{x,y}}))};
const conditions=[{id:'length',kind:'pair',rule:{label:'Arm length',basis:'Authored control',from:'m0',to:'m1',kind:'distance',toleranceMm:1}},{id:'guide',kind:'guide',rule:{label:'Third offset',basis:'Authored control',from:'m0',to:'m1',point:'m2',toleranceMm:1}},{id:'angle',kind:'corner',rule:{from:'m0',vertex:'m1',to:'m2',label:'Corner',basis:'Authored control',toleranceDegrees:1}}];
let session=createPractice(source,100,100);
for(const [index,points]of [[0,[[29,50],[50,50],[50,80]]],[1,[[20,50],[50,50],[50,71]]],[2,[[20,50],[50,50]]]]){if(index)session=retryPractice(source,100,100,session);for(const [i,[xMm,yMm]]of points.entries())session=placePractice(source,100,100,session,'m'+i,{xMm,yMm});}
const raw=createConditionSet(source,session,conditions,2),input=resolve(output,'input.json');await writeFile(input,JSON.stringify(raw));
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY,args:[]});
const page=await browser.newPage(),errors=[],responses=[],sourceHashes={};page.on('pageerror',e=>errors.push(e.message));
page.on('response',response=>{if(response.url().startsWith(baseUrl)&&['document','script','stylesheet'].includes(response.request().resourceType()))responses.push((async()=>{assert(response.status()===200,'Successful source response: '+response.url());const bytes=await response.buffer();sourceHashes[new URL(response.url()).pathname]=createHash('sha256').update(bytes).digest('hex');})());});
 const processArgs=browser.process().spawnargs;assert(!processArgs.some(arg=>/^--(no-sandbox|disable-setuid-sandbox)/.test(arg)),'Browser sandbox must remain enabled');
 await page.setViewport({width:1280,height:900});
 await page.goto(baseUrl+'/condition-set');
 await (await page.$('#reopen')).uploadFile(input);await page.waitForFunction(()=>!document.querySelector('#results').hidden);
 await page.select('#comparison-round','1');await page.click('#compare-rounds');
 let text=await page.$eval('#comparison-results',e=>e.textContent);assert(text.includes('Arm length · Entered tolerance'));assert(text.includes('Third offset · Left tolerance'));assert.equal((text.match(/2\/3 declared conditions within/g)||[]).length,2);
 await page.screenshot({path:resolve(output,'desktop.png'),fullPage:true});
 await page.select('#comparison-round','3');assert.equal(await page.$eval('#comparison-results',e=>e.textContent),'');await page.click('#compare-rounds');text=await page.$eval('#comparison-results',e=>e.textContent);assert(text.includes('Third offset · Became evaluable'));assert(text.includes('Round 3: incomplete'));
 const client=await page.createCDPSession();await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});await page.click('#save');
 let file;for(let i=0;i<100;i++){file=(await readdir(output)).find(f=>f==='skill-condition-set.json');if(file)break;await new Promise(r=>setTimeout(r,50));}assert(file,'Real browser download completed');
 assert.deepEqual(importConditionSet(JSON.parse(await readFile(resolve(output,file),'utf8'))),raw);
 await page.setViewport({width:390,height:844});await page.reload();await(await page.$('#reopen')).uploadFile(resolve(output,file));await page.waitForFunction(()=>!document.querySelector('#results').hidden);await page.select('#comparison-round','1');await page.focus('#compare-rounds');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#comparison-results').textContent.includes('Entered tolerance'));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');await page.screenshot({path:resolve(output,'narrow.png'),fullPage:true});
 await page.select('#round','3');await page.$eval('#round',e=>e.dispatchEvent(new Event('input',{bubbles:true})));assert(await page.$eval('#results',e=>e.hidden));await page.click('#inspect');assert.equal(await page.$eval('#comparison-results',e=>e.textContent),'');await page.select('#comparison-round','2');await page.click('#compare-rounds');assert((await page.$eval('#comparison-results',e=>e.textContent)).includes('Became unavailable'));
 await page.type('#basis','Unadded condition');assert(await page.$eval('#results',e=>e.hidden));await page.click('#inspect');assert((await page.$eval('#error',e=>e.textContent)).includes('unadded condition'));
 await Promise.all(responses);assert.deepEqual(errors,[]);await writeFile(resolve(output,'browser.json'),JSON.stringify({passed:6,checks:['equal-total tradeoffs','availability transitions','real download parity','390px keyboard reopening','selected-round invalidation','unadded-draft refusal'],browserVersion:await browser.version(),sourceHashes,inputSha256:createHash('sha256').update(await readFile(input)).digest('hex'),downloadSha256:createHash('sha256').update(await readFile(resolve(output,file))).digest('hex'),errors},null,2));
 console.log('Six actual condition-change receiving groups passed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
