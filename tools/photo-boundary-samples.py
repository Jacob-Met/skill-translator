"""Extract a fixed, label-independent frame schedule from SmartDoc Challenge 1's development kit."""
import argparse, pathlib, json, hashlib, xml.etree.ElementTree as ET
import cv2
p=argparse.ArgumentParser();p.add_argument('sample_root',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--per-clip',type=int,default=9);a=p.parse_args()
a.output.mkdir(parents=True,exist_ok=True);samples=[];clips=[]
for video in sorted((a.sample_root/'input_sample/background00').glob('*.avi')):
 root=ET.parse(a.sample_root/'input_sample_groundtruth/background00_gt'/f'{video.stem}.gt.xml').getroot()
 truth={int(f.attrib['index']):f for f in root.findall('./segmentation_results/frame')}
 indices=sorted(set(round(1+i*(max(truth)-1)/(a.per_clip-1)) for i in range(a.per_clip)))
 cap=cv2.VideoCapture(str(video));frame=0;selected=[]
 while True:
  ok,raster=cap.read()
  if not ok:break
  frame+=1
  if frame not in indices:continue
  name=f'{video.stem}-frame-{frame:04d}.png';cv2.imwrite(str(a.output/name),raster)
  entry=truth[frame];coords={q.attrib['name']:[float(q.attrib['x']),float(q.attrib['y'])] for q in entry.findall('point')}
  samples.append({'file':name,'source_video':video.name,'frame_index':frame,'width':raster.shape[1],'height':raster.shape[0],'sha256':hashlib.sha256((a.output/name).read_bytes()).hexdigest(),'rejected':entry.attrib['rejected']=='true','corners':[coords[k]for k in ['tl','tr','br','bl']],'object_shape':root.find('object_shape').attrib})
  selected.append(frame)
 cap.release();assert selected==indices,(video.name,indices,selected);assert frame==max(truth),(video.name,frame,max(truth))
 clips.append({'file':video.name,'frames':frame,'selected':indices,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()})
manifest={'dataset':'SmartDoc2015 Challenge1 original development kit','source':'https://zenodo.org/records/1230218','archive_sha256':'90d1a64f476ffe290ebbddf4337e108d471b9c25420551223f447db972844a9a','license':'CC BY 4.0','selection':'9 evenly spaced 1-indexed frames per clip, chosen before running the detector; fixed schedule, no image inspection filtering','ground_truth_use':'Evaluation only; not passed to detector or baseline','geometry_notice':'A4 nominal paper; original kit README says mm for2100x2970 while author reformatted metadata specifies0.1mm/unit. Evaluation uses geometry ratios/pixels, not physical metrology.','clips':clips,'samples':samples}
(a.output/'ground-truth.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'clips':clips,'samples':len(samples),'output':str(a.output)}))
