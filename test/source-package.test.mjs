import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCapture,appendCaptureMark,MAX_IMAGE_BYTES} from '../src/capture.mjs';
import {exportCapture,reopenCapture,MAX_ANNOTATION_BYTES} from '../src/capture-editing.mjs';
import {packSource,unpackSource,MAX_SOURCE_PACKAGE_BYTES} from '../src/source-package.mjs';

// Header-only authored data exercises the transport contract, NOT image decoding.
// The independent browser course must use an actual decodable image.
function fixture(){
  const image=Buffer.alloc(24);
  image.set([137,80,78,71,13,10,26,10]);image.set([73,72,68,82],12);
  image.writeUInt32BE(100,16);image.writeUInt32BE(80,20);
  const identity={sha256:createHash('sha256').update(image).digest('hex'),widthPx:100,heightPx:80,mimeType:'image/png',name:'authored.png',pixelCoordinates:'browser-oriented'};
  let demo=createCapture(identity,[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}],100,80,{title:'Transport fixture'});
  demo=appendCaptureMark(demo,{sourcePx:{x:50,y:40},label:'Authored midpoint',kind:'fraction',toleranceMm:3,why:'Authored transport input, not a measured physical task.'});
  demo.transportContext={note:'Multibyte: café / 日本語 / 🧵',retained:[1,null,{verbatim:'unknown context'}]};
  return {image,demo,text:exportCapture(demo)};
}
test('Buffer and offset views retain exact image and annotation text',async()=>{
  const {image,demo,text}=fixture();
  const storage=Buffer.concat([Buffer.from('prefix'),image,Buffer.from('suffix')]);
  const packed=await packSource(text,storage.subarray(6,6+image.length));
  const envelope=Buffer.concat([Buffer.from('offset'),Buffer.from(packed),Buffer.from('tail')]);
  const pair=await unpackSource(envelope.subarray(6,6+packed.length));
  assert.equal(pair.annotations,text);assert.deepEqual(Buffer.from(pair.imageBytes),image);
  assert.deepEqual(reopenCapture(pair.annotations,demo.source.image),demo);
  assert.deepEqual(await packSource(pair.annotations,pair.imageBytes),packed);
});
test('pack and unpack own input bytes across digest awaits',async()=>{
  const {image,text}=fixture(), original=Buffer.from(image);
  const saving=packSource(text,image);image.fill(0);
  const packed=await saving, input=Buffer.from(packed);
  const reading=unpackSource(input);input.fill(0);
  const pair=await reading;
  assert.deepEqual(Buffer.from(pair.imageBytes),original);assert.equal(pair.annotations,text);
});
test('corrupt identity, framing and invalid UTF8 refuse',async()=>{
  const {image,text}=fixture(), packed=await packSource(text,image);
  const corrupt=packed.slice();corrupt[corrupt.length-1]^=1;
  await assert.rejects(unpackSource(corrupt),/match/);
  const length=packed.slice();new DataView(length.buffer).setUint32(Buffer.byteLength('STSOURCE1\n'),MAX_ANNOTATION_BYTES+1);
  await assert.rejects(unpackSource(length),/length/);
  const utf8=packed.slice();utf8[14]=255;
  await assert.rejects(unpackSource(utf8));
  await assert.rejects(unpackSource(packed.subarray(0,14)));
  const magic=packed.slice();magic[0]=0;await assert.rejects(unpackSource(magic),/Unsupported/);
});
test('no BOM stripping or literal lone-surrogate substitution',async()=>{
  const {image,text,demo}=fixture();
  await assert.rejects(packSource('\uFEFF'+text,image));
  const packed=await packSource(text,image), magicLength=Buffer.byteLength('STSOURCE1\n');
  const headerLength=magicLength+4, annotationBytes=Buffer.from('\uFEFF'+text,'utf8');
  const bomPackage=Buffer.concat([Buffer.from(packed.subarray(0,headerLength)),annotationBytes,image]);
  bomPackage.writeUInt32BE(annotationBytes.length,magicLength);
  await assert.rejects(unpackSource(bomPackage));
  const literal=text.replace('Transport fixture','Transport '+String.fromCharCode(0xD800));
  await assert.rejects(packSource(literal,image),/UTF-8/);
  demo.transportContext.escaped=String.fromCharCode(0xD800);
  const escaped=exportCapture(demo), pair=await unpackSource(await packSource(escaped,image));
  assert.equal(pair.annotations,escaped);
});
test('unchanged annotation and image limits reject before packaging',async()=>{
  const {image,text}=fixture();
  await assert.rejects(packSource(' '.repeat(MAX_ANNOTATION_BYTES+1),image));
  await assert.rejects(packSource(text,new Uint8Array(MAX_IMAGE_BYTES+1)));
  await assert.rejects(unpackSource(new Uint8Array(MAX_SOURCE_PACKAGE_BYTES+1)));
  const encoded=JSON.stringify({padding:'é'.repeat(MAX_ANNOTATION_BYTES/2)});
  assert.ok(encoded.length<MAX_ANNOTATION_BYTES);
  await assert.rejects(packSource(encoded,image),/256 KiB/);
});
