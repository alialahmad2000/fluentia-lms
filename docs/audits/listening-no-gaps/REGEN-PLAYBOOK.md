# Regen Playbook — 21 Listening Files With Internal Silence

## Prerequisites

1. **Fresh ElevenLabs API key.** Current one in `.env` returns 401.
   Verify it works:
   ```bash
   NODE_OPTIONS="--dns-result-order=ipv4first" node -e "
     require('dotenv').config();
     const https = require('https');
     const key = process.env.ELEVENLABS_API_KEY.replace(/[\s\r\n]+/g,'');
     const req = https.request({
       method:'GET', host:'api.elevenlabs.io', path:'/v1/user/subscription',
       headers:{'xi-api-key':key},
     }, r => {
       let b=''; r.on('data',c=>b+=c); r.on('end',()=>console.log(r.statusCode, b.slice(0,200)));
     });
     req.on('error',e=>console.error(e.message));
     req.end();
   "
   ```
   Must return `200` and a JSON object with `character_count`/`character_limit`. Budget check:
   - 21 broken rows total **86,747 chars** to regenerate
   - Hard cap from prompt: 300,000 chars
   - Required ElevenLabs remaining: at least `86,747 × 1.3 ≈ 112,800` chars (safety margin)

2. **Tooling.** Already verified:
   - `ffmpeg 8.1.1` ✓
   - `ffprobe 8.1.1` ✓
   - `node v26.0.0` ✓

3. **Confirm targets.** The 21 rows are in `docs/audits/listening-no-gaps/regen-input.json`. The full silence-region detail per row is in `silence-audit.json`.

## The hardened pipeline

The existing generator `scripts/audio-v2/03-generate-listening.mjs` should be audited and patched with these guardrails BEFORE running:

1. **Per-segment retry on ElevenLabs failures.** 3 retries, exponential backoff (2s/4s/8s). After 3 failures, abort the row — do NOT produce a silent placeholder segment.
2. **Per-segment validation BEFORE concat.** For every segment buffer:
   - Write to disk, `ffprobe` for duration > 0.5s
   - Decoded duration ≥ 0.85× container duration (catches truncation)
   - `ffmpeg silencedetect -50dB :d=0.6` finds NO internal silence > 0.6s
   - If any check fails, retry the segment
3. **Concat with re-encode (not `-c copy`).** Confirm `concat.cjs` uses `-c:a libmp3lame -b:a 192k -ar 44100`.
4. **Inter-segment gap = exactly 300ms** of `anullsrc` silence.
5. **Post-concat full-file silence check.** Run the Phase A silencedetect on the final mp3. If any internal silence > 800ms exists (excluding trailing 1.5s), FAIL the row and retry the whole generation.
6. **Write `source_text_hash`** after a clean regen (drift-protection).
7. **Re-curl from public URL after upload** and re-silencedetect to confirm what students will fetch is still clean (catches CDN cache issues).

## Running the regen

Once the key works and the pipeline is hardened:

```bash
# Sanity-check the budget first
node scripts/audio-v2/check-budget.mjs   # or equivalent — must show > 113K remaining

# Regenerate, iterating through the 21 ids
node scripts/audio-v2/03-generate-listening.mjs \
  --ids="$(node -e "console.log(JSON.parse(require('fs').readFileSync('docs/audits/listening-no-gaps/regen-input.json','utf8')).rows.map(r=>r.id).join(','))")" \
  --strict-validation
```

## Post-regen verification

Re-run the silence audit on ONLY the regenerated rows:

```bash
# Easy way: delete the cached downloads and re-run the audit; rows already
# CLEAN will short-circuit on the existing cached files.
rm -f /tmp/listening-silence-audit/*.mp3
node scripts/audits/listening-no-gaps/01-silence-audit.cjs
```

**Pass criteria:**
- Final `silence-audit.json` shows `has_gaps: 0`
- Every previously-broken row now `verdict: CLEAN`

If any row still has gaps after 3 regen attempts → that's a **content-level issue** (transcript has long pauses by design, ElevenLabs consistently struggles with that segment) and needs human review of the transcript before another attempt.

## Optional Phase D — Playwright verification

If you want browser-level confirmation (Phase D in the original prompt), the script `scripts/audits/listening-no-gaps/02-playback-verify.cjs` would:

1. `npm install --save-dev playwright` (~600MB browser binaries)
2. Headless chromium fetches each regenerated `audio_url`
3. Decodes via Web Audio API
4. Scans `channelData[0]` for silent runs > 800ms
5. Asserts no internal gaps detected

I did NOT pre-install Playwright since Phase B is blocked. When you run the regen later, decide whether the server-side silencedetect re-audit is sufficient (likely yes) or whether you also want the browser-level test.

## Why this is safer than the prior pipeline

The prior pipeline produced these 21 broken files. The hardening above adds three layers of validation: per-segment, post-concat, post-upload. A row that fails any check is retried up to 3 times before being skipped. A row that's skipped is loudly logged so you know which transcripts need human review.

## Estimated time + cost

- Char budget: 86,747 chars → ElevenLabs minimum cost ~$1-2 depending on tier
- Wall-clock: 21 rows × ~30s each (with validation retries) ≈ 10-15 minutes
- Disk: temp mp3s + final uploads to `curriculum-audio` bucket (replaces existing files)

## If something goes wrong mid-run

The regen is per-row idempotent. If row 7 of 21 fails, you can:
- Inspect the failure log
- Fix the underlying issue (transcript, key, network)
- Re-run with `--ids=<just-the-failed-ids>` to resume from where it stopped

No row is destroyed until the new one passes ALL checks AND uploads successfully (`upsert: true`). The DB update happens last, after the file is verified live on storage.
