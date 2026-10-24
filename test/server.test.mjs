import test from "node:test";
import assert from "node:assert/strict";
import {createAppServer} from "../server.mjs";
test("actual HTTP serves interactive app assets without internet dependencies or traversal",async()=>{
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try{
    for(const [url,type] of [
      ["/","text/html"],["/web/styles.css","text/css"],
      ["/observe-attempt","text/html"],["/web/observe-attempt.css","text/css"],
      ["/web/observe-attempt.mjs","text/javascript"],["/src/learner-observation.mjs","text/javascript"],
      ["/rule-adoption","text/html"],["/web/rule-adoption.mjs","text/javascript"],
      ["/web/rule-adoption.css","text/css"],["/src/rule-adoption.mjs","text/javascript"],
      ["/calibration","text/html"],["/web/calibration.css","text/css"],
      ["/web/calibration.mjs","text/javascript"],["/src/calibration-evidence.mjs","text/javascript"],
      ["/web/app.mjs","text/javascript"],["/src/geometry.mjs","text/javascript"],
      ["/src/demo.mjs","text/javascript"],
      ["/src/hypotheses.mjs","text/javascript"],
      ["/src/authoring.mjs","text/javascript"],
      ["/calibration-checks","text/html"],["/web/calibration-checks.mjs","text/javascript"],
      ["/web/calibration-checks.css","text/css"],["/src/calibration-checks.mjs","text/javascript"]
    ]){
      const r=await fetch(base+url);
      assert.equal(r.status,200,url);
      assert.ok(r.headers.get("content-type").includes(type));
      assert.equal(r.headers.get("content-security-policy").includes("connect-src 'none'"),true);
      assert.ok((await r.text()).length>50);
    }
    const head=await fetch(base+"/",{method:"HEAD"});
    assert.equal(head.status,200);assert.equal((await head.text()).length,0);
    assert.equal((await fetch(base+"/.git/config")).status,404);
    assert.equal((await fetch(base+"/src/../.git/config")).status,404);
    assert.equal((await fetch(base+"/",{method:"POST"})).status,405);
  }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});

