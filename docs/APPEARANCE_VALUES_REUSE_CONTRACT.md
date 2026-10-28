# Numeric inference reuse boundary — #465

Inspected exact published source at 9729e7c340f7bff98c4ef471ccc33f22101baa60, retained locally as pinned source text. No further API reads after the account limit notice.

`numeric-cue-thresholds.mjs` exports NUMERIC_CUE_FORMAT, importNumericCueStudy and inspectNumericCueStudy. Its numerical `fit(rows,indexes)` and `compare(fitResult,range,rows,indexes)` are private. The sole public inspector first calls the endpoint-only importer. `numeric-trace-readings.mjs` derives the same endpoint format from actual nominal instrument matches. `joint-producer-input.mjs` accepts those raw records/complete bundles; it exposes no source-neutral scalar inference entry.

Consequently no inspected public interface accepts a source-bound pair quantity without manufacturing an endpoint reading. The isolated #465 prototype deliberately returns inference:null and does not copy the threshold mathematics.

## Proposed owner interface (not implemented)

A small pure export owned by the numeric inference contributor:

`inspectNumericRanges({ rows: [{ decision: string|null, range: [lower,upper]|null, sourceGroup: string }], targetRange: [lower,upper]|null })`

Admission: retain bounded row count and all existing finite range/label rules. sourceGroup is an opaque original-source grouping key, never proof of independence. The producer supplies the original clip SHA for every row.

Result: `{findings, omissions, target}` with the existing complete family, threshold endpoints/openness, original row indexes and lower/upper witnesses. Each omission removes every row with the same sourceGroup, preserving existing whole-clip behavior. Missing labels/ranges and opposing/unassessed outcomes remain unchanged. No source/anchor claim belongs in this numeric layer.

The incumbent endpoint inspector would adapt its already validated rows and source clip keys to this function, retaining its original study, schema and boundary text. Tests must establish exact report parity for all existing threshold fixtures and missing/overlap/whole-clip controls before adoption. The appearance producer would separately pass recomputed scalar point ranges [value,value] and keep its full original pair provenance outside this numerical structure. A point range describes the deterministic sampled calculation, not physical measurement precision. The #397 band family remains owner work and is not required for this initial single-threshold reuse.

Until this interface is agreed and published, source admission, PNG custody, complete finite computation, settings binding and work budgeting can advance independently; no decision inference is claimed.

Fresh #397 read: issue still open with zero comments and no offered interface. Current main numeric module Git blobs remain 083aae202dcadc5d7df34b278de3fa080122189d and c50b5a8c31c7a90dc8630ad1c6ce8118513ed1f4; source exactly matches prior inspected versions.
