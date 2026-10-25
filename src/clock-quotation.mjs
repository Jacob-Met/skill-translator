import {importNarrationNavigation,narrationNavigationSource,CLOCK_NAVIGATION_FORMAT} from './narration-moments.mjs';
import {createClockNarration,createNarration} from './timed-narration.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
export function narrationFromNavigation(sequence,raw){
 const source=validateSequence(sequence),navigation=importNarrationNavigation(raw,source.clip);
 const original=narrationNavigationSource(navigation);
 if(original.source.moments.length||original.source.steps.length||original.selections.length)throw Error('This file contains an authored narration account. Use Reopen saved narration with its exact original sequence; choose a studio navigation record here.');
 const details={text:original.transcript,attribution:original.attribution,offsetSeconds:original.offsetSeconds};
 return navigation.format===CLOCK_NAVIGATION_FORMAT?createClockNarration(source,{...details,clock:navigation.clock}):createNarration(source,details);
}
