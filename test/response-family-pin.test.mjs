import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('response-family geometry is the pinned unmodified maintained CHRONOS primitive',async()=>{
 const lock=JSON.parse(await readFile(new URL('../vendor/chronos/source-lock.json',import.meta.url),'utf8'));
 const bytes=await readFile(new URL('../vendor/chronos/exact-halfplanes.mjs',import.meta.url));
 assert.equal(lock.repository,'Jacob-Met/chronos-vision');
 assert.equal(lock.commit,'4cd60f5d9bca75065cbc4c47c3562156b1c69364');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),lock.sha256);
});
