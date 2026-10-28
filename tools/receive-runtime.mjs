// Run against a clean extracted runtime: node receive-runtime.mjs /path/to/runtime
import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
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
const probe=net.createServer();
await new Promise((ok,fail)=>{probe.once('error',fail);probe.listen(0,'127.0.0.1',ok)});
const port=probe.address().port;
await new Promise(ok=>probe.close(ok));
const child=spawn(process.execPath,['launch.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';
try {
  await new Promise((ok,fail)=>{
    const timer=setTimeout(()=>fail(Error('Launch timeout: '+output)),15000);
    const finish=()=>{clearTimeout(timer);ok()};
    child.stdout.on('data',b=>{output+=b;if(output.includes('http://127.0.0.1:'+port))finish()});
    child.stderr.on('data',b=>{output+=b});
    child.once('error',e=>{clearTimeout(timer);fail(e)});
    child.once('exit',code=>{clearTimeout(timer);fail(Error('Launch exited '+code+': '+output))});
  });
  const source=await readFile(join(root,'server.mjs'),'utf8');
  const entries=[...source.matchAll(/["'](\/[^"']*)["']\s*:\s*\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g)];
  assert(entries.length>0,'No route manifest found');
  for(const [,route,file,mime] of entries){
    const response=await fetch('http://127.0.0.1:'+port+route,{signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,200,route);
    assert.equal(response.headers.get('content-type'),mime,route+' MIME');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(join(root,file)),route+' actual served asset');
  }
  console.log(JSON.stringify({source_commit:manifest.source_commit,node:process.version,platform:process.platform,manifest_files:manifest.files.length,served_routes:entries.length,launch:'launch.mjs',result:'passed',scope:'Clean extracted launch and exact static route bytes only; browser interactions and optional native operations not exercised'},null,2));
} finally {
  child.kill('SIGTERM');
}
