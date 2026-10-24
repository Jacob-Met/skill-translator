#!/usr/bin/env python3
"""Authored perspective controls. No production geometry code or physical input."""
from fractions import Fraction as F
import argparse,hashlib,json,platform
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,__version__
ROOT=Path(__file__).resolve().parents[1]/"test/fixtures/learner-observation"
TARGETS={'guide':(30,100),'center':(150,100)}
def project(point):
 u,v=F(point[0],300),F(point[1],200);d=1+u/4+3*v/20
 return ((600*u+100*v+80)/d,(50*u+400*v+50)/d)
def coords(point):
 p=project(point)
 return {'physicalMm':list(point),'rawPixel':[float(x) for x in p],'rawPixelExact':[str(x) for x in p]}
def render(name,marks):
 s=3;im=Image.new('RGB',(700*s,500*s),'#dbe5ec' if name!='C' else '#e8dfeb');draw=ImageDraw.Draw(im)
 font=ImageFont.load_default(size=14*s);small=ImageFont.load_default(size=12*s)
 corners=[project(p) for p in [(0,0),(300,0),(300,200),(0,200)]]
 xy=lambda p:tuple(float(x)*s for x in p)
 draw.polygon([xy(p) for p in corners],fill='#fffdf5',outline='#283c50',width=2*s)
 for i,p in enumerate(corners):
  x,y=xy(p);draw.ellipse((x-3*s,y-3*s,x+3*s,y+3*s),fill='#283c50');draw.text((x+5*s,y+5*s),str(i+1),font=small,fill='#283c50')
 for key,point in marks.items():
  x,y=xy(project(point));color='#b43b19' if key=='guide' else '#006d79'
  draw.ellipse((x-6*s,y-6*s,x+6*s,y+6*s),outline=color,width=2*s)
  draw.line((x-9*s,y,x+9*s,y),fill=color,width=s);draw.line((x,y-9*s,x,y+9*s),fill=color,width=s)
  draw.text((x+11*s,y-9*s),key,font=small,fill=color)
 draw.text((18*s,12*s),f'AUTHORED CONTROL {name} / NO PHYSICAL ACQUISITION',font=font,fill='#233548')
 draw.text((18*s,438*s),'300 x 200 mm declared sheet; independent perspective construction',font=small,fill='#233548')
 draw.text((18*s,462*s),'Authored observations. Coordinates refer to the original 700 x 500 image.',font=small,fill='#233548')
 im=im.resize((700,500),Image.Resampling.LANCZOS);path=ROOT/f'observation-{name.lower()}.png';im.save(path,format='PNG',compress_level=9)
 return {'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'pixelWidth':700,'pixelHeight':500}
def main():
 result={'format':'skill-translator.authored-learner-observation-controls/v1','evidence':'Authored mathematical image controls; no photograph or physical acquisition.',
 'projection':{'u':'xMm/300','v':'yMm/200','px':'(600*u+100*v+80)/(0.25*u+0.15*v+1)','py':'(50*u+400*v+50)/(0.25*u+0.15*v+1)'},
 'sheetMm':{'width':300,'height':200},'sourceTask':{'widthMm':200,'heightMm':100,'pixelRectangle':[0,0,400,200],'marksPixels':{'guide':[40,100],'center':[200,100]},'transferRule':'fractional source rectangle position to fractional destination sheet position','toleranceMm':2},
 'cornerOrder':'top-left, top-right, bottom-right, bottom-left','corners':[coords(p) for p in [(0,0),(300,0),(300,200),(0,200)]],
 'targets':{k:coords(p) for k,p in TARGETS.items()},'cases':{},
 'rendering':{'python':platform.python_version(),'pillow':__version__,'supersampling':3,'resample':'LANCZOS','coordinateMeaning':'Continuous ideal image coordinates before rasterization; do not replace with rounded click coordinates.'}}
 for name,marks in {'A':{'guide':(36,96),'center':(150,100)},'B':dict(TARGETS),'C':dict(TARGETS)}.items():
  observed={}
  for key,point in marks.items():
   delta=[point[i]-TARGETS[key][i] for i in range(2)];squared=sum(v*v for v in delta)
   observed[key]={**coords(point),'errorVectorMm':delta,'errorSquaredMm2':squared,'errorMm':squared**.5,'withinTolerance':squared<=4}
  result['cases'][name]={**render(name,marks),'observations':observed,'allMarksWithinTolerance':all(x['withinTolerance'] for x in observed.values()),'identityUse':'Wrong-image control: same geometry/marks as B but different bytes; reject when bound to B.' if name=='C' else 'Correct identity for its own observations.'}
 (ROOT/'expected.json').write_text(json.dumps(result,indent=2)+'\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--output',type=Path,default=ROOT,help='Fixture destination (default: repository test/fixtures/learner-observation)')
 args=parser.parse_args();ROOT=args.output.resolve();ROOT.mkdir(parents=True,exist_ok=True);main()
