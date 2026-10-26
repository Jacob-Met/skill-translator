import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {calibrationDraftRequest,receiveCalibrationDraft} from '../src/calibration-draft.mjs';
let running=false;
export async function runCalibrationTranslation(raw) {
  if(running)throw Error('Another calibration draft request is running.');
  const request=calibrationDraftRequest(raw.reference,raw.target,raw.rois,raw.declaration);
  for(const key of ['referencePngBase64','targetPngBase64'])if(typeof raw[key]!=='string'||raw[key].length>17*1024*1024)throw Error('Original PNG exceeds request capacity.');
  running=true;let timer;
  try{return await new Promise((resolve,reject)=>{
    const child=spawn(process.env.SKILL_CALIBRATION_PYTHON||'python3',[fileURLToPath(new URL('../tools/calibration-translation-native.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='',failure='';
    timer=setTimeout(()=>{failure='Calibration draft exceeded 15 seconds.';child.kill('SIGKILL');},15000);
    child.on('error',reject);child.stdin.on('error',()=>{});
    child.stdout.on('data',data=>{stdout+=data;if(stdout.length>256*1024){failure='Native report exceeds capacity.';child.kill('SIGKILL');}});
    child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000){failure='Native error exceeds capacity.';child.kill('SIGKILL');}});
    child.on('close',code=>{try{if(failure||code!==0)throw Error(failure||stderr.trim()||'Native calibration worker stopped.');const report=JSON.parse(stdout);receiveCalibrationDraft(request,report);resolve(report);}catch(error){reject(error);}});
    child.stdin.end(JSON.stringify({reference:request.reference.source.image,target:request.target,rois:request.rois,referencePngBase64:raw.referencePngBase64,targetPngBase64:raw.targetPngBase64}));
  });}finally{clearTimeout(timer);running=false;}
}
export async function serveCalibrationTranslation(req,res) {
  if(req.headers.origin!==`http://${req.headers.host}`||!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end('Same-origin JSON request required');return;}
  try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>35*1024*1024)throw Error('Calibration request exceeds 35 MiB.');chunks.push(chunk);}const report=await runCalibrationTranslation(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(report));}
  catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
}
