"""Score retained proposals after inference, using SmartDoc labels only here."""
import argparse,pathlib,json,itertools,math
import cv2,numpy as np
p=argparse.ArgumentParser();p.add_argument('truth',type=pathlib.Path);p.add_argument('proposals',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
truth=json.loads(a.truth.read_text());pred=json.loads(a.proposals.read_text());lookup={r['file']:r for r in pred['reports']};rows=[]
def metrics(corners,gt,ratio):
 c=np.asarray(corners,np.float32);g=np.asarray(gt,np.float32)
 rms=min(float(np.sqrt(np.mean(np.sum((np.roll(x,s,axis=0)-g)**2,axis=1))))for x in [c,c[::-1]]for s in range(4))
 rect=np.array([[0,0],[1,0],[1,ratio],[0,ratio]],np.float32);H=cv2.getPerspectiveTransform(g,rect);hom=np.c_[c,np.ones(4)]@H.T
 z=hom[:,2];valid=np.all(z>1e-9)or np.all(z<-1e-9)
 if not valid:return {'rectified_iou':0,'corner_rms_px':rms,'projection':'crosses reference horizon'}
 poly=(hom[:,:2]/z[:,None]).astype(np.float32)
 if not cv2.isContourConvex(poly):return {'rectified_iou':0,'corner_rms_px':rms,'projection':'not convex after reference transform'}
 inter=float(cv2.intersectConvexConvex(poly,rect)[0]);area=abs(float(cv2.contourArea(poly)));union=area+ratio-inter
 return {'rectified_iou':max(0,min(1,inter/union)) if union>0 else 0,'corner_rms_px':rms,'projection':'finite convex'}
for s in truth['samples']:
 r=lookup[s['file']];assert r['sha256']==s['sha256'];
 if s['rejected']:
  rows.append({'file':s['file'],'source_video':s['source_video'],'count':len(r['candidates']),'reference':'rejected','top':None,'best':None,'candidates':[]});continue
 ratio=float(s['object_shape']['height'])/float(s['object_shape']['width'])
 values=[metrics(c['corners'],s['corners'],ratio)for c in r['candidates']]
 best=max(values,key=lambda x:x['rectified_iou'])if values else None
 visible=all(0<=q[0]<s['width'] and 0<=q[1]<s['height'] for q in s['corners'])
 rows.append({'file':s['file'],'source_video':s['source_video'],'reference':'inside image'if visible else'clipped','count':len(values),'top':values[0]if values else None,'best':best,'candidates':values})
def summary(rs):
 rejected=[r for r in rs if r.get('reference')=='rejected'];rs=[r for r in rs if r.get('reference')!='rejected']
 if not rs:return {'frames':0,'reference_rejected':len(rejected),'rejected_with_proposal':sum(r['count']>0 for r in rejected)}
 return {'frames':len(rs),'reference_rejected':len(rejected),'rejected_with_proposal':sum(r['count']>0 for r in rejected),'no_proposal':sum(r['count']==0 for r in rs),'top_iou_at_least_0_9':sum(bool(r['top'])and r['top']['rectified_iou']>=.9 for r in rs),'any_candidate_iou_at_least_0_9':sum(bool(r['best'])and r['best']['rectified_iou']>=.9 for r in rs),'mean_top_iou_omissions_zero':float(np.mean([r['top']['rectified_iou']if r['top']else 0 for r in rs])),'mean_best_iou_omissions_zero':float(np.mean([r['best']['rectified_iou']if r['best']else 0 for r in rs]))}
result={'source':str(a.proposals),'score':'Document-reference IoU via ground-truth homography; no-proposal=0. Best candidate is oracle inclusion only, not automatic choice. Corner RMS uses best cyclic/reversed label assignment, in original pixels. No physical metrology claim.','summary':summary(rows),'by_reference':{k:summary([r for r in rows if r.get('reference')==k])for k in ['inside image','clipped','rejected']},'by_clip':{k:summary([r for r in rows if r['source_video']==k])for k in sorted(set(r['source_video']for r in rows))},'frames':rows}
a.output.write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items()if k!='frames'},indent=2))
