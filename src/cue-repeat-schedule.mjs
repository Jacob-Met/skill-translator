import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';
import {fixedSchedule} from './cue-fixed-schedule-core.mjs';
export function planRepeatedCueReadings(raw,inputs,planning){
 if(!planning||typeof planning!=='object'||Array.isArray(planning)||Object.keys(planning).sort().join(',')!=='basis,maxAdditional'||typeof planning.basis!=='string'||!planning.basis.trim()||planning.basis.length>1000||!Number.isInteger(planning.maxAdditional)||planning.maxAdditional<0||planning.maxAdditional>6)throw Error('Declare a planning basis and at most six future readings');
 const study=importCueStudy(raw),account=inspectReadingWithdrawals(study,inputs);
 const retained=account.rows.filter(r=>r.compatible).map(r=>({index:r.index,values:[...study.rows[r.index].values],decision:study.rows[r.index].decision,remaining:inputs.maxErrors-r.disagreements.length}));
 const plan=fixedSchedule(retained,study.cues.length,planning.maxAdditional);
 return {...plan,planning:structuredClone(planning),retained:retained.map(r=>({index:r.index,decision:r.decision,remaining:r.remaining})),schedule:plan.schedule?plan.schedule.map((count,i)=>({cue:study.cues[i].id,label:study.cues[i].label,count})).filter(x=>x.count):null,pairs:plan.pairs?.map(p=>({...p,left:retained[p.left].index,right:retained[p.right].index,cues:p.cues.map(i=>study.cues[i].id)})),boundary:'This is a fixed hypothetical future-reading schedule under the same declared TOTAL error bound, including all active past readings. It is not an adaptive or effort-optimal policy, a physical instruction, or an estimate of error independence or reliability. Guarantees concern represented decisions only when at least one retained example fits the complete answer sequence; outside-evidence answers remain outside evidence. Unknown source cells provide no separating distance.'};
}
