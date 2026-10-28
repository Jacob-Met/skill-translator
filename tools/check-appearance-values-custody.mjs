import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {defaultAppearanceRequest} from '../src/appearance-pair.mjs';
import {admitAppearanceValues,FORMAT} from '../src/appearance-values-research.mjs';
const path=process.argv[2];if(!path)throw Error('Supply retained original sequence bundle path');
const bytes=await readFile(path),bundle=JSON.parse(bytes),s=bundle.sequence;
const hash=b=>createHash('sha256').update(b).digest('hex');const frames=[];
for(const m of s.moments){const entry=bundle.frames.find(f=>f.momentId===m.id);assert.ok(entry);const png=Buffer.from(entry.pngBase64,'base64');assert.equal(hash(png),m.image.sha256);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),m.image.widthPx);assert.equal(png.readUInt32BE(20),m.image.heightPx);frames.push({sha256:hash(png),presentedSeconds:m.origin.mediaTimeSeconds,widthPx:m.image.widthPx,heightPx:m.image.heightPx});}
const row=(a,b)=>({source:s,request:defaultAppearanceRequest(s,s.moments[a].id,s.moments[b].id,{widthPx:160,radius:4}),basis:'Original retained pair for source-custody receiving; no action interpretation',decision:null,decisionBasis:'Unknown; no action label inferred from these frames'});
const raw={format:FORMAT,basis:'Source-only receiving, not independent recordings or decision evidence',references:[row(0,1),row(1,2)],target:row(2,3)};
const admitted=admitAppearanceValues(raw);assert.equal(admitted.references.length,2);assert.equal(admitted.target.request.request.frames.length,2);
const forged=structuredClone(raw);forged.references[0].request.request.frames[1].sha256='0'.repeat(64);assert.throws(()=>admitAppearanceValues(forged));
const renamed=structuredClone(raw);renamed.target=row(0,1);assert.throws(()=>admitAppearanceValues(renamed));
assert.equal(hash(await readFile(path)),hash(bytes));
const receipt={scope:'Native original PNG digest/header and complete canonical pair-source admission only; no image decoding, browser resampling or numeric inference',bundleSHA256:hash(bytes),clipSHA256:s.clip.sha256,frames,sourceUnchanged:true,referenceDecisions:[null,null],sharedOriginalClip:true,unknownTarget:true,forgedPairIdentityRefused:true,reusedReferencePairAsTargetRefused:true};
await writeFile(process.env.CUSTODY_OUTPUT ?? 'appearance-values-custody.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
