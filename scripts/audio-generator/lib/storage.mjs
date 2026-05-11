import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'curriculum-audio';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, key);
}

let _sb = null;
const sb = () => { if (!_sb) _sb = getSupabase(); return _sb; };

export function readingPath(levelNum, passageId) {
  return `reading/L${levelNum}/${passageId}/full.mp3`;
}

export function listeningPath(levelNum, transcriptId, segmentIndex, speakerLabel) {
  const label = (speakerLabel || 'narrator').toLowerCase().replace(/\s+/g, '-');
  return `listening/L${levelNum}/${transcriptId}/s${segmentIndex}_${label}.mp3`;
}

export function vocabPath(levelNum, wordId) {
  return `vocab/L${levelNum}/${wordId}.mp3`;
}

export async function audioExists(path) {
  const { data, error } = await sb().storage.from(BUCKET).list(
    path.substring(0, path.lastIndexOf('/')),
    { search: path.substring(path.lastIndexOf('/') + 1) }
  );
  if (error) return false;
  return (data || []).some(f => f.name === path.substring(path.lastIndexOf('/') + 1));
}

export async function uploadAudio(path, buffer) {
  const { data, error } = await sb().storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  const { data: urlData } = sb().storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

export function getPublicUrl(path) {
  const { data } = sb().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
