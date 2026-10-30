import test from "node:test";
import assert from "node:assert/strict";
import {buildMessages,configFromEnv,parseReadings,requestReadings,validateMarkInput,TOKEN_FACTORY_URL,DEFAULT_MODEL}
  from "../src/rule-interpretations.mjs";
import {createAppServer} from "../server.mjs";

const goodInput={label:"Center registration",authoredRule:"fraction",sourceWidthMm:240,sourceHeightMm:160,
  sourceFraction:{u:0.5,v:0.5},sourceEdgeDistancesMm:{left:120,right:120,top:80,bottom:80}};

test("rule readings keep only the closed rule set, unique rules and bounded text",()=>{
  const content="Sure. "+JSON.stringify({readings:[{rule:"left",reading:"  Stays  120 mm from the left. "},
    {rule:"left",reading:"duplicate"},{rule:"diagonal",reading:"unknown rule"},
    {rule:"top",reading:"x".repeat(900)},{rule:"fraction",reading:""}]});
  const out=parseReadings(content);
  assert.deepEqual(out.map(r=>r.rule),["left","top"]);
  assert.equal(out[0].reading,"Stays 120 mm from the left.");
  assert.equal(out[1].reading.length,320);
});

test("unusable model replies are refused without echoing content",()=>{
  for(const content of [null,"no json here",'{"readings":"nope"}','{"readings":[{"rule":"zzz","reading":"a"}]}']){
    assert.throws(()=>parseReadings(content),err=>err.status===502);
  }
});

test("browser payload is validated before any network call",()=>{
  assert.throws(()=>validateMarkInput({...goodInput,authoredRule:"diagonal"}),/Unknown authored rule/);
  assert.throws(()=>validateMarkInput({...goodInput,sourceWidthMm:-1}),/width/);
  assert.throws(()=>validateMarkInput({...goodInput,sourceFraction:{u:1.5,v:0}}),/lie on the sheet/);
  assert.throws(()=>validateMarkInput({...goodInput,label:""}),/label/);
});

test("request goes to Token Factory with the key only in the header and no reading is invented",async()=>{
  const calls=[];
  const fakeFetch=async(url,init)=>{
    calls.push({url,init});
    return new Response(JSON.stringify({choices:[{message:{content:
      '{"readings":[{"rule":"top","reading":"Keeps a fixed clearance from the top edge."}]}'}}]}),{status:200});
  };
  const result=await requestReadings({input:goodInput,apiKey:"test-key-value",fetchImpl:fakeFetch});
  assert.equal(calls[0].url,TOKEN_FACTORY_URL);
  assert.equal(calls[0].init.headers.Authorization,"Bearer test-key-value");
  const body=JSON.parse(calls[0].init.body);
  assert.ok(body.max_tokens>=1500);
  assert.equal(body.model,DEFAULT_MODEL);
  assert.ok(body.messages[0].content.includes("exactly five candidate rules"));
  assert.equal(JSON.stringify(result).includes("test-key-value"),false);
  assert.deepEqual(result.readings,[{rule:"top",reading:"Keeps a fixed clearance from the top edge."}]);
});

test("upstream failure is reported as a generic gateway error",async()=>{
  const failing=async()=>new Response("denied",{status:401});
  await assert.rejects(requestReadings({input:goodInput,apiKey:"sk-test-SECRET-123",fetchImpl:failing}),
    err=>err.status===502&&!err.message.includes("SECRET"));
});

test("config reads the key and model from the environment only",()=>{
  assert.deepEqual(configFromEnv({}),{apiKey:null,model:DEFAULT_MODEL});
  assert.equal(configFromEnv({NEBIUS_API_KEY:"  abc \n"}).apiKey,"abc");
  assert.equal(configFromEnv({NEBIUS_MODEL:"nvidia/Nemotron-3_5-Lightning"}).model,"nvidia/Nemotron-3_5-Lightning");
});

test("HTTP endpoint reports unavailable without a key and refuses bad JSON",async()=>{
  const saved=process.env.NEBIUS_API_KEY;delete process.env.NEBIUS_API_KEY;
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try{
    const r=await fetch(base+"/api/rule-interpretations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(goodInput)});
    const body=await r.json();
    assert.equal(r.status,200);
    assert.equal(body.available,false);
    assert.match(body.message,/NEBIUS_API_KEY/);
    const home=await fetch(base+"/");
    assert.match(home.headers.get("content-security-policy"),/connect-src 'self'/);
    const bad=await fetch(base+"/api/rule-interpretations",{method:"POST",body:"{not json"});
    assert.equal((await bad.json()).available,false);
    const get=await fetch(base+"/api/rule-interpretations");
    assert.equal(get.status,404);
  }finally{
    if(saved!==undefined)process.env.NEBIUS_API_KEY=saved;
    await new Promise(resolve=>server.close(resolve));
  }
});
