// Local transport only. Browser decoding and reopenCapture must precede adoption.
import {MAX_IMAGE_BYTES, inspectImageBytes} from './capture.mjs';
import {MAX_ANNOTATION_BYTES, reopenCapture} from './capture-editing.mjs';
const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const MAGIC=encoder.encode('STSOURCE1\n'), HEADER_BYTES=MAGIC.length+4;
export const MAX_SOURCE_PACKAGE_BYTES=HEADER_BYTES+MAX_ANNOTATION_BYTES+MAX_IMAGE_BYTES;
function view(value){
  if(value instanceof Uint8Array)return value;
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  throw Error('Source package requires image bytes.');
}
async function checkPair(annotations,imageBytes){
  const encoded=inspectImageBytes(imageBytes), document=JSON.parse(annotations), image=document?.source?.image;
  const demo=reopenCapture(annotations,image);
  const digest=await crypto.subtle.digest('SHA-256',imageBytes);
  const sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  if(sha256!==image.sha256||encoded.mimeType!==image.mimeType)throw Error('Package image bytes do not match the annotations.');
  if(!((encoded.widthPx===image.widthPx&&encoded.heightPx===image.heightPx)||
       (encoded.widthPx===image.heightPx&&encoded.heightPx===image.widthPx)))
    throw Error('Package image dimensions do not match the annotations.');
  return demo;
}
/** Preserve supplied maintained export text and original image bytes exactly. */
export async function packSource(annotations,originalImage){
  if(typeof annotations!=='string'||!annotations.length||annotations.length>MAX_ANNOTATION_BYTES)
    throw Error('Annotations must be JSON up to 256 KiB.');
  const annotationBytes=encoder.encode(annotations);
  if(annotationBytes.length>MAX_ANNOTATION_BYTES)throw Error('Annotations must be JSON up to 256 KiB.');
  if(decoder.decode(annotationBytes)!==annotations)throw Error('Annotation text cannot be preserved exactly as UTF-8.');
  const supplied=view(originalImage);
  if(!supplied.length||supplied.length>MAX_IMAGE_BYTES)throw Error('Choose a PNG or JPEG up to 12 MB.');
  // Plain Uint8Array owns storage even when supplied is a Node Buffer/subarray.
  const imageBytes=new Uint8Array(supplied);
  await checkPair(annotations,imageBytes);
  const result=new Uint8Array(HEADER_BYTES+annotationBytes.length+imageBytes.length);
  result.set(MAGIC);
  new DataView(result.buffer,result.byteOffset,result.byteLength).setUint32(MAGIC.length,annotationBytes.length);
  result.set(annotationBytes,HEADER_BYTES);result.set(imageBytes,HEADER_BYTES+annotationBytes.length);
  return result;
}
/** Pair validation is provisional until independent browser decode and reopen. */
export async function unpackSource(input){
  const supplied=view(input);
  if(supplied.length<=HEADER_BYTES||supplied.length>MAX_SOURCE_PACKAGE_BYTES)
    throw Error('Source package exceeds existing image and annotation limits or is incomplete.');
  const bytes=new Uint8Array(supplied);
  if(!MAGIC.every((value,index)=>bytes[index]===value))throw Error('Unsupported source package.');
  const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(MAGIC.length);
  if(!length||length>MAX_ANNOTATION_BYTES||HEADER_BYTES+length>=bytes.length)
    throw Error('Source package annotation length is invalid.');
  const annotations=decoder.decode(bytes.subarray(HEADER_BYTES,HEADER_BYTES+length));
  const imageBytes=bytes.slice(HEADER_BYTES+length);
  const demo=await checkPair(annotations,imageBytes);
  return {annotations,imageBytes,name:demo.source.image.name,mimeType:demo.source.image.mimeType};
}
