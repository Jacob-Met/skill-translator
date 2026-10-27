/**
 * Actual Chrome receiving for the workbench directory's rendered filters.
 * PLAYWRIGHT_MODULE points to an existing Playwright installation.
 * CHROME_BINARY, QA_OUTPUT and SOURCE_ROOT are optional; no browser is downloaded.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(process.env.SOURCE_ROOT||fileURLToPath(new URL('..',import.meta.url)));
const output=process.env.QA_OUTPUT?resolve(process.env.QA_OUTPUT):await mkdtemp(join(tmpdir(),'workbenches-browser-'));
await mkdir(output,{recursive:true});
const digest=value=>createHash('sha256').update(value).digest('hex');
const report={course:'workbenches-rendered-filtering',startedAt:new Date().toISOString(),sourceRoot:root,output,groups:[],blockedRequests:[],sourceHashes:{}};
const launch={executablePath:process.env.CHROME_BINARY||'/opt/google/chrome/chrome',chromiumSandbox:true,headless:true};
report.launch=launch;
let server,browser;
const errorText=error=>error?.stack||String(error);
const zeroMessages=new Set([
  'No pinned workbenches yet. Use Pin beside a workbench.',
  'No pinned workbenches match this search.',
  'No workbenches match this search.'
]);

async function eventually(check) {
  const deadline=Date.now()+3000;
  let lastError;
  do {
    try { await check(); return; } catch(error) { lastError=error; }
    await new Promise(resolve=>setTimeout(resolve,50));
  } while(Date.now()<deadline);
  throw lastError;
}
function entry(page,route) {
  return page.locator('[data-workbench]').filter({has:page.locator('[data-workbench-link][href="'+route+'"]')});
}
async function rendered(page) {
  return page.locator('[data-workbench]').evaluateAll(items=>items.filter(item=>
    item.getClientRects().length>0&&!['hidden','collapse'].includes(getComputedStyle(item).visibility)
  ).map(item=>item.querySelector('[data-workbench-link]').getAttribute('href')));
}
async function count(page,expected) {
  await eventually(async()=>{
    const visible=await rendered(page);
    assert.equal(visible.length,expected,JSON.stringify(visible));
    const text=(await page.locator('#workbenchCount').innerText()).trim();
    if(expected===0) {
      assert(zeroMessages.has(text),'Unexpected empty status: '+text);
      assert.equal(await page.locator('[data-workbench-section]').evaluateAll(items=>
        items.filter(item=>item.getClientRects().length).length),0);
    } else assert.equal(Number(text.match(/^\d+\b/)?.[0]),expected,text);
  });
}
async function flex(page,route) {
  assert.equal(await entry(page,route).evaluate(item=>getComputedStyle(item).display),'flex');
}
async function diagnostics(page) {
  return {url:page.url(),viewport:page.viewportSize(),
    filter:await page.locator('#workbenchFilter').inputValue(),
    count:await page.locator('#workbenchCount').innerText(),
    favoriteCount:await page.locator('#workbenchFavoriteCount').innerText(),
    favoriteOnly:await page.locator('#workbenchFavoriteOnly').isChecked(),
    rendered:await rendered(page)};
}
async function save() {
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
async function group(name,viewport,run) {
  const result={name,viewport,startedAt:new Date().toISOString(),pageErrors:[]};
  report.groups.push(result);
  let context,page;
  try {
    context=await browser.newContext({viewport,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===report.origin||['data:','blob:'].includes(url.protocol)) await route.continue();
      else { report.blockedRequests.push({group:name,url:url.href}); await route.abort('blockedbyclient'); }
    });
    page=await context.newPage();
    page.on('pageerror',error=>result.pageErrors.push(errorText(error)));
    page.setDefaultTimeout(5000);
    await page.goto(report.origin+'/workbenches',{waitUntil:'networkidle'});
    await page.locator('.workbench-pin').first().waitFor();
    result.total=await page.locator('[data-workbench]').count();
    assert(result.total>1,'Expected a populated directory');
    await run(page,result.total);
    assert.deepEqual(result.pageErrors,[]);
    result.status='passed';
  } catch(error) { result.status='failed'; result.error=errorText(error); }
  finally {
    if(page) {
      try { result.observed=await diagnostics(page); } catch(error) { result.diagnosticsError=errorText(error); }
      try { result.screenshot=name+'.png'; await page.screenshot({path:join(output,result.screenshot)}); }
      catch(error) { result.screenshotError=errorText(error); }
    }
    await context?.close().catch(error=>{result.closeError=errorText(error);});
    result.finishedAt=new Date().toISOString();
    await save();
  }
}

try {
  const modulePath=process.env.PLAYWRIGHT_MODULE;
  assert(modulePath,'Set PLAYWRIGHT_MODULE to an existing Playwright module');
  const {chromium}=await import(isAbsolute(modulePath)?pathToFileURL(modulePath).href:modulePath);
  const {createAppServer}=await import(pathToFileURL(join(root,'server.mjs')).href);
  const {requireChromiumSandbox}=await import(pathToFileURL(join(root,'tools/support/chromium-sandbox.mjs')).href);
  for(const file of ['server.mjs','web/workbenches.html','web/workbenches.css','web/workbenches.mjs','web/styles.css'])
    report.sourceHashes[file]=digest(await readFile(join(root,file)));
  server=createAppServer();
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  report.origin='http://127.0.0.1:'+server.address().port;
  report.servedHashes={};
  for(const file of ['web/workbenches.css','web/workbenches.mjs','web/styles.css']) {
    const response=await fetch(report.origin+'/'+file);
    assert.equal(response.status,200,file+' must be served');
    report.servedHashes[file]=digest(Buffer.from(await response.arrayBuffer()));
    assert.equal(report.servedHashes[file],report.sourceHashes[file],file+' served/source mismatch');
  }
  browser=await chromium.launch(launch);
  const preflight=await browser.newContext();
  try {
    const page=await preflight.newPage(),cdp=await preflight.newCDPSession(page);
    report.sandbox=await requireChromiumSandbox({send:(...args)=>cdp.send(...args)});
  } catch(error) { report.sandbox=error.receipt; throw error; }
  finally { await preflight.close(); }
  const desktop={width:1280,height:900},mobile={width:390,height:844};

  await group('01-rendered-filter',desktop,async(page,total)=>{
    await count(page,total); await flex(page,'/capture');
    await page.locator('#workbenchFilter').fill('calibration checks');
    await eventually(async()=>assert.deepEqual(
      await entry(page,'/capture').evaluate(item=>({rectangles:item.getClientRects().length,display:getComputedStyle(item).display})),
      {rectangles:0,display:'none'},'/capture must leave actual layout when excluded'));
    await count(page,1);
    assert.deepEqual(await rendered(page),['/calibration-checks']);
    await flex(page,'/calibration-checks');
    assert.equal(new URL(page.url()).searchParams.get('q'),'calibration checks');
  });

  await group('02-keyboard-controls',desktop,async page=>{
    const filter=page.locator('#workbenchFilter');
    await filter.fill('calibration checks');
    for(const selector of ['[data-workbench-link]','.workbench-pin']) {
      await filter.focus();
      assert.equal(await entry(page,'/capture').locator(selector).evaluate(element=>{
        element.focus(); return document.activeElement===element;
      }),false,'Excluded '+selector+' received focus');
    }
    await filter.focus();
    const reached=new Set();
    for(let step=0;step<100&&reached.size<2;step++) {
      await page.keyboard.press('Tab');
      const active=await page.evaluate(()=>{
        const element=document.activeElement,item=element?.closest('[data-workbench]');
        return item?{href:item.querySelector('[data-workbench-link]').getAttribute('href'),
          kind:element.matches('.workbench-pin')?'pin':element.matches('[data-workbench-link]')?'link':'other'}:null;
      });
      if(active) {
        assert.equal(active.href,'/calibration-checks','Tab reached excluded '+active.href);
        if(active.kind!=='other') reached.add(active.kind);
      }
    }
    assert.deepEqual([...reached].sort(),['link','pin']);
  });

  await group('03-search-and-pins',desktop,async(page,total)=>{
    const filter=page.locator('#workbenchFilter'),only=page.locator('#workbenchFavoriteOnly');
    const pin=entry(page,'/calibration-checks').locator('.workbench-pin');
    await filter.fill('calibration checks'); await pin.click();
    assert.equal(await pin.getAttribute('aria-pressed'),'true');
    assert.equal(await pin.getAttribute('aria-label'),'Unpin Calibration checks');
    assert.match(await page.locator('#workbenchFavoriteCount').innerText(),/\b1\b/);
    await only.check(); await count(page,1);
    await filter.fill('capture'); await count(page,0);
    await filter.fill(''); await count(page,1);
    assert.deepEqual(await rendered(page),['/calibration-checks']);
    await pin.click(); await count(page,0);
    assert.equal(await pin.getAttribute('aria-pressed'),'false');
    assert.equal(await only.evaluate(element=>document.activeElement===element),true,'Unpin must preserve usable focus');
    await only.uncheck(); await count(page,total);
  });

  await group('04-empty-and-clear',desktop,async(page,total)=>{
    await page.locator('#workbenchFilter').fill('no-such-workbench-739281');
    await count(page,0); await page.locator('#workbenchClear').click();
    assert.equal(await page.locator('#workbenchFilter').inputValue(),'');
    await count(page,total);
    assert(!new URL(page.url()).searchParams.get('q'));
  });

  await group('05-shared-query-back',desktop,async page=>{
    await page.goto(report.origin+'/workbenches?q=calibration%20checks',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#workbenchFilter').inputValue(),'calibration checks');
    await count(page,1);
    await page.goto(report.origin+'/workbenches?q=capture',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#workbenchFilter').inputValue(),'capture');
    await page.goBack({waitUntil:'networkidle'});
    assert.equal(await page.locator('#workbenchFilter').inputValue(),'calibration checks');
    await count(page,1); assert.deepEqual(await rendered(page),['/calibration-checks']);
  });

  await group('06-mobile-clear-and-layout',mobile,async(page,total)=>{
    const overflow=async()=>{
      const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert(widths.document<=widths.viewport+1&&widths.body<=widths.viewport+1,JSON.stringify(widths));
    };
    await count(page,total); await flex(page,'/capture'); await overflow();
    await page.locator('#workbenchFilter').fill('calibration checks');
    await count(page,1); await flex(page,'/calibration-checks'); await overflow();
    await page.locator('#workbenchClear').click();
    assert.equal(await page.locator('#workbenchFilter').inputValue(),'');
    await count(page,total); await flex(page,'/capture'); await overflow();
  });
} catch(error) { report.fatalError=errorText(error); }
finally {
  await browser?.close().catch(error=>{report.browserCloseError=errorText(error);});
  if(server?.listening) await new Promise(resolve=>{
    server.close(error=>{if(error)report.serverCloseError=errorText(error);resolve();});
    server.closeIdleConnections?.();
  });
  report.finishedAt=new Date().toISOString();
  report.passed=!report.fatalError&&!report.browserCloseError&&!report.serverCloseError&&
    !report.blockedRequests.length&&report.groups.length===6&&report.groups.every(group=>group.status==='passed');
  await save();
  console.log(JSON.stringify({passed:report.passed,report:join(output,'report.json'),
    groups:report.groups.map(({name,status})=>({name,status})),fatalError:report.fatalError},null,2));
  process.exitCode=report.passed?0:1;
}
