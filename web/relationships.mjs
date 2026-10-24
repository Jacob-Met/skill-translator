import {demonstration} from '/src/demo.mjs';
import {createPractice,placePractice,evaluatePractice,retryPractice} from '/src/practice.mjs';
import {createRelationshipReview,importRelationshipReview,reviewRounds,applyRelationshipSession} from '/src/task-relationships.mjs';
const $=id=>document.getElementById(id);
let state=null,epoch=0,serial=0;
const status=text=>{$('status').textContent=text;};
const number=n=>n===null?'Missing':n.toFixed(3);
function options(element,items,selected){element.replaceChildren();for(const [value,label] of items){const option=document.createElement('option');option.value=value;option.textContent=label;element.append(option);}if(selected!==undefined)element.value=selected;}
function accept(next){state=next;options($('from'),state.source.landmarks.map(m=>[m.id,m.label]));options($('to'),state.source.landmarks.map(m=>[m.id,m.label]));$('to').selectedIndex=Math.min(1,state.source.landmarks.length-1);options($('round'),[...state.session.history,{round:state.session.round}].map(r=>[String(r.round),'Round '+r.round]),String(state.session.round));render();}
function render(){
 $('workspace').hidden=!state;if(!state)return;
 const targetSize=state.session.reference.target;
 $('task-title').textContent=(state.source.title||'Imported task')+' · '+targetSize.widthMm+' × '+targetSize.heightMm+' mm';
 $('apply-session').disabled=state.rules.length===0;$('provenance').textContent=state.source.provenance;
 $('unknowns').textContent='Source unknowns: '+(state.source.unknowns||[]).join(' · ');
 const rounds=reviewRounds(state),round=rounds.find(r=>String(r.round)===$('round').value)||rounds.at(-1);
 $('summary').textContent='Round '+round.round+': point placement '+(round.practice.passed?'within all declared tolerances':round.practice.complete?'outside declared tolerances':'incomplete')+'. Authored relationships: '+(!round.results.length?'none declared':round.passed?'all within tolerance':round.complete?'one or more outside tolerance':'missing observations')+'.';
 const previous=$('inspect').value;options($('inspect'),state.rules.map(r=>[r.id,r.label]));if(state.rules.some(r=>r.id===previous))$('inspect').value=previous;
 $('results').replaceChildren();
 for(const r of round.results){const tr=document.createElement('tr');for(const text of [r.label+' ('+r.kind+', '+r.from+' → '+r.to+')',number(r.expectedMm),number(r.observedMm),number(r.differenceMm),number(r.toleranceMm),r.status+(r.missing.length?': '+r.missing.join(', '):'')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}const td=document.createElement('td'),button=document.createElement('button');button.textContent='Remove';button.onclick=()=>{epoch++;state=createRelationshipReview(state.source,state.session,state.rules.filter(rule=>rule.id!==r.id));render();};td.append(button);tr.append(td);$('results').append(tr);}
 draw(round);
}
function draw(round){
 const canvas=$('plot'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,640,420);ctx.fillStyle='#fff';ctx.fillRect(0,0,640,420);
 const {widthMm,heightMm}=state.session.reference.target,scale=Math.min(560/widthMm,340/heightMm),x=40,y=40;
 ctx.strokeStyle='#80958e';ctx.strokeRect(x,y,widthMm*scale,heightMm*scale);
 const rule=state.rules.find(r=>r.id===$('inspect').value);if(!rule)return;
 const pair=[rule.from,rule.to].map(id=>round.practice.results.find(r=>r.id===id));
 for(const [key,color] of [['target','#176b9c'],['attempt','#c8661a']]){const points=pair.map(p=>p[key]);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;if(points.every(Boolean)){ctx.beginPath();ctx.moveTo(x+points[0].xMm*scale,y+points[0].yMm*scale);ctx.lineTo(x+points[1].xMm*scale,y+points[1].yMm*scale);ctx.stroke();}points.forEach((p,i)=>{if(!p)return;const px=x+p.xMm*scale,py=y+p.yMm*scale;ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();ctx.font='14px system-ui';ctx.fillText((i?'To':'From')+' '+(key==='target'?'target':'observed'),Math.min(px+7,510),py+(key==='target'?-10:20));});}
}
async function read(file,limit){if(!file)throw Error('Select the required JSON file');if(file.size>limit)throw Error('JSON file exceeds the import size limit');return JSON.parse(await file.text());}
for(const id of ['source-file','session-file'])$(id).onchange=()=>{epoch++;};
$('load').onclick=async()=>{const ticket=++epoch,sourceFile=$('source-file').files[0],sessionFile=$('session-file').files[0];try{const [source,session]=await Promise.all([read(sourceFile,262144),read(sessionFile,1048576)]);if(ticket!==epoch)return;const next=createRelationshipReview(source,session);accept(next);status('Matching practice setup opened. Declare which relationship matters.');}catch(error){if(ticket===epoch)status(error.message+' Current review preserved.');}};
$('reopen').onchange=async()=>{const ticket=++epoch;try{const bundle=await read($('reopen').files[0],2097152);if(ticket!==epoch)return;const next=importRelationshipReview(bundle);accept(next);status('Review reopened; findings recomputed from retained placements.');}catch(error){if(ticket===epoch)status(error.message+' Current review preserved.');}};
$('example').onclick=()=>{epoch++;let session=createPractice(demonstration,240,160);const targets=evaluatePractice(demonstration,240,160,[]).results;for(let i=0;i<targets.length;i++)session=placePractice(demonstration,240,160,session,targets[i].id,{xMm:targets[i].target.xMm+(i===0?2:i===1?-2:0),yMm:targets[i].target.yMm});session=retryPractice(demonstration,240,160,session);accept(createRelationshipReview(demonstration,session,[{id:'authored-spacing',label:'Authored registration spacing',from:targets[0].id,to:targets[1].id,kind:'horizontal',toleranceMm:1}]));$('round').value='1';render();status('Authored control: each point is within its tolerance, but their directed separation differs by 4 mm. Round 2 retains an empty attempt.');};
$('rule-form').onsubmit=event=>{event.preventDefault();epoch++;try{let id;do{id='relationship-'+(++serial);}while(state.rules.some(r=>r.id===id));const rule={id,label:$('label').value,from:$('from').value,to:$('to').value,kind:$('kind').value,toleranceMm:Number($('tolerance').value)};state=createRelationshipReview(state.source,state.session,[...state.rules,rule]);render();status('Relationship declared. Original placements are unchanged.');}catch(error){status(error.message);}};
$('round').onchange=render;$('inspect').onchange=()=>{const r=reviewRounds(state).find(r=>String(r.round)===$('round').value);draw(r);};
$('export').onclick=()=>{try{const accepted=importRelationshipReview(state),blob=new Blob([JSON.stringify(accepted,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='task-relationship-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Review exported with source, original rounds and declared criteria.');}catch(error){status(error.message);}};

$('next-session-file').onchange=()=>{epoch++;};
$('apply-session').onclick=async()=>{
 const ticket=++epoch,previous=state,file=$('next-session-file').files[0];
 try{
  const session=await read(file,1048576);if(ticket!==epoch)return;
  const next=applyRelationshipSession(previous,session);accept(next);
  status('New session accepted with the same declared relationships. References use its displayed target size. Only the new session rounds are retained here; the prior session was not merged.');
 }catch(error){if(ticket===epoch)status(error.message+' Current review preserved.');}
};
