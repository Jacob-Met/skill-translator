import {importNarration,narrationForStep} from './timed-narration.mjs';
export function narrationPlaybackRange(raw,stepId,cueIndex){
 const study=importNarration(raw?.source,raw);
 if(!Number.isInteger(cueIndex))throw Error('Choose an original narration cue.');
 const cue=narrationForStep(study,stepId).cues.find(c=>c.index===cueIndex);
 if(!cue)throw Error('Choose a cue overlapping the selected original step.');
 const startSeconds=cue.alignedStartSeconds,endSeconds=cue.alignedEndSeconds;
 if(!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds)||startSeconds<0||endSeconds<=startSeconds||endSeconds>study.source.clip.durationSeconds)throw Error('The complete mapped utterance interval must lie inside the original clip; it is not clipped.');
 return {startSeconds,endSeconds,cueIndex:cue.index,stepId,transcriptStartSeconds:cue.startSeconds,transcriptEndSeconds:cue.endSeconds,text:cue.text,extrapolated:cue.extrapolated===true};
}
