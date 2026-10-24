import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PIXEL_SOURCE} from '../vendor/microverse/source-pin.mjs';
test('pixel-region dependency is the exact documented upstream blob, not a local fork',()=>{
 const bytes=readFileSync(new URL('../vendor/microverse/pixel-observations.mjs',import.meta.url));
 const lock=JSON.parse(readFileSync(new URL('../vendor/microverse/source-lock.json',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),PIXEL_SOURCE.sha256);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),PIXEL_SOURCE.blobSha1);
 for(const[k,v]of Object.entries(PIXEL_SOURCE))assert.equal(lock[k],v);
});
