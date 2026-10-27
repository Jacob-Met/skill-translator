import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, readFile, rename, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const repository=dirname(dirname(fileURLToPath(import.meta.url)));

test('actual loopback server rejects linked browser assets without exposing adjacent files',async t=>{
 const scratch=await mkdtemp(join(tmpdir(),'skill-server-asset-boundary-'));
 const source=join(scratch,'application');
 try{
  for(const entry of ['package.json','server.mjs','native','src','tools','vendor','web'])
   await cp(join(repository,entry),join(source,entry),{recursive:true});
  const privateFile=join(scratch,'private-original.txt');
  const privateBytes=Buffer.from('synthetic original outside the product directory; not a browser asset\n');
  await writeFile(privateFile,privateBytes);
  const {createAppServer}=await import(pathToFileURL(join(source,'server.mjs')).href);
  const server=createAppServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  try{
   const base=`http://127.0.0.1:${server.address().port}`;
   const get=path=>fetch(base+path);
   const intact=await readFile(join(source,'web/styles.css'));
   const original=await get('/web/styles.css');
   assert.equal(original.status,200);
   assert.deepEqual(Buffer.from(await original.arrayBuffer()),intact);
   assert.equal((await get('/private-original.txt')).status,404);
   await t.test('final asset symlink cannot serve a synthetic private file',async()=>{
    const publicAsset=join(source,'web/styles.css');
    await rm(publicAsset);await symlink(privateFile,publicAsset);
    const result=await get('/web/styles.css');
    assert.equal(result.status,404,`unexpected status ${result.status}`);
    assert.notDeepEqual(Buffer.from(await result.arrayBuffer()),privateBytes);
    await rm(publicAsset);await writeFile(publicAsset,intact);
   });
   await t.test('linked intermediate directory cannot serve assets outside the app',async()=>{
    const originalDirectory=join(source,'web'),moved=join(scratch,'external-web');
    await rename(originalDirectory,moved);await symlink(moved,originalDirectory);
    const result=await get('/web/styles.css');
    assert.equal(result.status,404,`unexpected status ${result.status}`);
    await rm(originalDirectory);await rename(moved,originalDirectory);
   });
   const head=await fetch(base+'/web/styles.css',{method:'HEAD'});
   assert.equal(head.status,200);assert.equal(await head.text(),'');
   assert.equal((await fetch(base+'/web/styles.css',{method:'POST'})).status,405);
  }finally{await new Promise(resolve=>server.close(resolve));}
 }finally{await rm(scratch,{recursive:true,force:true});}
});
