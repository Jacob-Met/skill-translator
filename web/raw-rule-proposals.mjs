import {inspectRawRuleProposals,createRawRuleProposal,exportRawRuleProposal,importRawRuleProposal,RAW_RULE_PROPOSAL_FORMAT} from '../src/raw-rule-proposals.mjs';
import {exportDemonstrationResponse} from '../src/response-demonstrations.mjs';
import {createPractice} from '../src/practice.mjs';
import {derive,adapt} from '../src/geometry.mjs';
import {createRawChallengeImage} from './raw-challenge-image.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const status=text=>{$('status').textContent=text;};
let account=null,findings=null,proposal=null,generation=0,inspection='reference',targetDirty=false;
const selected=()=>!account?null:inspection==='reference'?{annotation:account.referenceStudy.source,landmarkId:account.referenceStudy.landmarkId,label:'Original reference'}:account.demonstrations.find(d=>'extra:'+d.id===inspection);
const image=createRawChallengeImage(selected,status);
function drawTargets(){
 const map=$('target-map');map.replaceChildren();
 const svg=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);if(text)n.textContent=text;map.append(n);return n;};
 if(!proposal){svg('text',{x:25,y:50,fill:'#17312f'},'No complete proposed target setup is available.');return;}
 const {target}=proposal,scale=Math.min(560/target.widthMm,260/target.heightMm),left=(640-target.widthMm*scale)/2,top=(360-target.heightMm*scale)/2;
 const point=m=>({x:left+m.xMm*scale,y:top+m.yMm*scale});
 svg('rect',{x:left,y:top,width:target.widthMm*scale,height:target.heightMm*scale,fill:'#edf3ec',stroke:'#214e3d'});
 let original=null;try{original=adapt(derive(account.referenceStudy.source),target.widthMm,target.heightMm);}catch{}
 for(const mark of target.landmarks){const p=point(mark),before=original?.landmarks.find(m=>m.id===mark.id),q=before?point(before):null;
  if(q){svg('line',{x1:q.x,y1:q.y,x2:p.x,y2:p.y,stroke:'#9c7c24'});svg('circle',{cx:q.x,cy:q.y,r:7,fill:'none',stroke:'#9c7c24','stroke-width':2});}
  svg('path',{d:`M ${p.x} ${p.y-6} l 6 6 l -6 6 l -6 -6 Z`,fill:mark.id===proposal.landmarkId?'#207a63':'#72827c'});
  svg('text',{x:p.x,y:p.y-15,'text-anchor':'middle',fill:'#17312f','font-size':14},mark.label);
 }
 svg('text',{x:25,y:25,fill:'#17312f','font-size':14},`${target.widthMm} × ${target.heightMm} mm`);
 if(!original)svg('text',{x:25,y:345,fill:'#75420d','font-size':13},'Original complete setup cannot fit this target.');
}
function render(){
 $('workspace').hidden=false;$('verdict').textContent=findings.proposal?`Inferred ${findings.proposal} relationship: the sole compatible rule in this five-rule family across ${findings.response.observations.length} supplied reading(s).`:`No unique proposal: ${findings.status}. Compatible rules: ${findings.compatibleRules.join(', ')||'none'}.`;
 $('boundary').textContent=findings.boundary;
 $('target-width').value=account.referenceStudy.target.widthMm;$('target-height').value=account.referenceStudy.target.heightMm;
 $('target-result').textContent=proposal?`At ${proposal.target.widthMm} × ${proposal.target.heightMm} mm, ${proposal.landmarkId} is proposed at (${proposal.target.landmarks.find(m=>m.id===proposal.landmarkId).xMm.toFixed(3)}, ${proposal.target.landmarks.find(m=>m.id===proposal.landmarkId).yMm.toFixed(3)}) mm. Original rule: ${proposal.originalRule}.`:findings.proposal?'The inferred rule could not form a complete practice setup at this target. Original evidence remains available.':'No practice source is inferred from this account.';
 $('accept').checked=false;$('accept').disabled=!proposal;$('practice').disabled=true;$('save-proposal').disabled=!proposal;
 $('candidates').replaceChildren(...findings.candidates.map(c=>{const d=node('div','');d.append(node('h3',c.rule+' · '+c.status));for(const reading of c.readings){const o=findings.response.observations.find(o=>o.id===reading.observationId);d.append(node('p',`${o.label}: original (${o.xMm}, ${o.yMm}) mm, bounds x±${o.xBoundMm}, y±${o.yBoundMm}. ${reading.predicted?`Prediction (${reading.predicted.xMm}, ${reading.predicted.yMm}); x ${reading.xWithin?'within':'outside'}, y ${reading.yWithin?'within':'outside'}.`:reading.reason}`));}return d;}));
 $('inspection').replaceChildren(...[{id:'reference',label:'Original reference'},...account.demonstrations.map(d=>({...d,id:'extra:'+d.id}))].map(s=>{const o=node('option',s.label);o.value=s.id;return o;}));$('inspection').value=inspection;image.draw();drawTargets();
}
function install(raw){
 const next=inspectRawRuleProposals(raw);let candidate=null,error=null;
 if(next.proposal)try{candidate=createRawRuleProposal(next.account);}catch(e){error=e.message;}
 generation++;targetDirty=false;image.release();account=next.account;findings=next;proposal=candidate;inspection='reference';render();
 status(error?'Evidence accepted, but target setup unavailable: '+error:'Raw source account accepted. All coordinates and candidate support were recomputed.');
}
$('account-file').onchange=async()=>{const token=++generation,file=$('account-file').files[0];try{
 if(!file||file.size>2_000_000)throw Error('Choose a JSON account of at most2MB.');const raw=JSON.parse(await file.text());if(token!==generation)return;
 install(raw.format===RAW_RULE_PROPOSAL_FORMAT?importRawRuleProposal(raw).account:raw);
}catch(e){if(token===generation)status('Import refused; previous account retained. '+e.message);}finally{$('account-file').value='';}};
$('inspection').onchange=()=>{inspection=$('inspection').value;image.release();image.draw();};
for(const id of ['target-width','target-height'])$(id).oninput=()=>{generation++;targetDirty=true;$('accept').checked=false;$('accept').disabled=true;$('practice').disabled=true;$('save-proposal').disabled=true;status('Target edit is a draft. Compare this target to recompute the proposed setup.');};
$('apply-target').onclick=()=>{if(!account)return;generation++;try{install({...account,referenceStudy:{...account.referenceStudy,target:{widthMm:$('target-width').valueAsNumber,heightMm:$('target-height').valueAsNumber}}});}catch(e){status('Target refused; original account retained. '+e.message);}};
$('accept').onchange=()=>{$('practice').disabled=!proposal||targetDirty||!$('accept').checked;};
function download(value,name){const bytes=JSON.stringify(value);if(new TextEncoder().encode(bytes).length>2_000_000)throw Error('Complete account exceeds2MB; no source is discarded.');const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'})),a=node('a','');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save-account').onclick=()=>{if(account)download(exportDemonstrationResponse(account),'skill-original-demonstrations.json');};
$('save-proposal').onclick=()=>{if(proposal&&!targetDirty)try{download(exportRawRuleProposal(account),'skill-raw-rule-proposal.json');}catch(e){status(e.message);}};
$('practice').onclick=()=>{if(!proposal||targetDirty||!$('accept').checked)return;try{const {source,target}=proposal;createPractice(source,target.widthMm,target.heightMm);sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo:source,widthMm:target.widthMm,heightMm:target.heightMm,mirrored:false,showGoals:true}));location.assign('/practice');}catch(e){status('Practice unavailable; complete original account retained. '+e.message);}};
