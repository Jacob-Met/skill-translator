# Feature separation across adapted workpieces

Open `/feature-clearance`, import a complete annotated task source or use the authored example, and explicitly enter each circular radius, the required gap and the offered workpiece sizes. Compare every pair, save and reopen the declarations, or start fresh practice at the selected size.

## Meaning

For source mark pair A/B, the nominal signed boundary gap is center distance minus both declared radii. The minimum gap over independent Euclidean placement-tolerance discs is `max(0, distance - toleranceA - toleranceB) - radiusA - radiusB`. Compare each against the separately declared required gap. Negative gaps mean overlapping circles. Equal-boundary tangency meets a zero gap requirement, within a 1e-9 mm numerical comparison guard matching the maintained geometry scorer.

These are declared circular features, not cutting/tool models, inferred physical evidence or probability bounds. The full tolerance envelope deliberately does not restrict centers to positions inside the sheet; no edge-support calculation is performed. A possible worst-case violation does not assert the learner made it. No sheet-support, edge-access, recovery or relationship-review implementation is changed.

Every source mark needs an explicit radius (zero is valid, missing is refused). Every pair is evaluated for each of at most eight declared workpiece sizes. A rule that cannot adapt to a requested size refuses the proposed comparison. JSON retains the full original source and declarations, and recomputes results on reopen. Fresh practice receives unchanged source/rules and one chosen size; footprint results are not part of the maintained center-placement score.

## Verification

Run `node --test test/feature-clearance.test.mjs` and the maintained repository suite. Run `PUPPETEER_PATH=<existing Puppeteer module> CHROME_BINARY=<Chrome> QA_OUTPUT=<output directory> node tools/browser-feature-clearance.mjs` for actual source-file import, completed browser download/reopen, stale-input refusals, comparison and the maintained practice handoff. The harness uses the ordinary browser sandbox by default. Authored numerical controls establish software geometry behavior, not physical efficacy or learner performance.


## Receive practice outcomes

The comparison page can receive a matching exported practice session, select a raw current or historical round, and inspect supplied-placement feature gaps beside the unchanged center score. See [Practice outcomes and feature gaps](FEATURE_PRACTICE.md).
