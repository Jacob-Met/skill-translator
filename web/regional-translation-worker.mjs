import {inspectVisualScan} from '/src/visual-scan.mjs';
import {compareRegionalTranslations} from '/src/regional-translation.mjs';
self.onmessage=({data})=>{
  try{
    const scan=inspectVisualScan(data.plan,data.samples);
    if(scan.plan.sampleCount!==2||scan.intervals.length!==1)throw Error('Regional inspection requires one original adjacent pair.');
    const interval=scan.intervals[0];
    if(interval.status!=='compared')throw Error(`Original pair is unavailable: ${interval.status}.`);
    self.postMessage({type:'result',result:compareRegionalTranslations(data.samples[0],data.samples[1],{radius:16})});
  }catch(error){self.postMessage({type:'error',message:String(error.message||error)});}
};
