import {inspectRawRuleProposals,importRawRuleProposal,RAW_RULE_PROPOSAL_FORMAT} from '../src/raw-rule-proposals.mjs';
import {inspectDemonstrationPractice,exportDemonstrationPractice,importDemonstrationPractice,DEMONSTRATION_PRACTICE_FORMAT} from '../src/demonstration-practice.mjs';
import {createRawChallengeImage} from './raw-challenge-image.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
let account=null,result=null,generation=0,inspection='reference';
const status=t=>{$('status').textContent=t;};
const selected=()=>!account?null:inspection==='reference'?{annotation:account.referenceStudy.source,landmarkId:account.referenceStudy.landmarkId,label:'Original reference'}:account.demonstrations.find(d=>'extra:'+d.id===inspection);
const image=createRawChallengeImage(selected,status);
const labels={'within-all':'Within the original positional tolerance of every supported relationship at this size.','within-some':'Within some supported relationships, outside others. The evidence does not select between them.','within-none':'Outside the original positional tolerance for every supported relationship.','missing-placement':'This round has no retained placement for the selected mark.','no-supported-relationship':'No relationship remains supported by the demonstration account; no conditional assessment is available.','unavailable-target':'At least one supported relationship cannot form a target at this size. No complete comparison is asserted.'};
function showRound(){
 if(!result)return;const r=result.rounds.find(r=>r.round===Number($('round').value));if(!r)return;
 $('verdict').textContent=labels[r.status];$('verdict').dataset.state=r.status;
 const original=r.originalScore.results.find(m=>m.id===result.landmarkId);
 $('original-score').textContent=`Retained practice basis: ${result.practiceBasis}. Original selected-mark score: ${!original.placed?'missing':original.evaluation.within?'within tolerance':'outside tolerance'}. Original complete-task score: ${!r.originalScore.complete?'incomplete':r.originalScore.passed?'within all tolerances':'needs adjustment'}. Original tolerance: ${result.toleranceMm} mm.`;
 $('alternatives').replaceChildren(...r.alternatives.map(a=>node('p',`${a.rule}: ${a.predicted?`target (${a.predicted.xMm.toFixed(3)}, ${a.predicted.yMm.toFixed(3)}) mm; ${a.evaluation?`${a.evaluation.within?'within':'outside'}, error ${a.evaluation.errorMm.toFixed(3)} mm`:'no retained placement'}`:a.reason}`)));
 $('boundary').textContent=result.boundary;
 const map=$('comparison-map');map.replaceChildren();const svg=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;map.append(e);};
 const {widthMm,heightMm}=result.session.reference.target,scale=Math.min(560/widthMm,260/heightMm),left=(640-widthMm*scale)/2,top=(360-heightMm*scale)/2,p=v=>({x:left+v.xMm*scale,y:top+v.yMm*scale});
 svg('rect',{x:left,y:top,width:widthMm*scale,height:heightMm*scale,fill:'#edf3ec',stroke:'#214e3d'});svg('text',{x:25,y:25,fill:'#17312f'},`${widthMm} × ${heightMm} mm · round ${r.round}`);
 r.alternatives.forEach((a,i)=>{if(!a.predicted)return;const q=p(a.predicted);svg('circle',{cx:q.x,cy:q.y,r:8,fill:'none',stroke:'#9c7c24','stroke-width':2});});
 if(r.actual){const q=p(r.actual);svg('circle',{cx:q.x,cy:q.y,r:5,fill:'#207a63'});}
}
function render(){
 $('workspace').hidden=!account;$('session-file').disabled=!account;$('comparison').hidden=!result;
 if(!account)return;
 $('inspection').replaceChildren(...[{id:'reference',label:'Original reference'},...account.demonstrations.map(d=>({...d,id:'extra:'+d.id}))].map(d=>{const o=node('option',d.label);o.value=d.id;return o;}));$('inspection').value=inspection;image.draw();
 if(result){$('round').replaceChildren(...result.rounds.map(r=>{const o=node('option','Round '+r.round);o.value=r.round;return o;}));$('round').value=result.session.round;showRound();}
}
function install(nextAccount,nextResult){generation++;image.release();account=nextAccount;result=nextResult;inspection='reference';render();}
async function file(event,receive){const input=event.target,f=input.files[0],token=++generation;try{if(!f||f.size>2_000_000)throw Error('Choose a complete JSON account of at most 2 MB.');const raw=JSON.parse(await f.text());if(token!==generation)return;receive(raw);}catch(e){if(token===generation)status('Import refused; previous accepted evidence retained. '+e.message);}finally{input.value='';}}
$('account-file').onchange=event=>file(event,raw=>{if(raw.format===DEMONSTRATION_PRACTICE_FORMAT){const next=importDemonstrationPractice(raw);install(next.account,next);status('Source-only comparison reopened; all conditional and original scores recomputed.');}else{const next=inspectRawRuleProposals(raw?.format===RAW_RULE_PROPOSAL_FORMAT?importRawRuleProposal(raw).account:raw);install(next.account,null);status('Original demonstration account accepted. Receive its actual practice session.');}});
$('session-file').onchange=event=>file(event,raw=>{if(!account)throw Error('Open demonstrations first.');const next=inspectDemonstrationPractice(account,raw);install(next.account,next);status('Actual retained session accepted. Original scores and all conditional alternatives remain separate.');});
$('inspection').onchange=()=>{inspection=$('inspection').value;image.release();image.draw();};$('round').onchange=showRound;
$('save').onclick=()=>{if(!result)return;try{const raw=exportDemonstrationPractice(account,result.session),bytes=JSON.stringify(raw);if(new TextEncoder().encode(bytes).length>2_000_000)throw Error('Complete comparison exceeds 2 MB; no source was discarded.');const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'})),a=node('a','');a.href=url;a.download='skill-demonstration-practice.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status('Save refused: '+e.message);}};
