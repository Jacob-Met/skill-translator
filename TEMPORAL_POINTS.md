# Original temporal point proposals

This candidate was reconstructed from retained complete source after transient
filesystem loss. It adds an offline temporal producer and an editable proposal
consumer to the existing sampled-path workbench.

## Produce and inspect proposals

Open an original sequence in the workbench, include 2–12 moments, and supply the
continuous first-frame anchor. Export the original temporal query, then run:

    python tools/temporal-points/produce.py INPUT.json NEW_OUTPUT.json --profile grayscale-probe

The producer requires NumPy, Pillow, and exactly PyPNG 0.20220715.0. Prepared
runtime archives include the offline producer and its pinned source dependencies.
Use Python 3.12 in a separate environment and install the supplied dependency set:

    python3.12 -m venv .temporal-venv
    .temporal-venv/bin/python -m pip install -r requirements-temporal.txt

These are Linux/macOS shell examples; on Windows use the environment's
Scripts/python.exe. Invoke produce.py with that environment's Python executable.
For the Node restart command, set TEMPORAL_PYTHON to the single executable path,
not a shell command. Python and these packages are not bundled in the archive;
release notes identify the platforms actually received.

The producer accepts original 8-bit grayscale PNGs only. The receiver accepts only
reports declaring `grayscale-probe`; opaque and other unqualified profiles are refused.

Unchanged MATERIALTRUTH modules at commit
`62df17886aa84ad8c74665b9f9e24cb40f9a6afd` supply gradient features and local
matching with patch radius 4 and search radius 6. Admission requires a score of at
least 0.8, a margin of at least 0.08, an interior search result, and an exact integer
reverse cycle. Continuous anchor fractions remain separate from containing-pixel
indices. An unresolved predecessor stops the automatic chain.

The report retains complete originals. Original input and producer hashes are
rechecked before atomic output creation that refuses replacement. These pins do
not exhaustively attest all runtime dependencies.

Open the report in the ordinary workbench. Inspect every original PNG and the
supplied alternatives. Correct coordinates or mark observations missing, explicitly
review semantic continuity, and independently declare the annotation relationship,
tolerance, and common planar reference. Unapplied edits block acceptance and survive
another row's redraw. Corrections retire inherited downstream proposals while
preserving later independently authored choices. Missing calibration remains a
missing physical position.

Ordinary acceptance appends source annotations and creates the maintained sampled
path without removing original media or earlier marks. Media transferred to the
main source remains available if proposal rendering fails.

## Limits

Supplied reports are editable. Browser admission checks consistency and original
PNG bytes; it does not rerun or authenticate matching. An identical distractor can
pass both directions. The retained authored counterexample proposes
`(102.25, 100.75)` instead of the intended `(120.25, 100.75)`.

These courses use authored translational raster originals. They do not establish
physical identity, arbitrary-video robustness, subpixel motion, or measured total
human effort. Acquisition, calibration, original-image review, and offline handoffs
remain human work.

## Receiving evidence

The current native suites contain nine tests: three correction-state tests and six
source/acceptance tests, including refusal of an unqualified opaque profile. The
six affected receiver tests passed after the profile restriction; the unchanged
three state tests retain their prior passing result. Focused admission also accepts
the actual grayscale CLI report and refuses the same report relabeled as opaque.

The unchanged producer passed ten actual CLI controls. The browser passed twelve
controls in Chrome 156.0.8078.73 with its sandbox active and no page exceptions.
Three of those controls exercise the independent review fixes: unapplied-edit
refusal, preservation of another row's draft, and media custody after a rendering
failure. The subsequent profile restriction leaves the grayscale fixture unchanged;
the browser course was not repeated for that restriction.

Browser receiving used a static local host. A separate maintained-server check
started `createAppServer()` and fetched the three temporal modules, sampled-path
HTML, and sampled-path module. All five returned HTTP 200, the expected MIME type,
and byte-identical source. Its receipt predates the profile restriction; it verifies
the unchanged routing mechanism, not the new receiver file hash.

Commands:

    node test/temporal-choice-state.test.mjs
    node test/temporal-point-proposals.test.mjs
    PYTHONPATH=<pinned-pypng-directory> python test/receive-temporal-producer.py
    node tools/receive-temporal-routes.mjs
    APP_ROOT=<checkout> QA_DIR=<output> python tools/browser-temporal.py

The browser driver requires a separately launched, isolated nonroot Chrome CDP
endpoint at `127.0.0.1:9227`. It requires positive sandbox status, PID and network
namespaces, and Seccomp-BPF. The native server check needs local loopback permission.
