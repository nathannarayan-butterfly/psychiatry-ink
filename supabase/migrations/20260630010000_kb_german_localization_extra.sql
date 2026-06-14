-- ─────────────────────────────────────────────────────────────────────────────
-- KB German localization — additional bilingual columns
--
-- Follow-up to 20260630000000_kb_german_localization.sql. The first pass covered
-- the audit-named tables; this adds German columns for two further free-text
-- fields that still rendered English in the German UI:
--   * kb_receptor_affinities.explanation  (shown in the Rezeptorprofil section)
--   * kb_dosage_guidance start/target/max dose qualifiers (e.g. "in divided
--     doses", "due to cardiac risk") — numbers/units are preserved.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.kb_receptor_affinities
  ADD COLUMN IF NOT EXISTS explanation_de text;

ALTER TABLE public.kb_dosage_guidance
  ADD COLUMN IF NOT EXISTS start_dose_de text,
  ADD COLUMN IF NOT EXISTS target_dose_de text,
  ADD COLUMN IF NOT EXISTS max_dose_de text;
