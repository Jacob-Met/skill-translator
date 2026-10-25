#!/usr/bin/env python3
"""Bounded source-PNG OpenCV proposals; no physical boundary or identity verdict."""
import sys,json,base64,hashlib,struct,math
import cv2
import numpy as np
cv2.setNumThreads(1)
cv2.setRNGSeed(130)
LIMIT=24*1024*1024

def inspect(request):
    image=request['image']; data=base64.b64decode(request['pngBase64'],validate=True)
    if not 0<len(data)<=16*1024*1024 or data[:8]!=b'\x89PNG\r\n\x1a\n': raise ValueError('A bounded original PNG is required')
    width,height=struct.unpack('>II',data[16:24])
    if width!=image['widthPx'] or height!=image['heightPx'] or width*height>24000000 or max(width,height)>8192: raise ValueError('Original raster mismatch or capacity exceeded')
    if hashlib.sha256(data).hexdigest()!=image['sha256']:raise ValueError('Original PNG hash mismatch')
    roi=request['roi']
    if len(roi)!=4 or any(type(v)is not int for v in roi):raise ValueError('ROI requires integer x,y,width,height')
    x,y,w,h=roi
    if x<0 or y<0 or w<3 or h<3 or x+w>width or y+h>height or w*h>1048576:raise ValueError('ROI must stay inside source raster and at most1048576pixels')
    decoded=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_UNCHANGED)
    if decoded is None or decoded.shape[:2]!=(height,width):raise ValueError('PNG decode mismatch')
    if decoded.dtype!=np.uint8:raise ValueError('Only original8-bit PNG samples are supported')
    if decoded.ndim==3 and decoded.shape[2]==4 and np.any(decoded[:,:,3]!=255):raise ValueError('Nonopaque PNG requires an explicit compositing account; hidden RGB is not visible evidence')
    if decoded.ndim==2:gray=decoded[y:y+h,x:x+w]
    elif decoded.ndim==3 and decoded.shape[2] in (3,4):gray=cv2.cvtColor(decoded[y:y+h,x:x+w],cv2.COLOR_BGR2GRAY)
    else:raise ValueError('Unsupported original PNG channels')
    edge=cv2.Canny(gray,50,150,apertureSize=3,L2gradient=True)
    ys,xs=np.nonzero(edge)
    if len(xs)>20000:raise ValueError('Complete edge cloud exceeds20000pixels; narrow the ROI')
    raw=cv2.HoughLinesP(edge,1,np.pi/180,40,minLineLength=80,maxLineGap=10)
    lines=[] if raw is None else [tuple(map(int,row)) for row in raw[:,0]]
    if len(lines)>256:raise ValueError('More than256 complete candidates; narrow the ROI')
    lines=sorted(set(tuple(min((a,b),(c,d))+max((a,b),(c,d))) for a,b,c,d in lines))
    candidates=[]
    for a,b,c,d in lines:
        dx,dy=c-a,d-b;length=math.hypot(dx,dy)
        projection=(xs-a)*dx+(ys-b)*dy
        cross=(xs-a)*dy-(ys-b)*dx
        squared_length=dx*dx+dy*dy
        selected=(projection>=0)&(projection<=squared_length)&(cross*cross<=4*squared_length)
        support=np.flatnonzero(selected).tolist()
        candidates.append({'id':'segment-'+str(len(candidates)+1),'a':{'x':a+x,'y':b+y},'b':{'x':c+x,'y':d+y},'lengthPx':length,'supportIndices':support,'supportBandPx':2,'roiBoundaryNear':any(px<=1 or px>=w-2 or py<=1 or py>=h-2 for px,py in [(a,b),(c,d)])})
    return {'format':'skill-translator.sequence-edge-report/v1','momentId':request['momentId'],'image':image,'origin':request['origin'],'roi':roi,'method':{'name':'opencv-canny-hough-segments/v1','sourceDecode':'unchanged-u8-opaque','cannyLow':50,'cannyHigh':150,'aperture':3,'l2Gradient':True,'rhoPx':1,'thetaRadians':math.pi/180,'votes':40,'minimumLengthPx':80,'maximumGapPx':10,'opencvVersion':cv2.__version__,'numpyVersion':np.__version__},'points':[{'x':int(px)+x,'y':int(py)+y} for py,px in zip(ys,xs)],'candidates':candidates,'boundary':'Every reported segment is an image-space proposal from fixed OpenCV settings. Support is a geometric subset of complete ROI edge pixels, not a probability or boundary label. Blur, low contrast, texture and occlusion can omit or create segments. No physical scale, contact, persistence or task success is inferred.'}

if __name__=='__main__':
    try:
        data=sys.stdin.buffer.read(LIMIT+1)
        if len(data)>LIMIT:raise ValueError('Native request too large')
        print(json.dumps(inspect(json.loads(data))))
    except Exception as e:
        print(str(e),file=sys.stderr);sys.exit(1)
