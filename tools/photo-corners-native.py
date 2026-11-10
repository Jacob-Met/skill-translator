#!/usr/bin/env python3
"""Fixed colour/edge contour proposals for the existing Source Studio inspector.
Adapted from OpenCV squares.cpp; no right-angle gate for perspective photographs.
No labels, physical dimensions or intended workpiece identity are inputs.
"""
import base64, hashlib, json, struct, sys, time
try:
 import cv2
 import numpy as np
except ImportError:
 print('Optional OpenCV runtime is not installed.',file=sys.stderr)
 sys.exit(78)
cv2.setNumThreads(1)
MAX_PIXELS=2097152
def inspect(request):
 raster=request['raster'];data=base64.b64decode(raster['pngBase64'],validate=True)
 if not 24<=len(data)<=8*1024*1024 or data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Bounded PNG analysis raster required')
 w,h=struct.unpack('>II',data[16:24])
 if any(type(raster[k])is not int for k in ['width','height'])or(w,h)!=(raster['width'],raster['height'])or min(w,h)<16 or max(w,h)>2048 or w*h>MAX_PIXELS:raise ValueError('Analysis raster exceeds page scan capacity')
 if hashlib.sha256(data).hexdigest()!=raster['sha256']:raise ValueError('Analysis raster hash mismatch')
 decoded=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_UNCHANGED)
 if decoded is None or decoded.dtype!=np.uint8 or decoded.shape[:2]!=(h,w):raise ValueError('Analysis raster decode mismatch')
 if decoded.ndim==2:image=cv2.cvtColor(decoded,cv2.COLOR_GRAY2BGR)
 elif decoded.ndim==3 and decoded.shape[2]in[3,4]:
  if decoded.shape[2]==4 and np.any(decoded[:,:,3]!=255):raise ValueError('Corner proposals require an opaque image; manual corners remain available.')
  image=decoded[:,:,:3]
 else:raise ValueError('Unsupported analysis raster channels')
 deduplication_px=5*max(1,max(w,h)/1024)
 started=time.monotonic();filtered=cv2.pyrUp(cv2.pyrDown(image),dstsize=(w,h));found=[]
 for ch in range(3):
  plane=filtered[:,:,ch]
  for level in range(11):
   mask=cv2.dilate(cv2.Canny(plane,0,50,apertureSize=5),None)if level==0 else(plane>=(level+1)*255/11).astype(np.uint8)*255
   contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
   for c in contours:
    q=cv2.approxPolyDP(c,.02*cv2.arcLength(c,True),True)
    if len(q)!=4 or not cv2.isContourConvex(q)or abs(cv2.contourArea(q))<w*h*.01:continue
    q=q[:,0,:]
    if np.any(q[:,0]<=0)or np.any(q[:,1]<=0)or np.any(q[:,0]>=w-1)or np.any(q[:,1]>=h-1):continue
    center=q.mean(axis=0);q=np.array(sorted(q.tolist(),key=lambda x:np.arctan2(x[1]-center[1],x[0]-center[0])));q=np.roll(q,-np.argmin(q.sum(axis=1)),axis=0)
    if any(min(np.max(np.linalg.norm(np.roll(q,k,axis=0)-np.array(x['points']),axis=1))for k in range(4))<=deduplication_px for x in found):continue
    found.append({'points':q.tolist(),'area':abs(float(cv2.contourArea(q.astype(np.float32)))),'channel':ch,'level':level})
 found.sort(key=lambda x:-x['area']);settings={'method':'opencv-colour-contours','opencvVersion':cv2.__version__,'numpyVersion':np.__version__,'filter':'pyrDown-pyrUp','channels':'BGR','levels':11,'cannyLow':0,'cannyHigh':50,'aperture':5,'dilation':1,'retrieval':'RETR_LIST','approximationFraction':.02,'minimumAreaFraction':.01,'boundaryOmission':True,'deduplicationPx':deduplication_px,'rightAngleGate':False}
 return {'version':'skill-translator.photo-corners/v1','kernel':'OpenCV/'+cv2.__version__,'width':w,'height':h,'rasterSha256':raster['sha256'],'elapsedMs':(time.monotonic()-started)*1000,'omitted':max(0,len(found)-8),'candidates':[{'id':'outline-'+str(i+1),'method':'opencv-colour-contours','settings':dict(settings,channel=x['channel'],level=x['level']),'corners':[{'x':p[0],'y':p[1]}for p in x['points']],'outlineAreaPx':x['area'],'coverage':x['area']/(w*h)}for i,x in enumerate(found[:8])]}
if __name__=='__main__':
 try:
  raw=sys.stdin.buffer.read(16*1024*1024+1)
  if len(raw)>16*1024*1024:raise ValueError('Page scan request exceeds capacity')
  print(json.dumps(inspect(json.loads(raw))))
 except Exception as error:
  print(str(error),file=sys.stderr);sys.exit(1)
