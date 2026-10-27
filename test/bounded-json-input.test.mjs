import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,rm,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readBoundedJson} from '../tools/read-bounded-json.mjs';

test('bounded JSON admission and descriptor growth',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'joint-input-'));
 const path=join(dir,'input.json');
 try {
  const text='{"name":"café"}'; await writeFile(path,text);
  assert.deepEqual(await readBoundedJson(path,Buffer.byteLength(text)),{name:'café'});
  await assert.rejects(readBoundedJson(path,Buffer.byteLength(text)-1),/byte limit/);
  await writeFile(path,Buffer.from([123,34,120,34,58,34,255,34,125]));
  await assert.rejects(readBoundedJson(path,100),/encoded data|encoding/i);
  await assert.rejects(readBoundedJson(dir,100),/regular file/);
  if(process.platform!=='win32'){
   const fifo=process.env.BOUNDED_JSON_TEST_FIFO??join(dir,'fifo');if(!process.env.BOUNDED_JSON_TEST_FIFO)execFileSync('mkfifo',[fifo]);
   await assert.rejects(readBoundedJson(fifo,100),/regular file/);
  }
  await writeFile(path,'{}');
  const probe=await open(path,'r');const prototype=Object.getPrototypeOf(probe);await probe.close();
  const original=prototype.stat;
  prototype.stat=async function(...args){const info=await original.apply(this,args);await appendFile(path,' '.repeat(200));return info;};
  try {await assert.rejects(readBoundedJson(path,100),/byte limit/);} finally {prototype.stat=original;}
  await assert.rejects(readBoundedJson(path,-1),/Invalid input byte limit/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
