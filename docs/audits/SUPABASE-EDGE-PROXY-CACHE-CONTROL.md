# Dead end: Cache-Control cannot be set on Supabase Storage public URLs

**Date:** 2026-05-23
**Status:** Architecturally blocked. Do not re-investigate.

## What we tried

Set `Cache-Control: public, max-age=31536000, immutable` on listening audio files
in the `curriculum-audio` bucket via:

```js
await supabase.storage.from('curriculum-audio').update(path, fileBytes, {
  cacheControl: '31536000',
  contentType: 'audio/mpeg',
  upsert: true,
})
```

## What happens

- `supabase.storage.from(bucket).update(...)` accepts `cacheControl` and the **object metadata is updated successfully** — confirmed via `GET /storage/v1/object/info/<bucket>/<path>` which returns `"cache_control": "max-age=31536000"`.
- BUT the **HTTP response on the public URL still returns `Cache-Control: no-cache`** — both via `/object/public/...` and `/object/sign/...` (signed URL).
- Verified with curl: `cf-cache-status: REVALIDATED` and `cf-cache-status: MISS` both return `cache-control: no-cache`.

## Why

Supabase's edge proxy rewrites `Cache-Control: no-cache` on every storage response regardless of the object's stored metadata. The `cacheControl` setting on object metadata only affects Supabase's INTERNAL revalidation logic, not the response header sent to clients.

This is a Supabase-platform-level decision. It is NOT something we can override from the storage API.

## What does NOT work (do not retry)

- Object-level `cacheControl` upload option → metadata updates, response header does NOT.
- Signed URLs → same `Cache-Control: no-cache` on response.
- Re-uploading bytes vs. moving / copying object → same result either way.

## What COULD work, but no longer needed

If we ever decide we need cacheable storage responses (we don't right now):

1. **Vercel edge proxy** — `/api/audio/[path]` that fetches from Supabase and re-serves with our headers.
2. **Cloudflare Worker** in front of `nmjexpuycmqcxuxljier.supabase.co` (requires DNS / infra change).
3. **Switch hosting** to a CDN that exposes cache headers (e.g., R2, S3+CloudFront direct).

## Why we stopped pursuing this

Subsequent ground truth (2026-05-23, from Ali):
> "Opened a listening audio URL directly in a fresh browser tab — no Fluentia code, no player, no auth, raw file. Pressed play. Audio plays a few seconds, stops. Clicking anywhere on the timeline → plays a few seconds → stops again. Pattern repeats indefinitely."

This is **FILE-level pathology**, not header pathology. `Cache-Control: no-cache` does not cause "play a few seconds, then stop" — millions of sites serve audio with no-cache and play fine. The "play, stop, seek, play, stop" pattern is the canonical fingerprint of malformed MP3 frames, missing Xing/LAME seek headers, or streamed-but-not-finalized output from a TTS pipeline (e.g., ElevenLabs API).

So the bug is in the file itself, not in how it is served.

## Related artifacts (kept for evidence trail)

- `scripts/listening-fix-2/10-cache-control-discovery.cjs` — inventory of all 72 listening MP3s + their Cache-Control header (all `no-cache`).
- `scripts/listening-fix-2/11-cache-control-dryrun.cjs` — the dry-run that proved metadata-update succeeds but response-header doesn't change.
- `scripts/listening-fix-2/12-storage-internals.cjs` — verified via `/object/info` endpoint that `cache_control: "max-age=31536000"` is stored server-side.
- `scripts/listening-fix-2/13-bucket-check.cjs` — verified signed URLs are subject to the same edge override.
- `docs/audits/listening-cache-control-inventory.json` — full inventory of the 72 files.
