# Wikimedia Commons structure image attribution (KB browse)

**Not legal advice.** Practical compliance notes for Psychiatry.ink psychopharmacology browse cards.

## What we do

- Show optional 2D structure thumbnails on drug cards and drug detail pages, sourced from [Wikimedia Commons](https://commons.wikimedia.org/) thumb URLs (see `src/data/kb/wikimediaStructureImageData.ts`, resolved via `scripts/fetch-wikimedia-structure-images.ts`).
- Hotlink thumbnails with `loading="lazy"` and `onError` placeholder fallback.
- Provide page-level attribution on the KB browse view:
  - Lead line: “Strukturformeln / Structure diagrams: Wikimedia Commons” (linked).
  - Per-file links to Commons file pages with license hint where known (e.g. CC BY-SA 3.0, Public domain).
  - Footer disclaimer (DE + EN via `uiTranslations`): images © respective Commons contributors, used under Creative Commons licenses; see file pages for full attribution.
- Drug detail view (`KnowledgeBasePharma` → `DrugDetailView`) shows a larger structure image in the header and a per-drug **Bildnachweis** block (author, license, Commons file link) at the bottom of the monograph.

## Is the prior preview approach protective enough?

The dev preview listed three example files in a small footnote. That is **directionally correct** but **thin** for CC BY / CC BY-SA works, which require attribution (author, license, link to source). A generic “Wikimedia Commons” note without file-level links is weaker than Commons’ own guidance.

## What we added

| Measure | Purpose |
|--------|---------|
| `StructureImageAttribution` metadata per mapped drug | Source URL, filename, license, optional author |
| Browse footer with file-page links + license labels | Satisfies typical CC attribution elements in aggregate |
| i18n disclaimer strings | Consistent DE/EN messaging for clinicians |
| Decorative `alt=""` on thumbnails + visible text attribution | Separates decorative UI from required credit text |

## Residual risks / deferred work

- **Coverage**: 183/184 psychopharmacology seed entries mapped; `Lecanemab` (monoclonal antibody) has no suitable 2D structure on Commons — placeholder icon remains. Unmapped custom KB drugs also fall back to the flask icon.
- **Hotlink fragility**: Commons URL or file moves can break thumbs (mitigated by placeholder, not by local cache).
- **Local cache**: Not implemented; would improve availability but needs separate license audit per cached file.
- **Bulk contributor API**: Card “Mitwirkende” uses accepted contributors when available, else `createdByDisplayName` / seed author.

## Operational note

Embedding Commons thumbs via `upload.wikimedia.org` is widely used and aligns with Commons’ sharing intent when attribution is provided. For production hardening, consider periodic link checks or self-hosting derivatives with recorded provenance.
