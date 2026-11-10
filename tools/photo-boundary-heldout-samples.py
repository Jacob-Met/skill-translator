"""Extract the frozen 90-frame SmartDoc held-out schedule, without outcome filtering."""
import argparse,pathlib,json,hashlib,xml.etree.ElementTree as ET
import cv2
p=argparse.ArgumentParser();p.add_argument('dataset',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--model-index',type=int,choices=[1,2,3],default=1);a=p.parse_args()
a.output.mkdir(parents=True,exist_ok=True);samples=[];clips=[]
for background in range(1,6):
 for model in ['datasheet','letter','magazine','paper','patent','tax']:
  video=a.dataset/f'background{background:02d}'/f'{model}{a.model_index:03d}.avi';xml=video.with_suffix('.gt.xml')
  root=ET.parse(xml).getroot();truth={int(f.attrib['index']):f for f in root.findall('./segmentation_results/frame')}
  first,last=min(truth),max(truth);indices=[round(first+f*(last-first))for f in [.25,.5,.75]]
  cap=cv2.VideoCapture(str(video));frame=0;selected=[]
  while True:
   ok,raster=cap.read()
   if not ok:break
   frame+=1
   if frame not in indices:continue
   name=f'{video.parent.name}-{video.stem}-frame-{frame:04d}.png';assert cv2.imwrite(str(a.output/name),raster)
   entry=truth[frame];coords={q.attrib['name']:[float(q.attrib['x']),float(q.attrib['y'])]for q in entry.findall('point')}
   samples.append({'file':name,'source_video':f'{video.parent.name}/{video.name}','frame_index':frame,'width':raster.shape[1],'height':raster.shape[0],'sha256':hashlib.sha256((a.output/name).read_bytes()).hexdigest(),'rejected':entry.attrib['rejected']=='true','corners':[coords[k]for k in ['tl','tr','br','bl']]if coords else[],'object_shape':root.find('object_shape').attrib})
   selected.append(frame)
  cap.release();assert selected==indices,(video,indices,selected);assert frame==last,(video,frame,last)
  clips.append({'file':f'{video.parent.name}/{video.name}','frames':frame,'selected':indices,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'annotation_sha256':hashlib.sha256(xml.read_bytes()).hexdigest()})
  print(json.dumps(clips[-1]),flush=True)
assert len(samples)==90
manifest={'dataset':'SmartDoc2015 Challenge1 original test dataset','source':'https://zenodo.org/records/1230218','archive_sha256':'31345cef623673fa6324f939e70b6f001a0d3d0539b08dbe8b222f0bccdca640','license':'CC BY 4.0','selection':f'Frozen before extraction: model{a.model_index:03d} of datasheet,letter,magazine,paper,patent,tax across five backgrounds;25%,50%,75% of annotated frame index span rounded to 1-indexed frame; no outcome filtering.','ground_truth_use':'Evaluation only; coordinates and rejection not passed to detector or baselines. Frame index range schedules decoding only.','geometry_notice':'Author reformatted metadata specifies0.1mm/unit for2100x2970; evaluation uses ratios and image pixels, not physical accuracy.','clips':clips,'samples':samples}
(a.output/'ground-truth.json').write_text(json.dumps(manifest,indent=2));print('EXTRACTED',len(samples),'REFERENCE_REJECTED',sum(s['rejected']for s in samples))
