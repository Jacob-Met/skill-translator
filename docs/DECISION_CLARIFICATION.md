# Clarify a retained decision question

Open **Clarify a retained question** from Decision Practice. Load the original
PNG demonstration and the matching practice with an evidence-linked remaining
question. The page shows that question, the learner's original prediction and
reconsidered judgment, and the original before/after frames and account.

Choose one of the authored fields the learner referenced. A missing cue stays
unknown until an author explicitly supplies an account. Frame-only questions
remain inspectable but cannot be used to fabricate a new sensory-field reference.
Supply the complete replacement field text, declared author/source, and how the
clarification was supplied. Explicit adoption retains the amendment. The author
identity and claim are declarations, not authentication or physical verification.

Save the amendment lineage, clarified demonstration and empty familiar retry.
The lineage retains the original source-bound exercise and raw amendment inputs;
it recomputes the changed source and new retry on reopening. The demonstration
reuses every exact original PNG and changes only the selected account field.
The retry contains exactly the selected step with no actions and `seen-before`
familiarity, because the clarification has already been inspected. In Decision
Practice, load the clarified demonstration then the retry. The original exercise
correctly refuses to bind to the changed account and remains independently usable
with its original demonstration. Keep both original files separately.

This is a clarification and retry workflow. It does not infer force or hidden
sensory information, automatically correct an expert, certify the declared author,
or establish that a learner improved. Authored source notes may remain mistaken.
The amendment file is editable local data, not a signed chronology. Original
source receiving remains bounded to 48 MiB/32 megapixels; practice to 1 MiB;
amendment lineage to 2 MiB. New or malformed imports preserve accepted work.

`node test/decision-clarification.test.mjs` checks question/source custody, explicit
adoption, unchanged frame identities, old-practice refusal and separate familiar
retry. `PUPPETEER_PATH=... CHROME_BINARY=... QA_OUTPUT=... node tools/browser-decision-clarification.mjs`
receives actual original authored PNGs, saves three completed Chrome downloads,
opens the clarified source and retry in Decision Practice, and checks mobile,
source mismatch and delayed-read controls. Runtime results must be recorded
separately from these test definitions.
