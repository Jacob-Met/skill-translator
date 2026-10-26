/** Restrict native upload decoding to self-contained container profiles. */
export function audioInputProfile(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<12)throw Error('Original audio container signature is unavailable.');
 const common=['-protocol_whitelist','file'];
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE')return {format:'wav',args:[...common,'-f','wav']};
 if(bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return {format:'matroska',args:[...common,'-f','matroska']};
 if(bytes.toString('ascii',4,8)!=='ftyp')throw Error('Choose a self-contained MP4/WebM or RIFF-WAVE original; reference lists and automatic demuxing are unavailable.');
 let count=0;
 function boxes(start,end,visit){let offset=start;while(offset<end){if(end-offset<8||++count>100000)throw Error('Original MP4 box structure exceeds the admitted profile.');let size=bytes.readUInt32BE(offset),header=8;const type=bytes.toString('ascii',offset+4,offset+8);if(size===1){if(end-offset<16)throw Error('Truncated extended MP4 box.');const extended=bytes.readBigUInt64BE(offset+8);if(extended>BigInt(end-offset))throw Error('MP4 box leaves its original parent.');size=Number(extended);header=16;}else if(size===0)size=end-offset;if(size<header||size>end-offset)throw Error('MP4 box leaves its original parent.');visit(type,offset+header,offset+size);offset+=size;}}
 const containers=new Set(['moov','trak','mdia','minf','dinf']);
 function inspect(type,start,end){
  if(type==='cmov')throw Error('Compressed MP4 metadata is outside the self-contained profile.');
  if(containers.has(type)){boxes(start,end,inspect);return;}
  if(type!=='dref')return;
  if(end-start<8||bytes.readUInt32BE(start)!==0)throw Error('Unsupported MP4 data-reference table.');
  const expected=bytes.readUInt32BE(start+4);let found=0;
  boxes(start+8,end,(kind,a,b)=>{found++;if(kind!=='url '||b-a!==4||bytes.readUInt32BE(a)!==1)throw Error('External MP4 data references are unavailable; retain a self-contained original.');});
  if(found!==expected)throw Error('Incomplete MP4 data-reference table.');
 }
 boxes(0,bytes.length,inspect);
 return {format:'mov',args:[...common,'-f','mov','-enable_drefs','0','-use_absolute_path','0']};
}
