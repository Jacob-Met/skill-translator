import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createAppServer} from '../server.mjs';

function send(port,path,{host,origin,contentType='application/json',body='{}'}) {
  return new Promise((resolve,reject)=>{
    const headers={'Host':host,'Content-Type':contentType,'Content-Length':Buffer.byteLength(body)};
    if(origin!==undefined)headers.Origin=origin;
    const req=request({hostname:'127.0.0.1',port,path,method:'POST',headers},res=>{
      const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);req.end(body);
  });
}

test('native POST handlers reject foreign Host headers even with a matching forged Origin',async t=>{
  const server=createAppServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const port=server.address().port;
  for(const path of ['/api/sequence-edge','/api/calibration-translation','/api/audio-intake']){
    const options=path==='/api/audio-intake'?{contentType:'application/octet-stream',body:'not a media file'}:{};
    await t.test(path,async()=>{
      const host=`fixture.attacker.example:${port}`;
      assert.equal((await send(port,path,{...options,host,origin:`http://${host}`})).status,403,'forged Host must not admit compute');
      const deceptiveHost=`127.0.0.1.attacker.example:${port}`;
      assert.equal((await send(port,path,{...options,host:deceptiveHost,origin:`http://${deceptiveHost}`})).status,403,'loopback-looking foreign host must refuse');
      const localHost=`127.0.0.1:${port}`;
      assert.equal((await send(port,path,{...options,host:localHost,origin:`http://${localHost}`})).status,400,'same-origin input must reach ordinary native validation');
      const aliasHost=`localhost:${port}`;
      assert.equal((await send(port,path,{...options,host:aliasHost,origin:`http://${aliasHost}`})).status,400,'localhost same-origin remains usable');
      assert.equal((await send(port,path,{...options,host:localHost,origin:`http://${localHost}`,contentType:'text/plain'})).status,403,'browser-simple content must not enter the worker');
      assert.equal((await send(port,path,{...options,host:localHost,origin:'http://other.example'})).status,403,'foreign Origin must refuse');
      assert.equal((await send(port,path,{...options,host:localHost,origin:'null'})).status,403,'opaque Origin must refuse');
    });
  }
});
