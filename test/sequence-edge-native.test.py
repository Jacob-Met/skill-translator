import unittest,importlib.util,pathlib,hashlib,base64
import cv2,numpy as np
spec=importlib.util.spec_from_file_location('edge_native',pathlib.Path(__file__).resolve().parents[1]/'tools/sequence-edge-native.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def request(line=True):
    image=np.zeros((200,300,3),np.uint8)
    if line:cv2.line(image,(30,60),(270,140),(255,255,255),3)
    ok,png=cv2.imencode('.png',image);assert ok;data=png.tobytes()
    return {'momentId':'authored','image':{'widthPx':300,'heightPx':200,'sha256':hashlib.sha256(data).hexdigest()},'origin':{},'pngBase64':base64.b64encode(data).decode(),'roi':[0,0,300,200]}
class Native(unittest.TestCase):
    def test_original_pixels_generate_supported_segments(self):
        r=module.inspect(request());self.assertGreater(len(r['candidates']),0)
        for c in r['candidates']:
            self.assertGreater(len(c['supportIndices']),0)
            dx=c['b']['x']-c['a']['x'];dy=c['b']['y']-c['a']['y'];length2=dx*dx+dy*dy
            expected=[]
            for i,p in enumerate(r['points']):
                x=p['x']-c['a']['x'];y=p['y']-c['a']['y']
                if 0<=x*dx+y*dy<=length2 and (x*dy-y*dx)**2<=4*length2:expected.append(i)
            self.assertEqual(c['supportIndices'],expected)
    def test_no_edges_is_valid_negative_evidence(self):
        r=module.inspect(request(False));self.assertEqual(r['points'],[]);self.assertEqual(r['candidates'],[])
    def test_source_digest_raster_and_roi_refuse(self):
        for mutate in [lambda r:r['image'].update(sha256='0'*64),lambda r:r['image'].update(widthPx=299),lambda r:r.update(roi=[-1,0,300,200]),lambda r:r.update(roi=[0,0,300.0,200]),lambda r:r.update(roi=[0,0,301,200])]:
            r=request();mutate(r)
            with self.assertRaises(ValueError):module.inspect(r)
    def test_transparent_hidden_rgb_is_refused_and_opaque_rgba_retains_pixels(self):
        r=request();decoded=cv2.imdecode(np.frombuffer(base64.b64decode(r['pngBase64']),np.uint8),cv2.IMREAD_COLOR)
        rgba=cv2.cvtColor(decoded,cv2.COLOR_BGR2BGRA)
        def replace(image):
            ok,png=cv2.imencode('.png',image);data=png.tobytes();value=request();value['pngBase64']=base64.b64encode(data).decode();value['image']['sha256']=hashlib.sha256(data).hexdigest();return value
        opaque=module.inspect(replace(rgba));baseline=module.inspect(r)
        self.assertEqual(opaque['points'],baseline['points']);self.assertEqual(opaque['candidates'],baseline['candidates'])
        rgba[:,:,3]=0
        with self.assertRaisesRegex(ValueError,'Nonopaque'):module.inspect(replace(rgba))
        with self.assertRaisesRegex(ValueError,'8-bit'):module.inspect(replace(decoded.astype(np.uint16)*257))
    def test_complete_repeat_is_deterministic_in_fixed_runtime(self):
        self.assertEqual(module.inspect(request()),module.inspect(request()))
if __name__=='__main__':unittest.main()
