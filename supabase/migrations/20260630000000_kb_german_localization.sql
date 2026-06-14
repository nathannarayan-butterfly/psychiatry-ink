-- ─────────────────────────────────────────────────────────────────────────────
-- KB German localization (bilingual columns)
--
-- The product is German-first but the normalized knowledge base (kb_substances
-- + child tables) was AI-seeded entirely in English (audit v2 findings L-001 /
-- L-002 / V2-C1). This migration adds parallel German (`*_de`) columns so the
-- English source content is preserved (fully recoverable) while a translated
-- German rendering can be served to the German UI.
--
-- Strategy: keep the existing English columns as the `*_en` source of truth and
-- add `*_de` columns. `scripts/translate-kb-to-german.ts` fills the `*_de`
-- columns via DeepSeek; the projection layer prefers German and falls back to
-- English. Drug names, ICD codes, units, lab parameter standard names and dose
-- numbers are NOT machine-translated.
-- ─────────────────────────────────────────────────────────────────────────────

-- kb_substances: clinical prose + structured German arrays --------------------
ALTER TABLE public.kb_substances
  ADD COLUMN IF NOT EXISTS substance_class_de text,
  ADD COLUMN IF NOT EXISTS mechanism_summary_de text,
  ADD COLUMN IF NOT EXISTS pharmacodynamic_profile_de text,
  ADD COLUMN IF NOT EXISTS clinical_pearls_de text,
  ADD COLUMN IF NOT EXISTS uncertainty_notes_de text,
  ADD COLUMN IF NOT EXISTS pregnancy_lactation_caution_de text,
  ADD COLUMN IF NOT EXISTS geriatric_caution_de text,
  ADD COLUMN IF NOT EXISTS hepatic_renal_caution_de text,
  ADD COLUMN IF NOT EXISTS primary_psychiatric_uses_de jsonb,
  ADD COLUMN IF NOT EXISTS contraindications_de jsonb,
  ADD COLUMN IF NOT EXISTS severe_risks_de jsonb,
  -- Per-row translation bookkeeping: 'pending' | 'translated' | 'skipped'
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;

-- kb_side_effects -------------------------------------------------------------
ALTER TABLE public.kb_side_effects
  ADD COLUMN IF NOT EXISTS effect_de text,
  ADD COLUMN IF NOT EXISTS system_de text,
  ADD COLUMN IF NOT EXISTS note_de text;

-- kb_monitoring_recommendations -----------------------------------------------
ALTER TABLE public.kb_monitoring_recommendations
  ADD COLUMN IF NOT EXISTS parameter_de text,
  ADD COLUMN IF NOT EXISTS interval_text_de text,
  ADD COLUMN IF NOT EXISTS rationale_de text;

-- kb_interaction_notes --------------------------------------------------------
ALTER TABLE public.kb_interaction_notes
  ADD COLUMN IF NOT EXISTS interacts_with_de text,
  ADD COLUMN IF NOT EXISTS mechanism_de text,
  ADD COLUMN IF NOT EXISTS clinical_management_de text;

-- kb_dosage_guidance ----------------------------------------------------------
ALTER TABLE public.kb_dosage_guidance
  ADD COLUMN IF NOT EXISTS population_de text,
  ADD COLUMN IF NOT EXISTS titration_notes_de text,
  ADD COLUMN IF NOT EXISTS administration_notes_de text;

COMMENT ON COLUMN public.kb_substances.translation_status IS
  'German localization state: pending | translated | skipped. English columns remain the recoverable source.';
