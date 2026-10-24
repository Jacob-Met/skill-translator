// A pinned, byte-exact dependency. Updating never edits the upstream algorithm.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {PIXEL_SOURCE} from '../vendor/microverse/source-pin.mjs';
const root=new URL('../vendor/microverse/',import.meta.url);
function digests(bytes){return {sha256:createHash('sha256').update(bytes).digest('hex'),blobSha1:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};}
const args=process.argv.slice(2);
if(args.length){
 if(args.length!==3||args[0]!=='--update'||!/^[a-f0-9]{40}$/.test(args[2]))throw Error('Usage: node tools/verify-pixel-core.mjs [--update /reviewed/microverse/checkout <exact-commit>]');
 const result=spawnSync('git',['-C',args[1],'show',args[2]+':'+PIXEL_SOURCE.path],{maxBuffer:1024*1024});
 if(result.status!==0)throw Error('Could not read the exact upstream source commit.');
 const source={...PIXEL_SOURCE,commit:args[2],...digests(result.stdout)};
 await writeFile(new URL('pixel-observations.mjs',root),result.stdout);
 await writeFile(new URL('source-pin.mjs',root),'export const PIXEL_SOURCE = Object.freeze('+JSON.stringify(source,null,2)+');\n');
 const lock=JSON.parse(await readFile(new URL('source-lock.json',root),'utf8'));
 await writeFile(new URL('source-lock.json',root),JSON.stringify({...lock,...source},null,2)+'\n');
 console.log('Updated exact upstream pin. Run consumer tests and obtain review before integration.');
}else{
 const actual=digests(await readFile(new URL('pixel-observations.mjs',root)));
 const lock=JSON.parse(await readFile(new URL('source-lock.json',root),'utf8'));
 if(Object.entries(PIXEL_SOURCE).some(([k,v])=>lock[k]!==v)||actual.sha256!==PIXEL_SOURCE.sha256||actual.blobSha1!==PIXEL_SOURCE.blobSha1)throw Error('Vendored pixel core differs from its upstream pin; do not patch the algorithm here.');
 console.log('Exact MICROVERSE pixel core verified: '+PIXEL_SOURCE.commit+' / '+actual.blobSha1);
}
