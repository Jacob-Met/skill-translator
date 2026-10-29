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
    def test_compact_field_preserves_every_pixel_and_support_without_coordinate_duplication(self):
        r=request();legacy=module.inspect(r);r['representation']='complete-field';compact=module.inspect(r)
        self.assertNotIn('points',compact);self.assertEqual(compact['format'],'skill-translator.sequence-edge-report/v2')
        bits=np.unpackbits(np.frombuffer(base64.b64decode(compact['field']['data']),np.uint8),bitorder='little')[:60000].reshape((200,300));ys,xs=np.nonzero(bits)
        self.assertEqual([{'x':int(x),'y':int(y)} for y,x in zip(ys,xs)],legacy['points'])
        self.assertEqual(compact['field']['count'],len(legacy['points']))
        for old,new in zip(legacy['candidates'],compact['candidates']):
            self.assertNotIn('supportIndices',new);self.assertEqual(new['supportCount'],len(old['supportIndices']))
            self.assertEqual(new['a'],old['a']);self.assertEqual(new['b'],old['b'])
    def test_complete_crowded_field_crosses_legacy_cloud_cap_without_retuning(self):
        image=np.zeros((500,500,3),np.uint8)
        for x in range(8,500,16):cv2.line(image,(x,0),(x,499),(255,255,255),2)
        ok,png=cv2.imencode('.png',image);data=png.tobytes();r=request();r.update(image={'widthPx':500,'heightPx':500,'sha256':hashlib.sha256(data).hexdigest()},pngBase64=base64.b64encode(data).decode(),roi=[0,0,500,500])
        with self.assertRaisesRegex(ValueError,'20000'):module.inspect(r)
        r['representation']='complete-field';actual=module.inspect(r);self.assertGreater(actual['field']['count'],20000);self.assertLessEqual(len(actual['candidates']),256)
    def test_complete_repeat_is_deterministic_in_fixed_runtime(self):
        self.assertEqual(module.inspect(request()),module.inspect(request()))
class HoughLayouts(unittest.TestCase):
    def test_native_layouts_preserve_complete_report(self):
        from unittest.mock import patch
        native=cv2.HoughLinesP
        reports=[]
        for shape in ((-1,4),(-1,1,4)):
            def wrapped(*args,**kwargs):
                raw=native(*args,**kwargs)
                return None if raw is None else raw.reshape(shape)
            with patch.object(cv2,'HoughLinesP',wrapped):
                r=request();r['representation']='complete-field';reports.append(module.inspect(r))
        self.assertGreater(len(reports[0]['candidates']),0)
        self.assertEqual(reports[0],reports[1])
    def test_invalid_layouts_refuse_without_partial_report(self):
        from unittest.mock import patch
        for raw in (np.zeros(4,np.int32),np.zeros((2,2),np.int32),np.zeros((2,2,4),np.int32),np.zeros((2,4),np.float64)):
            with self.subTest(shape=raw.shape,dtype=str(raw.dtype)),patch.object(cv2,'HoughLinesP',return_value=raw):
                with self.assertRaisesRegex(ValueError,'layout'):module.inspect(request())
    def test_known_endpoint_pairs_not_collapsed(self):
        from unittest.mock import patch
        endpoints=np.array([[30,60,270,140],[40,80,260,80]],dtype=np.int32)
        for raw in (endpoints,endpoints.reshape(2,1,4)):
            with patch.object(cv2,'HoughLinesP',return_value=raw):report=module.inspect(request())
            self.assertEqual([(c['a']['x'],c['a']['y'],c['b']['x'],c['b']['y'])for c in report['candidates']],[(30,60,270,140),(40,80,260,80)])
if __name__=='__main__':unittest.main()
