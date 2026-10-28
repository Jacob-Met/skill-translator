// Run against a clean extracted runtime: node receive-runtime.mjs /path/to/runtime
import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
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
const root=resolve(process.argv[2]??'');
assert(process.argv[2] && /^[a-f0-9]{40}$/.test(process.argv[3]??''), 'Supply clean runtime directory and independently expected full commit');
const manifest=JSON.parse(await readFile(join(root,'MANIFEST.json'),'utf8'));
assert.equal(manifest.format,'skill-translator.runtime-package/v1');
assert.equal(manifest.source_commit,process.argv[3],'Expected external source commit');
assert(Array.isArray(manifest.files)&&manifest.files.length>0,'Nonempty manifest required');
const expected=new Set(['MANIFEST.json']);
for(const file of manifest.files){
  assert(typeof file.path==='string' && !file.path.includes('\\') && file.path.split('/').every(x=>x && x!=='.' && x!=='..'),'Safe manifest path');
  assert(!expected.has(file.path),'Duplicate manifest path: '+file.path);
  expected.add(file.path);
}
const actual=[];
async function inventory(relative=''){
  for(const name of await readdir(join(root,relative))){
    const path=relative?relative+'/'+name:name;
    const stat=await lstat(join(root,path));
    assert(!stat.isSymbolicLink(),'Unexpected symlink: '+path);
    if(stat.isDirectory())await inventory(path);
    else {assert(stat.isFile(),'Unexpected special file: '+path);actual.push(path);}
  }
}
await inventory();
assert.deepEqual(actual.sort(),[...expected].sort(),'Exact clean extracted file inventory');
for(const file of manifest.files){
  const bytes=await readFile(join(root,file.path));
  assert.equal(bytes.length,file.bytes,file.path+' bytes');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path+' digest');
}
let child;
let baseURL=externalOrigin;
let output='';
try {
  if(externalOrigin===null){
    const probe=net.createServer();
    await new Promise((ok,fail)=>{probe.once('error',fail);probe.listen(0,'127.0.0.1',ok)});
    const port=probe.address().port;
    await new Promise(ok=>probe.close(ok));
    baseURL='http://127.0.0.1:'+port;
    child=spawn(process.execPath,['launch.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
    await new Promise((ok,fail)=>{
      const timer=setTimeout(()=>fail(Error('Launch timeout: '+output)),15000);
      const finish=()=>{clearTimeout(timer);ok()};
      child.stdout.on('data',b=>{output+=b;if(output.includes(baseURL))finish()});
      child.stderr.on('data',b=>{output+=b});
      child.once('error',e=>{clearTimeout(timer);fail(e)});
      child.once('exit',code=>{clearTimeout(timer);fail(Error('Launch exited '+code+': '+output))});
    });
  }
  const source=await readFile(join(root,'server.mjs'),'utf8');
  const entries=[...source.matchAll(/["'](\/[^"']*)["']\s*:\s*\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g)];
  assert(entries.length>0,'No route manifest found');
  for(const [,route,file,mime] of entries){
    const response=await fetch(baseURL+route,{redirect:'error',signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,200,route);
    assert.equal(response.headers.get('content-type'),mime,route+' MIME');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(join(root,file)),route+' actual served asset');
  }
  console.log(JSON.stringify({source_commit:manifest.source_commit,receiver_sha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),node:process.version,platform:process.platform,
    manifest_files:manifest.files.length,served_routes:entries.length,hosting:externalOrigin===null?'receiver self-hosted':'external',
    base_url:baseURL,launch:externalOrigin===null?'launch.mjs':null,result:'passed',
    scope:'Clean extracted inventory and exact served static route bytes; browser interactions and optional native operations not exercised'},null,2));
} finally {
  if(child?.pid && child.exitCode===null && child.signalCode===null){
    await new Promise(ok=>{
      const timer=setTimeout(()=>child.kill('SIGKILL'),2000);
      child.once('close',()=>{clearTimeout(timer);ok()});
      child.kill('SIGTERM');
    });
  }
}
