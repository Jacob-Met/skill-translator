import base64
import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location('contours', Path(__file__).parents[1] / 'tools/sequence-contours-native.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class Contours(unittest.TestCase):
    def test_every_small_binary_field(self):
        # Independent lattice flood-fill: every edge component must have a walk,
        # every walk stays in one component, and coverage is an exact partition.
        for pattern in range(512):
            field = np.array([(pattern >> i) & 1 for i in range(9)], np.uint8).reshape(3, 3)
            original = field.copy()
            result = native.trace_field(field, (7, 11))
            points = {(x, y) for y in range(3) for x in range(3) if field[y, x]}
            unseen = set(points); components = []
            while unseen:
                frontier = [unseen.pop()]; component = set(frontier)
                while frontier:
                    x, y = frontier.pop()
                    neighbors = {p for p in unseen if max(abs(p[0]-x), abs(p[1]-y)) <= 1}
                    unseen -= neighbors; component |= neighbors; frontier.extend(neighbors)
                components.append(component)
            visited = set()
            for chain in result['chains']:
                walk = [(x-7, y-11) for x, y in chain['points']]
                self.assertTrue(set(walk) <= points)
                self.assertTrue(any(set(walk) <= c for c in components))
                for a, b in zip(walk, walk[1:]+walk[:1]):
                    self.assertLessEqual(max(abs(a[0]-b[0]), abs(a[1]-b[1])), 1)
                visited.update(walk)
                self.assertTrue(all(v == -1 or 0 <= v < len(result['chains']) for v in chain['hierarchy']))
            self.assertTrue(all(c & visited for c in components))
            omitted = np.unpackbits(np.frombuffer(base64.b64decode(result['coverage']['omittedField']), np.uint8), bitorder='little')[:9]
            omitted_points = {(i % 3, i // 3) for i, v in enumerate(omitted) if v}
            self.assertEqual(omitted_points, points-visited)
            self.assertEqual(result['coverage']['edgePixels'], len(points))
            self.assertEqual(result['coverage']['visitedEdgePixels'], len(visited))
            self.assertEqual(result['coverage']['omittedEdgePixels'], len(omitted_points))
            np.testing.assert_array_equal(field, original)

    def test_filled_patch_retains_omitted_interior(self):
        result = native.trace_field(np.ones((3, 3), np.uint8))
        self.assertEqual(result['coverage']['omittedEdgePixels'], 1)
        self.assertEqual(result['coverage']['edgePixels'], 9)

    def test_complete_refusal(self):
        for field in [np.ones((2, 2)), np.array([[2]], np.uint8), np.zeros((0, 0), np.uint8)]:
            with self.assertRaises(ValueError): native.trace_field(field)
        old = native.MAX_VERTICES
        try:
            native.MAX_VERTICES = 1
            with self.assertRaises(ValueError): native.trace_field(np.ones((3, 3), np.uint8))
        finally: native.MAX_VERTICES = old


if __name__ == '__main__': unittest.main()
