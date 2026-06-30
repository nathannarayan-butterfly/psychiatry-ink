-- ===========================================================================
-- Design D quick win — wrap user_notes.content and kb_pharma_comments.text
-- with client-side AES-GCM ciphertext so the server no longer stores either
-- field in plaintext.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive only.
--
-- We add `ciphertext`, `iv`, `wrapped_key`, `payload_version` columns. Once
-- the client switch lands, NEW writes go via the new fields and the server
-- forces `content`/`text` to '' (preserved as legacy plaintext columns so
-- old rows remain decryptable by older clients during rollout, then a later
-- migration drops them once every active install has migrated). The Express
-- routes reject combined writes (must be either legacy plaintext or
-- ciphertext, never both) so a client cannot leak the plaintext copy by
-- accident.
-- ===========================================================================

alter table public.user_notes
  add column if not exists ciphertext        text,
  add column if not exists iv                text,
  add column if not exists wrapped_key       text,
  add column if not exists payload_version   integer not null default 1;

comment on column public.user_notes.ciphertext is
  'AES-GCM ciphertext of {title, content}. Server-side encryption-at-rest beyond TDE.';
comment on column public.user_notes.iv is
  'Base64 12-byte IV for the AES-GCM payload.';
comment on column public.user_notes.wrapped_key is
  'RSA-OAEP wrapped AES key (per-device key in IndexedDB).';

alter table public.kb_pharma_comments
  add column if not exists ciphertext        text,
  add column if not exists iv                text,
  add column if not exists wrapped_key       text,
  add column if not exists payload_version   integer not null default 1;

comment on column public.kb_pharma_comments.ciphertext is
  'AES-GCM ciphertext of the comment text. Server-side encryption-at-rest beyond TDE.';
comment on column public.kb_pharma_comments.iv is
  'Base64 12-byte IV for the AES-GCM payload.';
comment on column public.kb_pharma_comments.wrapped_key is
  'RSA-OAEP wrapped AES key (per-device key in IndexedDB).';
