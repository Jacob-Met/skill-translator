// An offline, print-ready reading of an already source-checked Sequence Studio bundle.
// The source JSON remains the editable archive; this is a no-script presentation only.
const LIMIT=48*1024*1024, IMAGE_LIMIT=12*1024*1024, TOTAL_LIMIT=32*1024*1024;
const check=(ok,reason)=>{if(!ok)throw Error(reason);};
const abort=signal=>check(!signal?.aborted,'The lesson export was replaced.');
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const id=value=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const clock=value=>Number(value).toFixed(3)+' s';
const quoted=(name,value)=>'<dt>'+escapeHTML(name)+'</dt><dd>'+escapeHTML(value)+'</dd>';
const style=`
:root{font:16px/1.55 system-ui,sans-serif;color:#1e3027;background:#f5f8f4}
*{box-sizing:border-box}body{margin:0}main{max-width:1050px;margin:auto;padding:38px 24px}
h1{font-size:clamp(2rem,5vw,3.35rem);line-height:1.07;letter-spacing:-.04em}
h2{font-size:1.55rem;margin:36px 0 15px}h3{margin:0 0 10px}
p,dd{overflow-wrap:anywhere;white-space:pre-wrap}a{color:#166558;text-underline-offset:3px}
a:focus-visible{outline:3px solid #a77724;outline-offset:4px}
.eyebrow{font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#487667}
.lead{font-size:1.1rem}.note,.card{background:#fff;border:1px solid #cbd9d0;border-radius:12px;padding:20px;margin:15px 0}
.note{background:#eaf1e9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:16px}
.frame{margin:0;min-width:0}.frame img{display:block;width:100%;max-height:430px;object-fit:contain;background:#edf3ee;border:1px solid #d1ddd4;border-radius:8px}
dl{display:grid;grid-template-columns:160px minmax(0,1fr);gap:5px 14px;margin:16px 0}
dt{font-size:.8rem;font-weight:700;color:#4b6659}dd{margin:0 0 6px;min-width:0}
.hash{font:.72rem/1.5 ui-monospace,monospace;word-break:break-all}
.pairs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}
.pairs>div{padding:12px;background:#f1f6f2;border-radius:8px}.pairs strong,.pairs small{display:block}
.account{display:grid;grid-template-columns:160px minmax(0,1fr);gap:6px 16px}.missing{font-style:italic;color:#68736a}
footer{font-size:.8rem;color:#4a6155;padding:20px 0}
@media(max-width:600px){main{padding:22px 14px}.note,.card{padding:14px}dl,.account{grid-template-columns:1fr;gap:2px}}
@media print{:root{font:10pt/1.4 system-ui,sans-serif;color:#000;background:white}
main{padding:0;max-width:none}.card,.note{border-color:#999;break-inside:avoid}
.grid{display:block}.frame{margin-bottom:16px}.frame img{max-height:185mm}
h2{break-after:avoid}a{color:#000}header{border-bottom:2px solid #777}footer{border-top:1px solid #777}}
`;
function frameArticle(m,encoded){
 return '<article class="card frame" id="source-'+m.id+'"><h3>'+escapeHTML(m.label)+'</h3>'+
 '<img src="data:image/png;base64,'+encoded+'" alt="Original retained frame: '+escapeHTML(m.label)+'">'+
 '<p>'+escapeHTML(m.visibleState||'Visible state not supplied by the author.')+'</p><dl>'+
 quoted('Presented clock',clock(m.origin.mediaTimeSeconds))+
 quoted('Requested clock',clock(m.origin.requestedTimeSeconds))+
 '<dt>Original PNG SHA-256</dt><dd class="hash">'+m.image.sha256+'</dd></dl></article>';
}
function stepArticle(step,n,moments){
 const pair=(role,key)=>{
  const m=moments.get(step[key]);check(m,'An authored step lost its original frame.');
  return '<div><strong>'+role+': '+escapeHTML(m.label)+'</strong>'+
   '<small>Presented '+clock(m.origin.mediaTimeSeconds)+'</small>'+
   '<a href="#source-'+m.id+'">Inspect source pixels and clock</a></div>';
 };
 const account=[['Intended result',step.intent],['Visible change',step.visibleChange],
  ['Supplied sensory cue',step.sensoryCue],['Stop or recovery cue',step.recoveryCue]]
  .map(([title,value])=>'<dt>'+escapeHTML(title)+'</dt><dd'+(value?'':' class="missing"')+'>'+
  escapeHTML(value||'Not supplied by the author.')+'</dd>').join('');
 return '<section class="card" aria-labelledby="step-'+n+'"><p class="eyebrow">Step '+(n+1)+'</p>'+
  '<h3 id="step-'+n+'">'+escapeHTML(step.title)+'</h3><div class="pairs">'+
  pair('Before','beforeMomentId')+pair('After','afterMomentId')+'</div><dl class="account">'+account+'</dl></section>';
}
/** Render a source-bound, standalone HTML Blob. Caller first runs makeSequenceBundle. */
export async function makePrintableLesson(bundle,{signal}={}){
 abort(signal);check(bundle&&Number.isFinite(bundle.size)&&bundle.size>0&&bundle.size<=LIMIT,'Choose a verified Sequence Studio bundle up to 48 MB.');
 const raw=JSON.parse(await bundle.text());abort(signal);
 check(raw?.format==='skill-translator.sequence-bundle/v1','Choose a verified Sequence Studio bundle.');
 const s=raw.sequence;
 check(s&&['skill-translator.demonstration-sequence/v1','skill-translator.demonstration-sequence/v2'].includes(s.format)&&
   Array.isArray(s.moments)&&s.moments.length>=2&&s.moments.length<=12&&
   Array.isArray(s.steps)&&s.steps.length>=1&&s.steps.length<=24&&
   Array.isArray(raw.frames)&&raw.frames.length===s.moments.length,
   'The source sequence has incomplete or oversized frames or steps.');
 check(s.clip&&sha(s.clip.sha256),'The original clip identity is missing.');
 const moments=new Map();
 for(const m of s.moments){
  check(id(m?.id)&&!moments.has(m.id)&&m.image?.mimeType==='image/png'&&sha(m.image.sha256)&&
    Number.isFinite(m.origin?.mediaTimeSeconds)&&Number.isFinite(m.origin?.requestedTimeSeconds),
    'The retained original frame identity or timing is invalid.');
  moments.set(m.id,m);
 }
 const data=new Map();let total=0;
 for(const frame of raw.frames){
  abort(signal);
  check(id(frame?.momentId)&&moments.has(frame.momentId)&&!data.has(frame.momentId),
   'Source frame identifiers are missing, duplicated or changed.');
  const encoded=frame.pngBase64;
  check(typeof encoded==='string'&&encoded.length>0&&encoded.length<=Math.ceil(IMAGE_LIMIT/3)*4&&
   encoded.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(encoded),
   'An original PNG has invalid or oversized encoded bytes.');
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));total+=bytes.length;
  check(bytes.length<=IMAGE_LIMIT&&total<=TOTAL_LIMIT&&bytes.length>24&&
   [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n),
   'An original PNG has invalid bytes or exceeds the 32 MB source budget.');
  const digest=await crypto.subtle.digest('SHA-256',bytes);abort(signal);
  const actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  check(actual===moments.get(frame.momentId).image.sha256,
    'An original PNG no longer matches its verified source hash.');
  data.set(frame.momentId,encoded);
 }
 const steps=s.steps.map((step,i)=>stepArticle(step,i,moments)).join('');
 const gallery=s.moments.map(m=>frameArticle(m,data.get(m.id))).join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'+
  '<title>'+escapeHTML(s.title)+' · Skill Translator lesson</title><style>'+style+'</style></head><body>'+
  '<main><header><p class="eyebrow">Skill Translator · Evidence-grounded lesson</p><h1>'+escapeHTML(s.title)+'</h1>'+
  '<p class="lead">'+escapeHTML(s.context||'Author context not supplied.')+'</p>'+
  '<p class="note">Original retained pixels and browser-presented times are evidence; intentions, sensations, advice and outcomes are the author\'s account. This does not establish action causality, physical success or learner mastery. The original video remains separate.</p></header>'+
  '<section class="card"><h2>Original clip identity</h2><dl>'+
  quoted('Name',s.clip.name)+quoted('Type',s.clip.mimeType)+
  quoted('Duration',clock(s.clip.durationSeconds))+quoted('Size',s.clip.sizeBytes+' bytes')+
  '<dt>Original clip SHA-256</dt><dd class="hash">'+s.clip.sha256+'</dd></dl>'+
  '<p>File hashes distinguish supplied bytes, not recording authenticity. Save the separate editable Sequence Studio JSON to revise this lesson.</p></section>'+
  '<section aria-labelledby="steps"><h2 id="steps">Authored steps</h2>'+steps+'</section>'+
  '<section aria-labelledby="frames"><h2 id="frames">All retained original frames</h2>'+
  '<p>Every retained PNG appears once, including unassigned moments. Original PNG hashes were checked again during export. Requested and browser-presented times can differ.</p>'+
  '<div class="grid">'+gallery+'</div></section>'+
  '<footer>Prepared locally; this standalone page contains no scripts or external assets. It can be read or printed without network access.</footer></main></body></html>';
 abort(signal);return new Blob([html],{type:'text/html;charset=utf-8'});
}
