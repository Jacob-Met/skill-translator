import cv2,json,pathlib,hashlib,numpy as np
import argparse
parser=argparse.ArgumentParser(description='Ordinary OpenCV contour baseline for supplied original images.')
parser.add_argument('--output',type=pathlib.Path)
parser.add_argument('images',type=pathlib.Path,nargs='+')
args=parser.parse_args()
reports=[]
for path in args.images:
 if path.suffix not in ['.png','.jpg']:continue
 image=cv2.imread(str(path));gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY);blur=cv2.GaussianBlur(gray,(5,5),0);edges=cv2.Canny(blur,50,150)
 contours,_=cv2.findContours(edges,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);candidates=[]
 for contour in contours:
  approx=cv2.approxPolyDP(contour,.02*cv2.arcLength(contour,True),True)
  if len(approx)!=4 or not cv2.isContourConvex(approx) or abs(cv2.contourArea(approx))<gray.size*.01:continue
  corners=approx[:,0,:].tolist()
  # clockwise in image coordinates, starting at upper-left sum
  center=np.mean(corners,axis=0);corners=sorted(corners,key=lambda p:np.arctan2(p[1]-center[1],p[0]-center[0]));i=min(range(4),key=lambda i:sum(corners[i]));corners=corners[i:]+corners[:i]
  if any(max(np.linalg.norm(np.array(corners)-np.array(c['corners']),axis=1))<5 for c in candidates):continue
  candidates.append({'corners':corners,'area':abs(float(cv2.contourArea(approx)))})
 candidates.sort(key=lambda c:-c['area'])
 reports.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'candidates':candidates[:8],'additional':max(0,len(candidates)-8)})
result={'method':'OpenCV Gaussian5 Canny(50,150), RETR_LIST contours, approxPolyDP .02 perimeter, convex four points, >=1% image area; no tuned per-image threshold','opencv':cv2.__version__,'reports':reports}
if args.output: args.output.write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
