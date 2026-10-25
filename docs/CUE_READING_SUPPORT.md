# Explain unsupported combinations of supplied cue readings

In the maintained cue-combination question workspace, a new report explains why
supplied categories have no joint match among the retained demonstrations. It
lists **every inclusion-minimal unsupported group**, rather than only the
smallest group or the first failure.

Each group retains two kinds of inspectable evidence:

- For every original example, the known unequal source categories that exclude
  that row from the group. Unknown categories cannot exclude a row.
- For every reading in the group, the original examples compatible with the
  group's other readings. These removal witnesses establish group minimality.

A removal witness concerns only that group. Another unsupported group may still
exist among the full record. It does not diagnose a faulty reading or recommend
discarding one. All readings and original examples remain retained.

## Challenge a tentative reference label

The ordinary planner stops proposing questions when its remaining records share
one label, or when no plan is available. The workspace now provides **Retain
another already inspected category** when no planned question remains and some
cues are still unread. This records an observation already available to the
user; it does not recommend an unavailable inspection or change the source.

An authored six-row, three-cue example retains one reference label after two
readings. A third actually supplied category leaves no joint example, although
every pair of the three readings has a compatible original row. The report
exposes that three-way support gap instead of preserving the earlier label as
an action recommendation. A new combination may be absent from the examples;
its absence does not make the physical situation impossible.

## Unknowns and source custody

Unknown source categories remain compatible, so a row with unknowns may prevent
an unsupported-group conclusion without providing positive support. Unknown
decision labels do not themselves exclude categorical evidence. Category and
decision meanings are supplied declarations, not automatically inferred facts.

The report reuses the maintained cue-study and reading admission. It saves no
derived groups. Existing complete v1/v2 cue bundles retain the unchanged original
comparison, PNGs, declarations and all accepted readings; reopening recomputes
the explanation after explicit inspection. No new raw format is needed.
Malformed incoming accounts preserve accepted work. Retaining an extra reading
invalidates an asynchronous export begun against an earlier record.

## Exact bounded mechanism and receiving

At most eight distinct readings and six original examples are admitted. Each
reading excludes a row only on a known unequal category. The implementation
checks all 255 nonempty reading subsets using exact bit masks. A subset is
reported only when it excludes every original row and contains no previously
found unsupported proper subset. Every proper subset precedes its superset in
the enumeration, so all inclusion-minimal groups are retained, including larger
groups beside a singleton. No probability or evidence-independence assumption
is used.

`node test/cue-reading-support.test.mjs` checks the three-way gap, multiple
incomparable groups, unknown categories and labels, novel categories, invalid
reading admission, unchanged inputs, full eight-reading capacity, and 1024
independently enumerated binary/null subset-oracle cases.

`PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-cue-reading-support.mjs`
exercises six original authored PNG source bundles through two readings, a
shared reference label, a challenging third reading, exact witnesses, raw
download and fresh 390px keyboard reopening. It also covers invalid additional
readings, stale export cancellation, unknown compatibility, incomparable groups
and malformed replacement preservation. Browser execution must be recorded
separately; native checks alone do not establish that experience.

This work does not establish causal conflict, a correct target action, physical
skill, learning benefit, Nebius execution or NVIDIA model integration. It does
not modify grouped retrospective omission (#261), the budget core (#262), or
source-bound target interpretation (#235/#238).
