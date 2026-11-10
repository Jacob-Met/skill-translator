"""Native page scan geometry/admission controls; run with the qualified OpenCV Python."""
import base64, hashlib, importlib.util, pathlib, unittest
import cv2, numpy as np
spec=importlib.util.spec_from_file_location('photo_scan',pathlib.Path(__file__).with_name('photo-corners-native.py'))
scan=importlib.util.module_from_spec(spec);spec.loader.exec_module(scan)
def request(image):
 ok,data=cv2.imencode('.png',image);assert ok;data=data.tobytes()
 return {'raster':{'width':image.shape[1],'height':image.shape[0],'pngBase64':base64.b64encode(data).decode(),'sha256':hashlib.sha256(data).hexdigest()}}
class PhotoCorners(unittest.TestCase):
 def canvas(self):return np.full((480,640,3),45,np.uint8)
 def test_oblique_bright_and_dark_boundary(self):
  corners=np.array([[100,75],[550,120],[515,405],[65,365]],np.int32)
  for dark in [False,True]:
   image=self.canvas()
   if dark:image[:]=220
   cv2.fillPoly(image,[corners],(45,45,45)if dark else(220,220,220))
   result=scan.inspect(request(image));self.assertEqual(len(result['candidates']),1)
   actual=np.array([[p['x'],p['y']]for p in result['candidates'][0]['corners']]);self.assertLess(np.linalg.norm(actual-corners,axis=1).max(),5)
   self.assertEqual(result['rasterSha256'],request(image)['raster']['sha256'])
 def test_two_distinct_regions_remain_choices(self):
  image=self.canvas();cv2.rectangle(image,(40,60),(280,410),(220,220,220),-1);cv2.rectangle(image,(380,120),(600,360),(220,220,220),-1)
  self.assertEqual(len(scan.inspect(request(image))['candidates']),2)
 def test_uniform_triangle_circle_and_clipped_are_omitted(self):
  for kind in ['uniform','triangle','circle','clipped']:
   image=self.canvas()
   if kind=='triangle':cv2.fillPoly(image,[np.array([[60,70],[570,100],[350,420]])],(220,220,220))
   if kind=='circle':cv2.circle(image,(320,240),150,(220,220,220),-1)
   if kind=='clipped':cv2.rectangle(image,(0,60),(420,420),(220,220,220),-1)
   self.assertEqual(scan.inspect(request(image))['candidates'],[],kind)
 def test_three_sides_do_not_invent_fourth(self):
  image=self.canvas();cv2.polylines(image,[np.array([[100,80],[100,400],[540,400],[540,80]])],False,(220,220,220),12)
  self.assertEqual(scan.inspect(request(image))['candidates'],[])
 def test_transparency_and_wrong_raster_identity_are_refused(self):
  image=np.full((80,100,4),255,np.uint8);image[20,20,3]=0
  with self.assertRaisesRegex(ValueError,'opaque'):scan.inspect(request(image))
  req=request(self.canvas());req['raster']['sha256']='0'*64
  with self.assertRaisesRegex(ValueError,'hash mismatch'):scan.inspect(req)
if __name__=='__main__':unittest.main()
