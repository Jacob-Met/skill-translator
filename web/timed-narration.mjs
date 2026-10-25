import {createNarration,importNarration,narrationForStep,selectNarration,deriveNarratedSequence,parseNarration,MAX_TRANSCRIPT_BYTES} from '/src/timed-narration.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id);
let accepted=null,study=null,transcript=null,revision=0,pending=false;
const status=text=>{$('status').textContent=text;};
function dirty(){revision++;pending=true;$('pair').disabled=!accepted||transcript===null;for(const id of ['select','save','export'])$(id).disabled=true;if(study)status('Narration settings have an unpaired draft. Pair them to replace the accepted account; the displayed account is unchanged.');}
for(const id of ['attribution','offset'])$(id).addEventListener('input',dirty);
async function receive(id,limit,operation){
 const file=$(id).files[0];if(!file)return;const version=++revision;
 try{if(file.size>limit)throw Error('The selected file exceeds the input limit.');await operation(file,version);}
 catch(error){if(version===revision)status('Import refused: '+error.message);}
}
$('source').onchange=()=>receive('source',48*1024*1024,async(file,version)=>{
 const next=await readSequenceBundle(file);
 if(version!==revision){releaseSequenceAssets(next.assets);return;}
 if(accepted)releaseSequenceAssets(accepted.assets);
 accepted=next;study=null;transcript=null;pending=false;$('transcript').value='';$('work').hidden=true;$('pair').disabled=true;
 status('Original sequence frames verified. Choose the supplied transcript.');
});
$('transcript').onchange=()=>receive('transcript',MAX_TRANSCRIPT_BYTES,async(file,version)=>{
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());if(version!==revision)return;parseNarration(text);
 transcript=text;dirty();status('Transcript read. Confirm its attribution and timing offset, then pair.');
});
$('pair').onclick=()=>{revision++;try{
 if(!accepted||transcript===null)throw Error('Open a sequence and transcript first.');
 if(!$('offset').value.trim())throw Error('Declare a timing offset, including zero.');
 const next=createNarration(accepted.sequence,{text:transcript,attribution:$('attribution').value,offsetSeconds:Number($('offset').value)});
 study=next;pending=false;render(true);status('Supplied narration paired. Inspect the overlap before choosing quotes.');
}catch(error){status('Pairing refused: '+error.message);}};
$('open').onchange=()=>receive('open',4*1024*1024,async(file,version)=>{
 if(!accepted)throw Error('Pair the original demonstration first.');
 const raw=JSON.parse(await file.text());if(version!==revision)return;
 const next=importNarration(accepted.sequence,raw);if(version!==revision)return;
 study=next;transcript=study.transcript;pending=false;$('attribution').value=study.attribution;$('offset').value=study.offsetSeconds;$('pair').disabled=false;
 render(true);status('Narration reopened against the unchanged original sequence.');
});
for(const id of ['step','field'])$(id).onchange=()=>{revision++;render();};
function render(reset=false){
 if(!study)return;$('work').hidden=false;$('title').textContent=study.source.title;
 if(reset)$('step').replaceChildren(...study.source.steps.map(s=>new Option(s.title,s.id)));
 const stepId=$('step').value;
 for(const id of ['select','save','export'])$(id).disabled=pending;
 if(!stepId){$('range').textContent='Author a before/after step in the studio first.';$('frames').replaceChildren();$('cues').replaceChildren();$('select').disabled=true;$('export').disabled=true;return;}
 const found=narrationForStep(study,stepId),field=$('field').value;
 $('range').textContent='Presented source interval: '+found.startSeconds+'–'+found.endSeconds+' seconds (half-open).';
 $('frames').replaceChildren(...['before','after'].map(role=>{
  const m=study.source.moments.find(m=>m.id===found.step[role+'MomentId']),fig=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
  img.src=accepted.assets.get(m.id).media.url;img.alt=m.label;caption.textContent=role+': '+m.label+' · '+m.origin.mediaTimeSeconds+' s';fig.append(img,caption);return fig;
 }));
 $('account').replaceChildren(...[['intent','Intended result'],['visibleChange','Visible change'],['sensoryCue','Supplied sensory cue'],['recoveryCue','Recovery account']].flatMap(([key,label])=>{const name=document.createElement('dt'),value=document.createElement('dd');name.textContent=label;value.textContent=found.step[key]||'Not supplied';return [name,value];}));
 $('alignment').textContent='Offset '+study.offsetSeconds+' s. '+found.cues.length+' overlapping cue(s). '+found.outsideClip.length+' cue(s) extend outside the clip; nothing is silently clipped. Overlap does not establish that speech describes this action.';
 const selected=study.selections.find(s=>s.stepId===stepId&&s.field===field)?.cueIndices||[];
 $('cues').replaceChildren(...found.cues.map(c=>{
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=c.index;input.checked=selected.includes(c.index);input.onchange=()=>{revision++;$('save').disabled=true;$('export').disabled=true;status('Quote choices are a draft. Retain this explicit selection before saving.');};
  label.append(input,document.createTextNode('Transcript '+c.startSeconds+'–'+c.endSeconds+' s → clip '+c.alignedStartSeconds+'–'+c.alignedEndSeconds+' s\n'+c.text));return label;
 }));
 if(!found.cues.length)$('cues').textContent='No supplied narration overlaps this interval. Silence is not an inferred sensory cue.';
 const proposed=deriveNarratedSequence(study).steps.find(s=>s.id===stepId);
 $('preview').textContent=proposed[field]||'No account supplied for this field.';
 $('selections').textContent=study.selections.length+' explicit step/field selection(s) retained.';
}
$('select').onclick=()=>{revision++;try{
 if(pending)throw Error('Pair the changed narration settings first.');
 const indices=[...$('cues').querySelectorAll('input:checked')].map(x=>Number(x.value));
 study=selectNarration(accepted.sequence,study,{stepId:$('step').value,field:$('field').value,cueIndices:indices});
 render();status('Explicit selection retained. Original notes remain unchanged.');
}catch(error){status('Selection refused: '+error.message);}};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('save').onclick=()=>{if(study&&!pending){const blob=new Blob([JSON.stringify(study,null,2)],{type:'application/json'});if(blob.size>4*1024*1024){status('Save refused: the narration record exceeds the 4 MiB reopen limit.');return;}download(blob,'timed-narration.json');}};
$('export').onclick=async()=>{
 if(pending)return;const version=++revision;try{
 const sequence=deriveNarratedSequence(study),blob=await makeSequenceBundle(sequence,accepted.assets);
 if(version!==revision)return;download(blob,'narrated-sequence.json');status('Separate narrated sequence saved. Keep the original and narration record.');
 }catch(error){if(version===revision)status('Export refused: '+error.message);}
};
