"""Explicit stationary fiducials: image translation, never organism tracking."""
from __future__ import annotations
import hashlib
import math
import cv2
import numpy as np


def register(frames, rois, *, search=16, min_score=.85, min_margin=.08,
             max_disagreement=1.5):
    """Match reference patches independently against each later source image.

    ROI = [left, top, width, height] in original pixels. At least two spatially
    disjoint stationary references must agree. No fallback from failure to zero.
    Integer translation only; rotation/deformation are outside this profile.
    """
    if not isinstance(frames, (list, tuple)) or not 2 <= len(frames) <= 80:
        raise ValueError('Supply 2–80 grayscale frames')
    shape = frames[0].shape if isinstance(frames[0], np.ndarray) else ()
    if len(shape) != 2 or min(shape) < 16 or max(shape) > 8192 or math.prod(shape)>16000000 or math.prod(shape)*len(frames)>32000000:
        raise ValueError('Invalid source raster')
    if any(not isinstance(f,np.ndarray) or f.dtype != np.uint8 or f.shape != shape for f in frames):
        raise ValueError('Equal-sized uint8 grayscale source frames required')
    if type(search) is not int or not 1 <= search <= 128:
        raise ValueError('Search radius must be 1–128 pixels')
    for value, low, high in [(min_score,0,1),(min_margin,0,1),(max_disagreement,0,16)]:
        if type(value) not in (int,float) or not math.isfinite(value) or not low<=value<=high:
            raise ValueError('Invalid acceptance threshold')
    if not isinstance(rois,list) or not 2<=len(rois)<=8:
        raise ValueError('Select 2–8 independent stationary fiducials')
    h,w=shape
    patches=[]
    for roi in rois:
        if not isinstance(roi,list) or len(roi)!=4 or any(type(v) is not int for v in roi):
            raise ValueError('ROI requires four integers')
        x,y,rw,rh=roi
        if min(x,y)<0 or min(rw,rh)<7 or max(rw,rh)>128 or x+rw>w or y+rh>h:
            raise ValueError('Fiducial outside raster or unsupported size')
        for a,b,c,d in rois[:len(patches)]:
            if max(a,x)<min(a+c,x+rw) and max(b,y)<min(b+d,y+rh):
                raise ValueError('Fiducial patches must not overlap')
        patch=frames[0][y:y+rh,x:x+rw]
        if float(patch.std())<5:
            raise ValueError('Reference patch has insufficient texture')
        patches.append(patch)
    records=[]
    for fi,frame in enumerate(frames):
        matches=[]
        for roi,patch in zip(rois,patches):
            x,y,rw,rh=roi
            left,top=max(0,x-search),max(0,y-search)
            right,bottom=min(w,x+rw+search),min(h,y+rh+search)
            scores=cv2.matchTemplate(frame[top:bottom,left:right],patch,cv2.TM_CCOEFF_NORMED)
            _,score,_,(px,py)=cv2.minMaxLoc(scores)
            other=scores.copy()
            other[max(0,py-1):py+2,max(0,px-1):px+2]=-1
            margin=float(score-float(other.max()))
            dx,dy=left+px-x,top+py-y
            # Boundary maxima may be truncated motion; require interior search.
            boundary=abs(dx)>=search or abs(dy)>=search
            accepted=bool(score>=min_score and margin>=min_margin and not boundary)
            matches.append({'offset':[dx,dy],'score':float(score),'margin':margin,'accepted':accepted})
        offsets=np.array([m['offset'] for m in matches],dtype=float)
        center=np.median(offsets,axis=0)
        residual=float(np.max(np.linalg.norm(offsets-center,axis=1)))
        accepted=all(m['accepted'] for m in matches) and residual<=max_disagreement
        records.append({'frame':fi,'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),
                        'accepted':accepted,'stage':center.tolist() if accepted else None,
                        'maxResidualPixels':residual,'matches':matches})
    return {'format':'microverse-fiducial-translation/v1','width':w,'height':h,
            'opencv':cv2.__version__,'referenceFrame':0,'rois':[r[:] for r in rois],
            'settings':{'search':search,'minScore':min_score,'minMargin':min_margin,
                        'maxDisagreement':max_disagreement},'frames':records,
            'coordinates':'raw source pixels; stage is apparent reference motion from frame 0',
            'assumption':'Selected patches are stationary relative to the sample; common fluid motion is not stage evidence.',
            'limits':'Integer translation only. Scores are not calibrated probabilities; agreed moving references can be wrong.'}


def apply_stage(experiment, registration, *, reviewed=False):
    """Return detached encounter plus evidence; retain all raw detection positions."""
    import copy
    if reviewed is not True:
        raise ValueError('Review source patches and stationary-reference assumption first')
    if registration.get('format')!='microverse-fiducial-translation/v1':
        raise ValueError('Invalid registration format')
    if experiment.get('format')!='microverse-encounter/v1':
        raise ValueError('Expected encounter contract')
    if 'extraction' in experiment:
        raise ValueError('Extraction-bearing encounters require explicit source-stage provenance reconciliation; use the dedicated adapter when available')
    if (experiment.get('width'),experiment.get('height')) != (registration['width'],registration['height']):
        raise ValueError('Source dimensions disagree')
    if len(experiment['frames'])!=len(registration['frames']):
        raise ValueError('Source frame counts disagree')
    result=copy.deepcopy(experiment)
    for i,(frame,record) in enumerate(zip(result['frames'],registration['frames'])):
        stage=record.get('stage')
        if record.get('frame')!=i or record.get('accepted') is not True or not isinstance(stage,list) or len(stage)!=2 or any(type(v) not in (float,int) or not math.isfinite(v) or abs(v)>16384 for v in stage):
            raise ValueError('Unresolved registration: do not substitute zero stage')
        if 'stage' in frame and frame['stage'] != [0,0]:
            raise ValueError('Existing nonzero stage must be reconciled explicitly')
        frame['stage']=stage[:]
    return {'experiment':result,'registration':copy.deepcopy(registration),
            'reviewed':True,'note':'Core consumes stage once. Raw detections are unchanged. Preserve this receipt beside replay.'}
