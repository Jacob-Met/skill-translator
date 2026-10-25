import {createCuePractice} from '../../src/cue-practice.mjs';
// Maximum admitted authored/learner text and all 24 selected steps.
export function maximumCuePractice(input){
const source=structuredClone(input);
source.context='Authored control '.padEnd(2400,'x');source.steps=Array.from({length:24},(_,i)=>({...source.steps[0],id:`step-${i}`,intent:'Intent '.padEnd(1800,'i'),visibleChange:'Visible '.padEnd(1800,'v'),sensoryCue:'Sensory '.padEnd(1800,'s'),recoveryCue:'Recovery '.padEnd(1800,'r')}));
const raw=createCuePractice(source);for(const [i,s]of source.steps.entries()){raw.events.push({type:'request-cue',stepId:s.id,field:'sensoryCue'},{type:'request-cue',stepId:s.id,field:'recoveryCue'},{type:'answer',stepId:s.id,response:{expectedChange:'Expected '.padEnd(1200,'e'),cue:'Cue '.padEnd(1200,'c'),recovery:'Recovery '.padEnd(1200,'r'),uncertain:true}},{type:'reveal',stepId:s.id},{type:'reflect',stepId:s.id,comparison:'unsure',note:'Note '.padEnd(1600,'n'),reconsideration:{anchors:['sensoryCue'],judgment:'Judgment '.padEnd(1600,'j'),question:'Question '.padEnd(1600,'q')}});if(i<23)raw.events.push({type:'advance',stepId:s.id});}
return {source,practice:raw};
}
