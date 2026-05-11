import { query } from './db.mjs';

export const HARD_LIMIT = 1_500_000;
export const SAFETY_MARGIN = 0.9;
// ElevenLabs growing_business: $0.40 per 1000 chars (~$0.0004/char), convert to SAR (1 USD ≈ 3.75 SAR)
const COST_PER_CHAR_SAR = 0.0004 * 3.75;

export function assertBudget(estimatedChars, remainingChars) {
  if (estimatedChars > HARD_LIMIT) {
    throw new Error(`BUDGET GATE: estimated ${estimatedChars.toLocaleString()} chars exceeds hard limit ${HARD_LIMIT.toLocaleString()}`);
  }
  if (estimatedChars > remainingChars * SAFETY_MARGIN) {
    throw new Error(`BUDGET GATE: estimated ${estimatedChars.toLocaleString()} chars exceeds 90% of remaining quota (${Math.round(remainingChars * 0.9).toLocaleString()})`);
  }
}

export async function logUsage({ charCount, voiceId, durationMs }) {
  const estimatedSar = charCount * COST_PER_CHAR_SAR;
  const audioSeconds = durationMs ? Math.round(durationMs / 1000) : null;
  try {
    await query(
      `INSERT INTO ai_usage (type, model, audio_seconds, estimated_cost_sar)
       VALUES ('elevenlabs_audio', 'eleven_multilingual_v2', $1, $2)`,
      [audioSeconds, estimatedSar]
    );
  } catch (e) {
    // Non-fatal — log to console but don't abort generation
    console.warn('[budget] ai_usage insert failed:', e.message);
  }
}

export async function getTotalCost() {
  const rows = await query(
    `SELECT COALESCE(SUM(estimated_cost_sar), 0) AS total_sar,
            COALESCE(SUM(audio_seconds), 0) AS total_seconds,
            count(*) AS count
     FROM ai_usage WHERE type = 'elevenlabs_audio'`
  );
  return rows[0];
}
