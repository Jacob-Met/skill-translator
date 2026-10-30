// Plain-language rule readings proposed by an NVIDIA Nemotron model served by Nebius Token Factory.
// The model only proposes readings. Every proposed rule is accepted only if it is one of the
// closed set below, and the app's deterministic evaluator (src/evidence.mjs) decides what the
// observations support. Nothing here is a verdict about the teacher's intent.
import {RULES} from "./evidence.mjs";

export const TOKEN_FACTORY_URL="https://api.tokenfactory.nebius.com/v1/chat/completions";
export const DEFAULT_MODEL="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
export const MAX_READINGS=RULES.length;
const MAX_READING_CHARS=320;
const finite=x=>typeof x==="number"&&Number.isFinite(x);

export const RULE_MEANINGS=Object.freeze({
  fraction:"proportional position: the mark keeps the same fraction of the sheet width and height as in the source",
  left:"fixed left clearance: the mark keeps the same millimetre distance from the left edge",
  right:"fixed right clearance: the mark keeps the same millimetre distance from the right edge",
  top:"fixed top clearance: the mark keeps the same millimetre distance from the top edge",
  bottom:"fixed bottom clearance: the mark keeps the same millimetre distance from the bottom edge",
});

// Validates the browser payload before anything leaves the server.
export function validateMarkInput(input){
  const fail=message=>{throw Object.assign(new Error(message),{status:400});};
  if(!input||typeof input!=="object")fail("Send a JSON object describing one source mark.");
  const {label,authoredRule,sourceWidthMm,sourceHeightMm,sourceFraction,sourceEdgeDistancesMm}=input;
  if(typeof label!=="string"||label.trim().length<1||label.length>100)fail("Mark label must be 1–100 characters.");
  if(!["fraction",...RULES.slice(1)].includes(authoredRule))fail("Unknown authored rule.");
  if(!finite(sourceWidthMm)||sourceWidthMm<=0||sourceWidthMm>10000)fail("Source width must be 0–10000 mm.");
  if(!finite(sourceHeightMm)||sourceHeightMm<=0||sourceHeightMm>10000)fail("Source height must be 0–10000 mm.");
  if(!sourceFraction||!finite(sourceFraction.u)||!finite(sourceFraction.v)||
    sourceFraction.u<0||sourceFraction.u>1||sourceFraction.v<0||sourceFraction.v>1)fail("Source fraction must lie on the sheet.");
  const d=sourceEdgeDistancesMm;
  if(!d||["left","right","top","bottom"].some(k=>!finite(d[k])||d[k]<0||d[k]>10000))fail("Edge distances are invalid.");
  return {label:label.trim(),authoredRule,sourceWidthMm,sourceHeightMm,sourceFraction,sourceEdgeDistancesMm:d};
}

export function buildMessages(input){
  const mm=x=>x.toFixed(1)+" mm";
  const system=[
    "You help a bookbinding teacher understand what a demonstrated registration mark means.",
    "There are exactly five candidate rules. Use only these rule ids:",
    ...RULES.map(r=>`- "${r}": ${RULE_MEANINGS[r]}`),
    "Reply with JSON only, no prose outside it, in this shape:",
    '{"readings":[{"rule":"<rule id>","reading":"<one plain sentence, at most 240 characters, saying what this rule would require of this mark when the sheet is a different size (do not repeat the numbers above)>"}]}',
    "Give two or three readings, most plausible first. Do not repeat a rule. Do not claim certainty.",
  ].join("\n");
  const user=[
    `Mark name: ${input.label}`,
    `Authored rule for this mark: ${input.authoredRule}`,
    `Source sheet: ${mm(input.sourceWidthMm)} wide, ${mm(input.sourceHeightMm)} high.`,
    `Mark position as a fraction of the sheet: ${input.sourceFraction.u.toFixed(3)} across, ${input.sourceFraction.v.toFixed(3)} down.`,
    `Mark distance to the left edge: ${mm(input.sourceEdgeDistancesMm.left)}; right: ${mm(input.sourceEdgeDistancesMm.right)}; top: ${mm(input.sourceEdgeDistancesMm.top)}; bottom: ${mm(input.sourceEdgeDistancesMm.bottom)}.`,
  ].join("\n");
  return [{role:"system",content:system},{role:"user",content:user}];
}

// Accepts only the closed rule set, unique rules, and short plain text.
export function parseReadings(content){
  if(typeof content!=="string")throw Object.assign(new Error("The model returned no text."),{status:502});
  const start=content.indexOf("{"),end=content.lastIndexOf("}");
  let parsed=null;
  try{parsed=JSON.parse(start>=0&&end>start?content.slice(start,end+1):"");}catch{parsed=null;}
  if(!parsed||!Array.isArray(parsed.readings))
    throw Object.assign(new Error("The model reply was not the expected JSON."),{status:502});
  const seen=new Set(),out=[];
  for(const item of parsed.readings){
    if(!item||typeof item!=="object")continue;
    if(!RULES.includes(item.rule)||seen.has(item.rule))continue;
    if(typeof item.reading!=="string")continue;
    const reading=item.reading.replace(/\s+/g," ").trim();
    if(!reading)continue;
    seen.add(item.rule);
    out.push({rule:item.rule,reading:reading.slice(0,MAX_READING_CHARS)});
    if(out.length===MAX_READINGS)break;
  }
  if(!out.length)throw Object.assign(new Error("The model proposed no usable rule."),{status:502});
  return out;
}

export function configFromEnv(env){
  const apiKey=typeof env.NEBIUS_API_KEY==="string"?env.NEBIUS_API_KEY.trim():"";
  const model=typeof env.NEBIUS_MODEL==="string"&&env.NEBIUS_MODEL.trim()?env.NEBIUS_MODEL.trim():DEFAULT_MODEL;
  return {apiKey:apiKey||null,model};
}

// Server-side call. The key is sent only in the Authorization header and never returned or logged.
export async function requestReadings({input,apiKey,model=DEFAULT_MODEL,fetchImpl=globalThis.fetch,timeoutMs=60000}){
  const checked=validateMarkInput(input);
  const response=await fetchImpl(TOKEN_FACTORY_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},
    body:JSON.stringify({model,messages:buildMessages(checked),temperature:0.2,max_tokens:2000}),
    signal:AbortSignal.timeout(timeoutMs),
  });
  if(!response.ok)throw Object.assign(new Error("Token Factory returned HTTP "+response.status+"."),{status:502});
  const body=await response.json();
  const readings=parseReadings(body?.choices?.[0]?.message?.content);
  return {model,readings,checkedBy:"Each rule is tested by the app's evaluator against the entered observations."};
}
