import base64, hashlib, importlib.util, struct, unittest, zlib
from pathlib import Path
import cv2
import numpy as np

root=Path(__file__).parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,root/'tools'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
contour=load('sequence-contours-native.py');edge=load('sequence-edge-native.py')
def chunk(kind,payload):
    return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
def request(data):
    return {'representation':'complete-field','roi':[0,0,48,48],
            'image':{'sha256':hashlib.sha256(data).hexdigest(),'widthPx':48,'heightPx':48},
            'momentId':'authored-coordinate-control','origin':{'basis':'authored decoder control'},
            'pngBase64':base64.b64encode(data).decode()}

class CoordinateAdmission(unittest.TestCase):
    def setUp(self):
        image=np.full((48,48,3),255,np.uint8);image[4:21,5:13]=0;image[30:37,7:29]=0
        self.data=cv2.imencode('.png',image)[1].tobytes()
    def test_plain_matches_unchanged_edge_and_trace(self):
        r=request(self.data);original=dict(r);native=edge.inspect(r);actual=contour.inspect(r,edge.inspect)
        self.assertEqual(actual['edgeReport'],native);self.assertEqual(r,original)
        field=np.unpackbits(np.frombuffer(base64.b64decode(native['field']['data']),np.uint8),bitorder='little')[:48*48].reshape(48,48)
        expected=contour.trace_field(field)
        self.assertEqual(actual['chains'],expected['chains']);self.assertEqual(actual['coverage'],expected['coverage'])
    def test_metadata_refuses_before_delegated_decode(self):
        def forbidden(_): raise AssertionError('Native decode must not run')
        for orientation in range(1,9):
            payload=b'II'+struct.pack('<HIH',42,8,1)+struct.pack('<HHI',0x112,3,1)+struct.pack('<H',orientation)+b'\0\0'+struct.pack('<I',0)
            changed=self.data[:33]+chunk(b'eXIf',payload)+self.data[33:]
            with self.assertRaisesRegex(ValueError,'explicit source interpretation'):
                contour.inspect(request(changed),forbidden)
        changed=self.data[:33]+chunk(b'acTL',struct.pack('>II',1,0))+self.data[33:]
        with self.assertRaisesRegex(ValueError,'explicit source interpretation'):
            contour.inspect(request(changed),forbidden)
    def test_literal_text_is_not_metadata(self):
        changed=self.data[:33]+chunk(b'tEXt',b'note\0eXIf acTL')+self.data[33:]
        self.assertEqual(contour.inspect(request(changed),edge.inspect)['coverage'],contour.inspect(request(self.data),edge.inspect)['coverage'])
    def test_truncated_chunk_never_delegates(self):
        def forbidden(_): raise AssertionError('Native decode must not run')
        for data in [self.data[:36],self.data[:-2]]:
            with self.assertRaisesRegex(ValueError,'Truncated PNG chunk'):
                contour.inspect(request(data),forbidden)

if __name__=='__main__': unittest.main()
