import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const appRoot=new URL('../',import.meta.url);
let discovered;
function probe(interpreter){
 return new Promise(resolve=>{
  const child=spawn(interpreter,['-c','import cv2,numpy,json;print(json.dumps({"opencv":cv2.__version__,"numpy":numpy.__version__}))'],{stdio:['ignore','pipe','ignore']});
  let output='',settled=false;const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(null);},5000);
  child.on('error',()=>finish(null));child.stdout.on('data',data=>{output+=data;if(output.length>1024){child.kill();finish(null);}});
  child.on('close',code=>{try{const versions=JSON.parse(output);finish(code===0&&typeof versions.opencv==='string'&&typeof versions.numpy==='string'?{interpreter,...versions}:null);}catch{finish(null);}});
 });
}
async function discover(){
 const explicit=process.env.SKILL_PHOTO_PYTHON||process.env.SKILL_EDGE_PYTHON||process.env.SKILL_CALIBRATION_PYTHON;
 if(explicit)return probe(explicit);
 const local=process.platform==='win32'?'.venv-native/Scripts/python.exe':'.venv-native/bin/python';
 const localPath=fileURLToPath(new URL(local,appRoot));
 for(const interpreter of [...(existsSync(localPath)?[localPath]:[]),...(process.platform==='win32'?['python','python3']:['python3','python'])]){
  const runtime=await probe(interpreter);if(runtime)return runtime;
 }
 return null;
}
// Setup installs into the app directory. Restart the launcher after installation.
export function discoverOpenCvRuntime(){return discovered??=discover();}
