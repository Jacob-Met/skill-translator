import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectContourSourcePng} from '../src/sequence-contours.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url),'utf8'));
const original=Buffer.from(fixture.comparison.sources[0].frames[0].pngBase64,'base64');
function chunk(kind,payload){const b=Buffer.alloc(12+payload.length);b.writeUInt32BE(payload.length);b.write(kind,4,'ascii');payload.copy(b,8);let crc=0xffffffff;for(const x of b.subarray(4,-4)){crc^=x;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}b.writeUInt32BE((crc^0xffffffff)>>>0,b.length-4);return b;}
const before=Buffer.from(original);inspectContourSourcePng(original);assert.deepEqual(original,before);
const slab=Buffer.concat([Buffer.alloc(9),original,Buffer.alloc(7)]);inspectContourSourcePng(slab.subarray(9,-7));
for(const kind of ['eXIf','acTL'])for(const at of [33,original.length-12]){
 const altered=Buffer.concat([original.subarray(0,at),chunk(kind,Buffer.from([1,2,3,4,5,6,7,8])),original.subarray(at)]);
 assert.throws(()=>inspectContourSourcePng(altered),/explicit source interpretation/);
}
inspectContourSourcePng(Buffer.concat([original.subarray(0,33),chunk('tEXt',Buffer.from('note\0eXIf acTL are words here')),original.subarray(33)]));
for(const data of [original.subarray(0,35),Buffer.concat([original.subarray(0,33),Buffer.from([255,255,255,255,116,69,88,116,0,0,0,0])])])assert.throws(()=>inspectContourSourcePng(data),/Truncated PNG chunk/);
assert.throws(()=>inspectContourSourcePng(new Uint8Array(16*1024*1024+1)),/Bounded/);
console.log('PASS ordinary/subview original PNG, source nonmutation, both metadata classes at two chunk positions, literal text, truncation and byte bound');
