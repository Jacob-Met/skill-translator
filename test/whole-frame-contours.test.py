import base64
import hashlib
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import struct
import zlib
import cv2
import numpy as np

spec = importlib.util.spec_from_file_location('whole', Path(__file__).parents[1] / 'tools/whole-frame-contours-native.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def request(pixels):
    ok, encoded = cv2.imencode('.png', pixels)
    assert ok
    raw = encoded.tobytes()
    return {'scope': 'whole-original-frame', 'momentId': 'original',
            'origin': {'mediaTimeSeconds': 1},
            'image': {'widthPx': pixels.shape[1], 'heightPx': pixels.shape[0],
                      'sha256': hashlib.sha256(raw).hexdigest()},
            'pngBase64': base64.b64encode(raw).decode()}


class WholeFrame(unittest.TestCase):
    def test_full_field_no_tile_approximation(self):
        image = np.zeros((40, 40), np.uint8)
        image[5:35, 8:30] = 170
        image[14:26, 17:34] = 85
        req = request(image)
        report = native.inspect(req)
        actual = np.unpackbits(np.frombuffer(base64.b64decode(report['field']['data']), np.uint8), bitorder='little')[:image.size].reshape(image.shape)
        expected = cv2.Canny(image, 50, 150, apertureSize=3, L2gradient=True) != 0
        np.testing.assert_array_equal(actual, expected)
        self.assertEqual(report['image'], req['image'])
        self.assertEqual(report['origin'], req['origin'])
        self.assertEqual(report['coverage']['edgePixels'], int(expected.sum()))

    def test_scope_is_explicit_and_old_bound_unchanged(self):
        req = request(np.zeros((8, 8), np.uint8))
        for value in [None, 'roi', True]:
            with self.assertRaises(ValueError): native.inspect({**req, 'scope': value})
        with self.assertRaises(ValueError): native.inspect({**req, 'roi': [0, 0, 8, 8]})
        larger = np.zeros((1024, 1025), np.uint8)
        with self.assertRaises(ValueError): native.walks.trace_field(larger)
        self.assertEqual(native.walks.trace_field(larger, scope='whole-original-frame')['chains'], [])
        with self.assertRaises(ValueError): native.walks.trace_field(larger, (1, 0), scope='whole-original-frame')

    def test_exact_capacity_and_refusal(self):
        # Highly compressible authored original PNG, not a large stored artifact.
        report = native.inspect(request(np.zeros((1024, 2048), np.uint8)))
        self.assertEqual(report['field']['count'], 0)
        with self.assertRaises(ValueError): native.inspect(request(np.zeros((1024, 2049), np.uint8)))

    def test_original_source_refusals(self):
        req = request(np.zeros((8, 8), np.uint8))
        for image in [{**req['image'], 'sha256': '0'*64}, {**req['image'], 'widthPx': 9}, {**req['image'], 'heightPx': True}]:
            with self.assertRaises(ValueError): native.inspect({**req, 'image': image})
        transparent = np.zeros((8, 8, 4), np.uint8)
        with self.assertRaises(ValueError): native.inspect(request(transparent))
        with self.assertRaises(ValueError): native.inspect(request(np.zeros((8, 8), np.uint16)))

    def test_walk_semantics_identical_under_explicit_scope(self):
        for pattern in range(512):
            field = np.array([(pattern >> i) & 1 for i in range(9)], np.uint8).reshape(3, 3)
            self.assertEqual(native.walks.trace_field(field), native.walks.trace_field(field, scope='whole-original-frame'))


    def test_orientation_and_animation_refuse_before_native_decode(self):
        req = request(np.zeros((8, 8), np.uint8))
        original = base64.b64decode(req['pngBase64'])
        def replace(data):
            return {**req, 'pngBase64': base64.b64encode(data).decode(),
                    'image': {**req['image'], 'sha256': hashlib.sha256(data).hexdigest()}}
        for orientation in range(1, 9):
            payload = b'II' + struct.pack('<HIH', 42, 8, 1) + struct.pack('<HHI', 0x112, 3, 1) + struct.pack('<H', orientation) + b'\0\0' + struct.pack('<I', 0)
            kind = b'eXIf'
            chunk = struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
            with patch.object(native.cv2, 'imdecode', side_effect=AssertionError('must refuse before decoder')):
                with self.assertRaisesRegex(ValueError, 'explicit source interpretation'):
                    native.inspect(replace(original[:33] + chunk + original[33:]))
        payload = struct.pack('>II', 2, 0); kind = b'acTL'
        chunk = struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
        with patch.object(native.cv2, 'imdecode', side_effect=AssertionError('must refuse before decoder')):
            with self.assertRaisesRegex(ValueError, 'explicit source interpretation'):
                native.inspect(replace(original[:33] + chunk + original[33:]))
            with self.assertRaisesRegex(ValueError, 'Truncated PNG chunk'):
                native.inspect(replace(original[:33] + struct.pack('>I', 0xffffffff) + b'tEXt' + b'0000'))


if __name__ == '__main__': unittest.main()
