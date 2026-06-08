-- Listening hero images (additive). Each listening activity gets a cinematic, topic-specific
-- image generated via FAL FLUX pro v1.1 and stored in the public curriculum-images bucket
-- (path listening/<id>.jpg). image_prompt keeps the art-direction scene for provenance.
alter table public.curriculum_listening add column if not exists image_url text;
alter table public.curriculum_listening add column if not exists image_prompt text;
alter table public.curriculum_listening add column if not exists image_generated_at timestamptz;
