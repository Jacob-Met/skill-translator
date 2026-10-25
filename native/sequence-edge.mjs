import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateSequence} from '../src/demonstration-sequence.mjs';
import {receiveSequenceEdge} from '../src/sequence-edge.mjs';
let running=false;
export async function runSequenceEdge(raw){
 if(running)throw Error('Another source edge request is running. Try again when it finishes.');
 const sequence=validateSequence(raw.sequence),moment=sequence.moments.find(m=>m.id===raw.momentId);if(!moment)throw Error('Choose a retained source moment');
 if(typeof raw.pngBase64!=='string'||raw.pngBase64.length>17*1024*1024)throw Error('Source PNG exceeds native request capacity');
 running=true;let child,timer;
 try{return await new Promise((resolve,reject)=>{
 child=spawn(process.env.SKILL_EDGE_PYTHON||'python3',[fileURLToPath(new URL('../tools/sequence-edge-native.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});let stdout='',stderr='',tooLarge=false,timedOut=false;
 timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},15000);
 child.on('error',reject);child.stdin.on('error',()=>{});child.stdout.on('data',data=>{stdout+=data;if(stdout.length>8*1024*1024){tooLarge=true;child.kill();}});child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000){tooLarge=true;child.kill();}});
 child.on('close',code=>{try{if(timedOut)throw Error('Source edge worker exceeded15seconds');if(code!==0||tooLarge)throw Error(tooLarge?'Native report exceeded capacity':stderr.trim()||'Source edge worker stopped');resolve(receiveSequenceEdge(sequence,JSON.parse(stdout)));}catch(error){reject(error);}});
 child.stdin.end(JSON.stringify({momentId:moment.id,image:moment.image,origin:moment.origin,pngBase64:raw.pngBase64,roi:raw.roi,representation:raw.representation}));
 });}finally{clearTimeout(timer);running=false;}
}
export async function serveSequenceEdge(req,res){
 if(req.headers.origin!==`http://${req.headers.host}`||!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end('Same-origin JSON request required');return;}
 try{let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>22*1024*1024)throw Error('Source request exceeds22MiB');chunks.push(chunk);}const report=await runSequenceEdge(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(report));}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
}
