"""Fixed colour/multilevel contour baseline, adapted from OpenCV squares.cpp.
https://docs.opencv.org/3.4.17/db/d00/samples_2cpp_2squares_8cpp-example.html
Changes: no right-angle gate (perspective pages);1% image area; image-boundary omission;
deduplicated area-ordered maximum8 alternatives, matching the product's task.
"""
import argparse,pathlib,json,hashlib,cv2,numpy as np
p=argparse.ArgumentParser();p.add_argument('images',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args();reports=[]
for path in sorted(a.images.glob('*.png')):
 image=cv2.imread(str(path));h,w=image.shape[:2];filtered=cv2.pyrUp(cv2.pyrDown(image),dstsize=(w,h));found=[]
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
    if any(min(np.max(np.linalg.norm(np.roll(q,k,axis=0)-np.array(x['corners']),axis=1))for k in range(4))<5 for x in found):continue
    found.append({'corners':q.tolist(),'area':abs(float(cv2.contourArea(q.astype(np.float32)))),'channel':ch,'level':level})
 found.sort(key=lambda x:-x['area']);reports.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'candidates':found[:8],'additional':max(0,len(found)-8)})
result={'method':__doc__,'opencv':cv2.__version__,'reports':reports};a.output.write_text(json.dumps(result,indent=2));print('Scored',len(reports),'frames')
