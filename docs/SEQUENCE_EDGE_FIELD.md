# Complete edge fields for crowded source images

The image-space edge inspector can receive all detected pixels in its original
ROI without materializing a JSON coordinate object for every pixel. The native
browser request uses `representation: "complete-field"`; omitted representation
retains the v1 producer contract for existing clients.

The v2 report keeps original moment, PNG digest, dimensions, presented timestamp,
ROI, fixed OpenCV settings and all candidates. Its `field` contains canonical
base64 bytes in row-major, least-significant-bit-first order. There is one bit
for every ROI pixel; unused final bits must be zero. Receiving checks exact byte
length, canonical encoding, padding and counted set bits. No pixels are dropped.

Candidates store a recomputed support count. Complete support remains derivable
from the retained field and exact integer segment predicate. The receiver scans
a conservative strip about the dominant segment coordinate, then applies the
same dot-product bounds and squared perpendicular-distance test used by v1.
For a two-pixel band, secondary displacement from the line is at most
`2*sqrt(2) < 3`; an additional lattice cell accommodates interpolation roundoff.
Integer predicates decide membership. ROI area remains bounded to 1,048,576
pixels, candidate count to 256, native runtime to 15 seconds, and original PNG
decoding to opaque uint8 samples. There is no detector threshold change.

The browser renders the complete field as a bounded transparent raster overlay,
avoiding a large SVG path string. It still accepts original v1 accounts, and the
existing source/account container retains original PNG custody. The field is
producer-reported detector evidence: it is neither an object label nor a
probability, physical scale, persistent identity or contact conclusion.

## Unfamiliar-source result

Internal permitted experiment: Erik Pålsson / Sounds of Changes,
[Video of paper cutter office device](https://commons.wikimedia.org/wiki/File:Video_of_paper_cutter_office_device.webm).
The source page's reviewed license block is CC BY 3.0; its summary also names CC
BY 4.0. Original video and derived images remain outside this repository.
Original video SHA256:
`7dd438a32071a1ed2903841be9b207f0565cb17a31413d6812bd85e6dd2c6d4d`.
Actual browser-presented frames were retained at 0.507, 2.007, 4.007, 6.007 and
7.973 seconds. The same original-pixel ROI `[160,200,700,1200]` was declared for
all frames before this capacity experiment.

| Presented time | Retained edge pixels | Candidate segments | Prior cloud format |
| --- | ---: | ---: | --- |
| 0.507 s | 30,411 | 144 | Refused over 20,000 pixels |
| 2.007 s | 8,810 | 34 | Admitted |
| 4.007 s | 30,030 | 122 | Refused over 20,000 pixels |
| 6.007 s | 23,526 | 104 | Refused over 20,000 pixels |
| 7.973 s | 15,983 | 70 | Admitted |

All five now pass actual local native/browser receiving, original-source
save/reopen and full pixel overlay. Each field is 105,000 packed bytes (140,000
base64 characters). Exact support for all 474 candidate segments matched an
independent scan of every original detected pixel. This establishes complete
evidence reception, not correct semantic selection among crowded proposals.

## Verification

`node --test --test-isolation=none test/sequence-edge.test.mjs test/sequence-edge-field.test.mjs`
checks both report versions, source/review custody, canonical field refusal and
600 exhaustive-reference anisotropic support controls, with reversed endpoints.
`python test/sequence-edge-native.test.py` checks source decoding, v1/v2 pixel
and support parity and a crowded field exceeding the legacy cap.

With qualified OpenCV/NumPy available, set `EDGE_FIELD_SOURCE` to the separately
retained permitted source capture, optionally `EDGE_LEGACY_ACCOUNT` to the prior
scissors v1 account, and run `node tools/browser-edge-field.mjs`.
The browser harness does not download or redistribute media. Existing
`tools/browser-sequence-edge.mjs` also exercises the prior scissors source
through compact native receiving, preserving stale-response refusal and zero
proposal semantics.
