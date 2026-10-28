import {createHash} from 'node:crypto';
import {numeric,withTarget} from './fixture.mjs';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQiqoAAAGWAPVeoDwVAAAAAElFTkSuQmCC';
const hash=createHash('sha256').update(Buffer.from(png,'base64')).digest('hex');
export function producerExport(values,{trace=false}={}){
 const study=withTarget(numeric(values,['A','B','B']),[0,1]);
 for(const ex of [...study.comparison.examples,study.target])for(const m of ex.source.moments){Object.assign(m.image,{sha256:hash,widthPx:1,heightPx:1});Object.assign(m.origin,{frameSha256:hash,widthPx:1,heightPx:1,decodedWidthPx:1,decodedHeightPx:1});}
 const bundle=source=>({format:'skill-translator.sequence-bundle/v1',sequence:structuredClone(source),frames:source.moments.map(m=>({momentId:m.id,pngBase64:png})),findings:{note:'Original authored producer account'}});
 if(trace){study.format='skill-translator.numeric-cue-thresholds/v2';for(const [i,row]of study.rows.entries()){const source=study.comparison.examples[i].source;row.reading=null;row.traceReading={momentId:'moment-1',sampleIndex:0,uncertainty:{below:0,above:0,basis:'Authored exact control'},timingBasis:'Authored common clock',trace:{format:'skill-translator.instrument-trace/v1',source:structuredClone(source),instrument:{name:'Authored trace',quantity:study.quantity,unit:study.unit,calibrationBasis:'Authored'},evidenceClass:'authored-example',samples:[{timeSeconds:1,value:values[i]},{timeSeconds:2,value:values[i]}],clock:{anchors:[{instrumentSeconds:0,clipSeconds:0},{instrumentSeconds:9,clipSeconds:9}],verification:{instrumentSeconds:5,clipSeconds:5},toleranceSeconds:0,basis:'Authored identity clock'},settings:{threshold:0,direction:'at-or-above',maximumGapSeconds:2,minimumSamples:2}}};}}
 return {format:`skill-translator.numeric-cue-bundle/${trace?'v2':'v1'}`,study,comparison:{format:'skill-translator.decision-comparison-bundle/v1',study:structuredClone(study.comparison),sources:study.comparison.examples.map(e=>bundle(e.source))},target:bundle(study.target.source)};
}
