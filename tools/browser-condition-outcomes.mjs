// Actual receiver: authored raw practice -> condition-set UI -> download/reopen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createPractice,placePractice,retryPractice} from '../src/practice.mjs';
import {importConditionOutcomes} from '../src/condition-outcomes.mjs';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const output=resolve(process.env.QA_OUTPUT||'/tmp/condition-outcomes-receiving');await mkdir(output,{recursive:true});
const {raw}=await import('../test/condition-outcomes-fixture.mjs');const input=resolve(output,'input.json');await writeFile(input,JSON.stringify(raw));
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY,args:[]});
const page=await browser.newPage(),errors=[],responses=[],sourceHashes={};page.on('pageerror',e=>errors.push(e.message));
page.on('response',response=>{if(response.url().startsWith(baseUrl)&&['document','script','stylesheet'].includes(response.request().resourceType()))responses.push((async()=>{assert(response.status()===200,'Successful source response: '+response.url());const bytes=await response.buffer();sourceHashes[new URL(response.url()).pathname]=createHash('sha256').update(bytes).digest('hex');})());});
 const processArgs=browser.process().spawnargs;assert(!processArgs.some(arg=>/^--(no-sandbox|disable-setuid-sandbox)/.test(arg)),'Browser sandbox must remain enabled');
 await page.setViewport({width:1280,height:900});
 await page.goto(baseUrl+'/condition-set');await Promise.all([page.waitForNavigation(),page.click('a[href="/condition-outcomes"]')]);
 await(await page.$('#open')).uploadFile(input);await page.waitForFunction(()=>!document.querySelector('#setup').hidden);
 async function judge(round,outcome){await page.select(`#judgments article:nth-child(${round}) select`,outcome);await page.type(`#judgments article:nth-child(${round}) textarea`,'Authored independent outcome control');}
 await judge(1,'acceptable');await judge(2,'unacceptable');await page.click('#inspect');assert((await page.$eval('#summary',e=>e.textContent)).includes('2 consistent on all judged rounds'));assert.equal(await page.$eval('#hypothesis',e=>e.value),'1');
 await judge(3,'unacceptable');assert(await page.$eval('#results',e=>e.hidden));await page.click('#inspect');assert((await page.$eval('#summary',e=>e.textContent)).includes('0 consistent on all judged rounds'));
 await page.click('#point-score');await page.click('#inspect');assert.equal(await page.$eval('#hypothesis',e=>e.value),'4');assert((await page.$eval('#witnesses',e=>e.textContent)).includes('Original complete-task point score: outside'));
 await page.screenshot({path:resolve(output,'desktop.png'),fullPage:true});
 const client=await page.createCDPSession();await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});await page.click('#save');let file;for(let i=0;i<100;i++){file=(await readdir(output)).find(f=>f==='skill-condition-outcomes.json');if(file)break;await new Promise(r=>setTimeout(r,50));}assert(file);const saved=importConditionOutcomes(JSON.parse(await readFile(resolve(output,file),'utf8')));assert.deepEqual(saved.conditions,raw);assert.equal(saved.judgments[2].outcome,'unacceptable');
 await page.setViewport({width:390,height:844});await page.reload();await(await page.$('#open')).uploadFile(resolve(output,file));await page.waitForFunction(()=>!document.querySelector('#setup').hidden);await page.focus('#inspect');await page.keyboard.press('Enter');assert.equal(await page.$eval('#hypothesis',e=>e.value),'4');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(output,'narrow.png'),fullPage:true});
 const bad=structuredClone(saved);bad.conditions.source.landmarks[0].toleranceMm=3;await writeFile(resolve(output,'bad.json'),JSON.stringify(bad));await(await page.$('#open')).uploadFile(resolve(output,'bad.json'));await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('differ'));assert.equal(await page.$eval('#hypothesis',e=>e.value),'4');
 await page.evaluate(()=>{window.originalRead=File.prototype.text;File.prototype.text=async function(){const value=await window.originalRead.call(this);window.pending=true;await new Promise(r=>window.release=r);return value;};});await(await page.$('#open')).uploadFile(resolve(output,file));await page.waitForFunction(()=>window.pending);await page.type('#judgments article:nth-child(1) textarea',' new draft');await page.evaluate(()=>window.release());await new Promise(r=>setTimeout(r,50));assert((await page.$eval('#judgments article:nth-child(1) textarea',e=>e.value)).endsWith(' new draft'));assert(await page.$eval('#results',e=>e.hidden));await page.evaluate(()=>File.prototype.text=window.originalRead);
 await Promise.all(responses);assert.deepEqual(errors,[]);await writeFile(resolve(output,'browser.json'),JSON.stringify({passed:7,checks:['maintained producer link and raw source receiving','changed outcome refutes every relative conjunction','explicit original point score distinguishes translated outcome','actual download original-source parity','390px keyboard reopening','invalid source preserves accepted study','newer draft fences delayed import'],sourceHashes,browserVersion:await browser.version(),errors},null,2));console.log('Seven actual condition-outcome receiving groups passed.');

}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
