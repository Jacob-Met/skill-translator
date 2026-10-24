# Calibration sensitivity

The experiment reuses the maintained projective calibration and geometric adaptation. It asks how a selected transferred mark moves under explicitly supplied input perturbations while leaving the original task and its raw practice record intact.

## Declared inputs and finite method

Corner and landmark bounds are per-coordinate pixel offsets from 0 to 50 px. Physical source/target width and height bounds are millimetre offsets from 0 to 1000 mm. The 14 coordinates consist of eight corner coordinates, two landmark coordinates and four dimensions. These bounds are assumptions supplied by the user; they are not inferred from pixels or validated measurement distributions.

The method includes the nominal input, positive/negative perturbations of each active coordinate, the all-positive and all-negative combinations, and 128 paired deterministic low-discrepancy combined samples. Duplicate inputs are removed. There are at most 159 cases. Invalid geometry, nonpositive dimensions and impossible physical-edge transfer remain refused cases and never become zero displacement. Individual-coordinate influences describe those particular samples. Reported ranges and maximum shifts summarize only the valid sampled cases.

A finite sampled extent cannot guarantee a nonlinear worst-case bound, prove accuracy, establish lens correction or nonplanar validity, calibrate probability, or detect an unentered shared bias. The tolerance circle is the author's positional tolerance, not a measured uncertainty ellipse.

## Source preservation and reopening

Exports use `skill-translator-sensitivity/v1` and retain raw source annotations, selected mark, target dimensions, explicit assumptions and method version. Reopening validates and recomputes the analysis; cached result fields do not establish a finding. Invalid import preserves the accepted experiment.

Practice handoff stores the validated original practice session in this browser tab. Return restores its exact raw placements and archived rounds, selected mark, mirrored view and goal visibility. The hypothetical perturbations do not change that source or score. Closing the tab can discard the temporary handoff; export a practice session to keep it independently.

## Receiving evidence

Seven independent native groups exercise analytic proportional and all four physical-edge interpretations, combined perturbations, invalid geometry/dimension refusal, input immutability, source-bound reopen and cached-result rejection. A 2 px landmark perturbation on a 2 mm/px source produces the expected sqrt(32) mm combined displacement. The explicit refusal control keeps 103 valid and 48 invalid cases out of 151.

An independent team worker reviewed the core and practice-return path. The actual Chrome course exercises the full practice handoff, dirty-export guard, real download/reopen, failed import rollback, 390 px and 320 px layouts, and byte-equivalent raw practice/history return with a failed outcome retained. It records browser exceptions and offsite requests. These are authored geometric controls, not physical skill or metrology validation.

Run `npm test` for the native suite. With an existing Puppeteer installation and Chrome, run `PUPPETEER_PATH=/path/to/puppeteer CHROME_BINARY=/path/to/chrome node tools/browser-sensitivity.mjs`. `QA_OUTPUT` selects the receiving directory.
