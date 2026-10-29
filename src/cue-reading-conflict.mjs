import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';
/** One inclusion-minimal conflicting set, not a minimum-cardinality or truth claim. */
export function explainReadingConflict(study,inputs){
 const account=inspectReadingWithdrawals(study,inputs);
 const compatible=positions=>account.rows.filter(row=>positions.filter(i=>row.disagreements.includes(i)).length<=inputs.maxErrors).map(row=>row.index);
 const all=account.active.map((_,i)=>i);
 const boundary='This is one inclusion-minimal conflict among active supplied readings under the single declared total mismatch bound and retained examples. Removing any member permits at least one retained example. It is not necessarily the smallest conflict, does not identify a physically wrong reading, and does not recommend withdrawal. Unknown source cells are not disagreements; corrected transcripts use their current revision and withdrawn readings remain outside this active account.';
 if(account.indexes.length)return {status:'compatible-examples-remain',maxErrors:inputs.maxErrors,compatibleIndexes:[...account.indexes],certificate:null,boundary};
 let positions=[...all];
 for(const position of all){const reduced=positions.filter(i=>i!==position);if(!compatible(reduced).length)positions=reduced;}
 const member=position=>({position,...structuredClone(account.active[position])});
 return {status:'active-reading-conflict',maxErrors:inputs.maxErrors,compatibleIndexes:[],certificate:{members:positions.map(member),excludedActive:all.filter(i=>!positions.includes(i)).map(member),withdrawn:structuredClone(account.withdrawn),exampleFailures:account.rows.map(row=>({index:row.index,disagreementPositions:positions.filter(i=>row.disagreements.includes(i)),unknownPositions:positions.filter(i=>row.unknown.includes(i))})),removalWitnesses:positions.map(position=>{const remainder=positions.filter(i=>i!==position);return {removedPosition:position,removedReadingId:account.active[position].readingId,examples:account.rows.filter(row=>remainder.filter(i=>row.disagreements.includes(i)).length<=inputs.maxErrors).map(row=>({index:row.index,disagreementPositions:remainder.filter(i=>row.disagreements.includes(i)),unknownPositions:remainder.filter(i=>row.unknown.includes(i))}))};})},boundary};
}
