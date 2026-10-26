import {inspectSpatialCorrespondence,createReviewedSpatialMapping,importReviewedSpatialMapping,REVIEWED_SPATIAL_MAPPING_FORMAT,REVIEWED_SCALED_SPATIAL_MAPPING_FORMAT,REVIEWED_AXIS_SPATIAL_MAPPING_FORMAT,REVIEWED_INJECTIVE_SPATIAL_MAPPING_FORMAT} from '../src/spatial-correspondence.mjs';
import {discoveryFromReviewedSpatialMapping} from '../src/relationship-discovery.mjs';
const reviewedFormats=[REVIEWED_SPATIAL_MAPPING_FORMAT,REVIEWED_SCALED_SPATIAL_MAPPING_FORMAT,REVIEWED_AXIS_SPATIAL_MAPPING_FORMAT,REVIEWED_INJECTIVE_SPATIAL_MAPPING_FORMAT];
self.onmessage=({data})=>{
 try{
  let value;
  if(data.kind==='inspect')value={result:inspectSpatialCorrespondence(data.raw),reviewed:false};
  else if(data.kind==='reopen'){
   if(reviewedFormats.includes(data.raw?.format)){const record=importReviewedSpatialMapping(data.raw);value={result:inspectSpatialCorrespondence(record.study),reviewed:true,sourceEvidenceClass:record.sourceEvidenceClass};}
   else value={result:inspectSpatialCorrespondence(data.raw),reviewed:false};
  }else if(data.kind==='review'||data.kind==='discovery'){
   const record=createReviewedSpatialMapping(data.raw,{semanticCorrespondenceConfirmed:data.semanticCorrespondenceConfirmed,sourceEvidenceClass:data.sourceEvidenceClass});
   value=data.kind==='review'?record:discoveryFromReviewedSpatialMapping(record,{deviationMm:record.study.deviationMm,evidenceClass:data.sourceEvidenceClass});
  }else throw Error('Unknown correspondence operation');
  self.postMessage({revision:data.revision,value});
 }catch(error){self.postMessage({revision:data.revision,error:error.message});}
};
