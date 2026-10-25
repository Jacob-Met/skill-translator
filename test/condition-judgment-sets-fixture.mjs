import {raw} from './condition-outcomes-fixture.mjs';
import {CONDITION_OUTCOMES_FORMAT} from '../src/condition-outcomes.mjs';
const marks=points=>points.map(([xMm,yMm],i)=>({id:'m'+i,xMm,yMm}));
export function makeStudy(kind='complementary'){
 const s={format:CONDITION_OUTCOMES_FORMAT,conditions:structuredClone(raw),includePointScore:false,judgments:['acceptable','unacceptable','unknown','unknown'].map((outcome,i)=>({round:i+1,outcome,basis:'Authored isolated judgment-set control'}))};
 s.conditions.session.history[1].attempts=marks([[29,50],[50,50],[50,71]]);
 s.conditions.session.history[2].attempts=marks([[20,50],[50,50],[50,71]]);
 s.conditions.session.attempts=marks([[29,50],[50,50],[50,80]]);
 if(kind==='missing-geometry')s.conditions.session.attempts.pop();
 else if(kind==='repeated-evidence')s.conditions.session.attempts=structuredClone(s.conditions.session.history[2].attempts);
 else if(kind==='no-contrast')s.judgments[1].outcome='unknown';
 else if(kind==='empty-family'){s.judgments[0].outcome='unacceptable';s.judgments[1].outcome='acceptable';}
 else if(kind==='all-judged'){s.judgments[2].outcome='acceptable';s.judgments[3].outcome='unacceptable';}
 else if(kind!=='complementary')throw Error('Unknown fixture');
 return s;
}
